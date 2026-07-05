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

## Autenticação e upload

O backend já expõe o fluxo real de autenticação por token, além de manter
compatibilidade com o fluxo de API esperado pelo frontend.

- `POST /auth/register` — cria usuário com `full_name`, `email` e `password` e retorna `access_token`.
- `POST /auth/login` — autentica com `email` e `password` e retorna `access_token`.
- `GET /auth/me` — retorna o usuário autenticado a partir do `Authorization: Bearer <token>`.
- `PATCH /auth/me` — atualiza `full_name` e/ou `email` do usuário autenticado.
- `POST /files` e rotas protegidas — exigem `Authorization: Bearer <token>`.

Fluxo de teste manual:

```bash
# 1. criar usuário
curl -X POST http://127.0.0.1:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Alice Example","email":"alice@example.com","password":"12345678"}'

# 2. fazer login
curl -X POST http://127.0.0.1:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"12345678"}'

# 3. upload de PDF com o token retornado acima
curl -X POST http://127.0.0.1:8000/files \
  -H "Authorization: Bearer <token>" \
  -F "file=@caminho/para/arquivo.pdf"

# 4. gerar resumo individual
curl -X POST http://127.0.0.1:8000/files/1/summary \
  -H "Authorization: Bearer <token>"
```

`POST /users` continua disponível apenas como criação legada de usuário usada
pelos testes existentes enquanto a migração completa não é concluída.

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
  auth.py                    # autenticação por token + compatibilidade legada
  routers/
    auth.py                  # registro, login e usuário atual
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
