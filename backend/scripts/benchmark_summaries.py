"""Benchmark de desempenho da geração de resumos (issue 18).

Mede o tempo de geração de resumo individual e integrado, usando o mesmo
caminho de código de produção (extração de PDF real + chamada real à LLM +
persistência em banco), para PDFs de tamanhos diferentes (pequeno e médio).

Requer uma GEMINI_API_KEY válida configurada em backend/.env — este script
faz chamadas reais à API e consome cota/tempo de verdade. O tier gratuito do
Gemini para gemini-2.5-flash é limitado tanto por minuto quanto por DIA
(historicamente já observamos limites de 5/min e 20/dia) — por isso há uma
pausa configurável entre chamadas e o script continua (registrando a falha)
em vez de abortar caso a cota se esgote no meio da execução.

Uso (a partir da pasta backend/, com o venv ativado):
    python scripts/benchmark_summaries.py [--runs N] [--delay SEGUNDOS]
"""

from __future__ import annotations

import argparse
import json
import statistics
import sys
import tempfile
import textwrap
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import Base  # noqa: E402
from app.models import PDFFile, User  # noqa: E402
from app.services.llm_client import LLMConnectionError, LLMError  # noqa: E402
from app.services.pdf_extraction import extract_text_from_pdf  # noqa: E402
from app.services.summarization import (  # noqa: E402
    generate_individual_summary,
    generate_integrated_summary,
)
from scripts.sample_texts import MEDIUM_TEXT, SMALL_TEXT  # noqa: E402

_TRANSIENT_ERROR_HINTS = ("RESOURCE_EXHAUSTED", "UNAVAILABLE")


def _call_with_retry_on_transient_error(action, max_attempts: int = 3, base_wait: float = 20.0):
    """Repete a chamada em caso de erro transitório da API (limite de taxa, alta demanda)."""
    for attempt in range(1, max_attempts + 1):
        try:
            return action()
        except LLMError as exc:
            is_transient = isinstance(exc, LLMConnectionError) or any(
                hint in str(exc) for hint in _TRANSIENT_ERROR_HINTS
            )
            if is_transient and attempt < max_attempts:
                wait = base_wait * attempt
                print(
                    f"  erro transitório da API ({exc}); aguardando {wait:.0f}s "
                    f"(tentativa {attempt}/{max_attempts})...",
                    flush=True,
                )
                time.sleep(wait)
                continue
            raise


def _wrap_text(text: str, max_chars: int = 90) -> list[str]:
    lines: list[str] = []
    for paragraph in text.split("\n"):
        if not paragraph.strip():
            lines.append("")
            continue
        lines.extend(textwrap.wrap(paragraph, width=max_chars) or [""])
    return lines


def create_text_pdf(path: Path, text: str) -> Path:
    """Gera um PDF com o texto informado, quebrando em quantas páginas forem necessárias."""
    c = canvas.Canvas(str(path), pagesize=letter)
    width, height = letter
    margin = 72
    line_height = 14
    y = height - margin

    for line in _wrap_text(text):
        if y < margin:
            c.showPage()
            y = height - margin
        c.drawString(margin, y, line)
        y -= line_height

    c.showPage()
    c.save()
    return path


@dataclass
class Measurement:
    scenario: str
    run: int
    generation_time_ms: float


def _page_count(path: Path) -> int:
    from pypdf import PdfReader

    return len(PdfReader(path).pages)


