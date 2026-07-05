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

## Estrutura

```
app/
  main.py              # entrypoint da API FastAPI
  config.py            # configurações via variáveis de ambiente (.env)
  services/
    pdf_extraction.py  # extração de texto de arquivos PDF
    llm_client.py      # cliente de integração com a LLM (Google Gemini)
tests/
  conftest.py          # fixtures que geram PDFs de teste em runtime
  test_pdf_extraction.py
  test_llm_client.py
```
