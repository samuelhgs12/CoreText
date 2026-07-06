import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Icon from "../components/Icon";
import { generateSummary } from "../services/summaryService";

function formatDate(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function formatDuration(milliseconds) {
  if (!milliseconds && milliseconds !== 0) {
    return "Não informado";
  }

  if (milliseconds < 1000) {
    return `${Math.round(milliseconds)} ms`;
  }

  return `${(milliseconds / 1000).toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })} s`;
}

function SummaryDisplay({ summary }) {
  const isIntegrated = summary.type === "integrated";

  return (
    <article className="card-surface summary-result-card">
      <div className="summary-result-header">
        <div>
          <span className={`status-badge ${isIntegrated ? "progress" : "success"}`}>
            {isIntegrated ? "Resumo integrado" : "Resumo individual"}
          </span>
          <h2>{isIntegrated ? "Resumo integrado dos arquivos" : summary.fileName}</h2>
        </div>

        <Link to="/arquivos" className="ghost-button">
          <Icon name="chevronRight" size={18} />
          Voltar para arquivos
        </Link>
      </div>

      <div className="summary-meta-grid">
        <div>
          <span>Gerado em</span>
          <strong>{formatDate(summary.generatedAt)}</strong>
        </div>
        <div>
          <span>Tempo de geração</span>
          <strong>{formatDuration(summary.generationTimeMs)}</strong>
        </div>
        <div>
          <span>Origem</span>
          <strong>{summary.source === "api" ? "Backend" : "Mock demonstrativo"}</strong>
        </div>
      </div>

      <section className="summary-files-section">
        <h3>{isIntegrated ? "Arquivos utilizados" : "Arquivo resumido"}</h3>
        <div className="summary-file-list">
          {summary.files.map((fileName) => (
            <span key={fileName}>
              <Icon name="fileText" size={18} />
              {fileName}
            </span>
          ))}
        </div>
      </section>

      <section className="summary-content-section">
        <h3>Conteúdo do resumo</h3>
        <div className="summary-content">
          {summary.content.split("\n").map((line, index) => (
            <p key={`${line}-${index}`}>{line || "\u00A0"}</p>
          ))}
        </div>
      </section>
    </article>
  );
}

function Summary() {
  const location = useLocation();
  const state = location.state || {};
  const fileIds = useMemo(() => state.selectedFileIds || [], [state.selectedFileIds]);
  const fileNames = useMemo(() => state.selectedFiles || [], [state.selectedFiles]);
  const mode = state.summaryMode || (fileIds.length > 1 ? "integrated" : "individual");
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(fileIds.length));

  useEffect(() => {
    let isMounted = true;

    async function loadSummary() {
      if (!fileIds.length) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const generatedSummary = await generateSummary({
          mode,
          fileIds,
          fileNames,
        });

        if (!isMounted) {
          return;
        }

        setSummary(generatedSummary);
      } catch (summaryError) {
        if (!isMounted) {
          return;
        }

        setError(summaryError.message || "Não foi possível gerar o resumo.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSummary();

    return () => {
      isMounted = false;
    };
  }, [fileIds, fileNames, mode]);

  return (
    <section className="page-stack summary-page">
      <div className="page-heading">
        <div>
          <h1>Resumos</h1>
          <p className="muted-text">
            Acompanhe o resumo gerado a partir dos documentos selecionados.
          </p>
        </div>
      </div>

      {isLoading && (
        <article className="card-surface summary-state-card">
          <span className="loading-spinner" aria-hidden="true" />
          <h2>Gerando resumo...</h2>
          <p className="muted-text">
            Estamos processando os arquivos selecionados. Isso pode levar alguns segundos.
          </p>
        </article>
      )}

      {!isLoading && error && (
        <article className="card-surface summary-state-card error">
          <Icon name="shield" size={32} />
          <h2>Não foi possível gerar o resumo</h2>
          <p className="muted-text">{error}</p>
          <Link to="/arquivos" className="primary-button">
            Voltar para arquivos
          </Link>
        </article>
      )}

      {!isLoading && !error && !summary && (
        <article className="card-surface summary-state-card">
          <Icon name="fileText" size={34} />
          <h2>Nenhum arquivo selecionado</h2>
          <p className="muted-text">
            Selecione um ou mais PDFs na tela de arquivos para gerar um resumo.
          </p>
          <Link to="/arquivos" className="primary-button">
            Ir para arquivos
          </Link>
        </article>
      )}

      {!isLoading && !error && summary && <SummaryDisplay summary={summary} />}
    </section>
  );
}

export default Summary;