def run_benchmark(
    runs: int, work_dir: Path, delay_seconds: float
) -> tuple[list[Measurement], dict[str, dict], list[dict]]:
    engine = create_engine(f"sqlite:///{work_dir / 'benchmark.db'}")
    session_local = sessionmaker(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = session_local()

    try:
        user = User(username=f"benchmark-{datetime.now(timezone.utc).timestamp()}")
        db.add(user)
        db.commit()
        db.refresh(user)

        small_pdf_path = create_text_pdf(work_dir / "small.pdf", SMALL_TEXT)
        medium_pdf_path = create_text_pdf(work_dir / "medium.pdf", MEDIUM_TEXT)

        pdf_metadata = {
            "pequeno": {
                "palavras": len(SMALL_TEXT.split()),
                "paginas": _page_count(small_pdf_path),
                "tamanho_bytes": small_pdf_path.stat().st_size,
            },
            "medio": {
                "palavras": len(MEDIUM_TEXT.split()),
                "paginas": _page_count(medium_pdf_path),
                "tamanho_bytes": medium_pdf_path.stat().st_size,
            },
        }

        small_file = PDFFile(filename="small.pdf", filepath=str(small_pdf_path), owner_id=user.id)
        medium_file = PDFFile(
            filename="medium.pdf", filepath=str(medium_pdf_path), owner_id=user.id
        )
        db.add_all([small_file, medium_file])
        db.commit()
        db.refresh(small_file)
        db.refresh(medium_file)

        # Extrai o texto uma vez fora da medição, só para confirmar que os PDFs são válidos.
        extract_text_from_pdf(small_file.filepath)
        extract_text_from_pdf(medium_file.filepath)

        measurements: list[Measurement] = []
        scenarios = [
            ("individual_pequeno", lambda: generate_individual_summary(db, small_file)),
            ("individual_medio", lambda: generate_individual_summary(db, medium_file)),
            (
                "integrado_pequeno_medio",
                lambda: generate_integrated_summary(db, [small_file, medium_file]),
            ),
        ]

        failures: list[dict] = []
        first_call = True
        for scenario_name, action in scenarios:
            for i in range(1, runs + 1):
                if not first_call:
                    print(
                        f"  aguardando {delay_seconds:.0f}s (limite de requisições da API)...",
                        flush=True,
                    )
                    time.sleep(delay_seconds)
                first_call = False

                print(f"[{scenario_name}] run {i}/{runs}...", flush=True)
                try:
                    summary = _call_with_retry_on_transient_error(action)
                except LLMError as exc:
                    # Não aborta o benchmark inteiro por causa de uma execução com falha
                    # (ex.: cota diária da API esgotada) — registra e segue para a próxima.
                    print(f"  FALHA: {exc}", flush=True)
                    failures.append({"scenario": scenario_name, "run": i, "error": str(exc)})
                    continue
                print(f"  -> {summary.generation_time_ms:.0f} ms", flush=True)
                measurements.append(Measurement(scenario_name, i, summary.generation_time_ms))

        return measurements, pdf_metadata, failures
    finally:
        db.close()
        engine.dispose()


def summarize(measurements: list[Measurement]) -> dict:
    by_scenario: dict[str, list[float]] = {}
    for m in measurements:
        by_scenario.setdefault(m.scenario, []).append(m.generation_time_ms)

    summary = {}
    for scenario, times in by_scenario.items():
        summary[scenario] = {
            "runs": len(times),
            "min_ms": min(times),
            "max_ms": max(times),
            "avg_ms": statistics.mean(times),
            "under_30s": all(t < 30_000 for t in times),
        }
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--runs", type=int, default=3, help="Número de execuções por cenário (padrão: 3)"
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("docs/performance"),
        help="Diretório onde salvar o JSON de resultados",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=15.0,
        help="Segundos de pausa entre chamadas à LLM, para respeitar limites de taxa (padrão: 15)",
    )
    args = parser.parse_args()

    with tempfile.TemporaryDirectory() as tmp:
        measurements, pdf_metadata, failures = run_benchmark(args.runs, Path(tmp), args.delay)

    summary = summarize(measurements)

    args.output.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    result_path = args.output / f"results_{timestamp}.json"
    result_path.write_text(
        json.dumps(
            {
                "timestamp": timestamp,
                "runs_per_scenario": args.runs,
                "pdf_metadata": pdf_metadata,
                "measurements": [asdict(m) for m in measurements],
                "failures": failures,
                "summary": summary,
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    print("\n=== Metadados dos PDFs ===")
    for tamanho, meta in pdf_metadata.items():
        print(f"{tamanho}: {meta}")

    print("\n=== Resumo ===")
    for scenario, stats in summary.items():
        status = "OK (<30s)" if stats["under_30s"] else "ACIMA DE 30s"
        print(
            f"{scenario}: min={stats['min_ms']:.0f}ms avg={stats['avg_ms']:.0f}ms "
            f"max={stats['max_ms']:.0f}ms [{status}]"
        )

    if failures:
        print(f"\n{len(failures)} execução(ões) falharam (ver 'failures' no JSON de resultados).")

    print(f"\nResultados salvos em: {result_path}")


if __name__ == "__main__":
    main()
