# CoreText Backend

API em Python (FastAPI) responsável pela extração de texto de PDFs e
integração com LLM para geração de resumos.

## Setup

```bash
python -m venv .venv
./.venv/Scripts/activate   # Windows
source .venv/bin/activate  # Linux/Mac

pip install -r requirements-dev.txt

cp .env.example .env
# edite .env e preencha GEMINI_API_KEY com sua chave (https://aistudio.google.com/apikey)
```

## Rodar a API

```bash
uvicorn app.main:app --reload
```

## Rodar os testes

```bash
pytest
```

## Autenticação e upload (provisórios)

A autenticação real e o upload/armazenamento de arquivos ainda não foram
implementados por essa parte do time. Para permitir testar a geração de
resumos (issue 12), este backend inclui versões **provisórias**:

- `POST /users` — cria um usuário (`{"username": "..."}`), retorna um `id`.
- `POST /files` — upload de um PDF (`multipart/form-data`, campo `file`),
  requer o header `X-User-Id: <id do usuário>` para associar o dono.
- `X-User-Id` também é exigido nas rotas protegidas (ex.: gerar resumo) como
  substituto do token/sessão real. Isso deve ser trocado pela integração de
  autenticação de verdade assim que ela for implementada — apenas
  `app/auth.py` deve precisar mudar.

Fluxo de teste manual:

```bash
# 1. criar usuário
curl -X POST http://127.0.0.1:8000/users -H "Content-Type: application/json" -d '{"username":"alice"}'

# 2. upload de PDF (usando o id retornado acima)
curl -X POST http://127.0.0.1:8000/files -H "X-User-Id: 1" -F "file=@caminho/para/arquivo.pdf"

# 3. gerar resumo individual (usando o id do arquivo retornado acima)
curl -X POST http://127.0.0.1:8000/files/1/summary -H "X-User-Id: 1"

# 4. gerar resumo integrado de múltiplos PDFs (usando os ids dos arquivos)
curl -X POST http://127.0.0.1:8000/summaries/integrated \
  -H "X-User-Id: 1" -H "Content-Type: application/json" \
  -d '{"file_ids": [1, 2]}'
```

## Desempenho da geração de resumos

O tempo de geração de cada resumo é registrado no banco (`generation_time_ms`)
e a aplicação loga um aviso se ultrapassar 30 segundos. Resultados medidos,
metodologia e limitações encontradas (ex.: cota diária da API gratuita do
Gemini) estão documentados em [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md).
Para reproduzir a medição:

```bash
python scripts/benchmark_summaries.py --runs 3 --delay 15
```

## Estrutura

```
app/
  main.py                    # entrypoint da API FastAPI
  config.py                  # configurações via variáveis de ambiente (.env)
  db.py                      # engine/sessão SQLAlchemy (SQLite: coretext.db)
  models.py                  # modelos ORM: User, PDFFile, Summary, IntegratedSummary
  schemas.py                 # schemas Pydantic de request/response
  auth.py                    # autenticação provisória (header X-User-Id)
  routers/
    users.py                 # criação de usuário (provisório)
    files.py                 # upload de PDF (provisório)
    summaries.py             # geração de resumo individual (issue 12)
    integrated_summaries.py  # geração de resumo integrado de múltiplos PDFs (issue 13)
    errors.py                # mapeamento de exceções dos serviços de resumo -> HTTPException
  services/
    pdf_extraction.py        # extração de texto de arquivos PDF
    llm_client.py            # cliente de integração com a LLM (Google Gemini)
    prompts.py                # templates de prompt (individual e integrado)
    summarization.py         # orquestra extração + LLM + persistência
scripts/
  benchmark_summaries.py     # benchmark real de desempenho (issue 18)
  sample_texts.py            # textos de exemplo (pequeno/médio) usados no benchmark
docs/
  PERFORMANCE.md             # resultados, metodologia e limitações (issue 18)
  performance/                # resultados brutos (JSON) de execuções do benchmark
tests/
  conftest.py                # fixtures/helpers compartilhados (PDFs, client de teste, LLM falsa)
  test_pdf_extraction.py
  test_llm_client.py
  test_summaries_api.py      # testes de integração do resumo individual
  test_integrated_summaries_api.py  # testes de integração do resumo integrado
  test_summarization_performance.py  # teste do alerta de performance (issue 18)
```
