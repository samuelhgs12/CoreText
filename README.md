# CoreText

CoreText é uma aplicação web para gerenciamento e análise de arquivos PDF com apoio de LLM. O sistema permite cadastro e login de usuários, upload de PDFs, listagem de documentos e geração de resumos individuais ou integrados.

O projeto foi desenvolvido como trabalho final, incluindo frontend, backend, banco de dados, integração com LLM e deploy em AWS EC2.

---

## Funcionalidades

- Cadastro e autenticação de usuários
- Login com token de autenticação
- Dashboard após login
- Upload de arquivos PDF de até 50 MB
- Listagem de PDFs enviados
- Seleção de documentos para análise
- Geração de resumo individual com LLM
- Geração de resumo integrado entre múltiplos PDFs
- Deploy em AWS EC2 com Docker e Nginx

---

## Tecnologias

### Frontend

- React
- Vite
- JavaScript
- Nginx

### Backend

- Python
- FastAPI
- Uvicorn
- SQLAlchemy
- PostgreSQL
- Psycopg
- Google Gemini API

### Infraestrutura

- Docker
- Docker Compose
- AWS EC2
- VPC
- Subnet pública
- Internet Gateway
- Security Group
- Volume Docker persistente

---

## Arquitetura

Em produção, a aplicação é executada com três serviços principais:

```txt
Usuário
  |
  | HTTP porta 80
  v
Frontend Nginx
  |
  | /api
  v
Backend FastAPI
  |
  v
PostgreSQL
```

O frontend é exposto publicamente na porta 80.

A API e o banco de dados não são expostos diretamente para a internet. O frontend acessa o backend por meio do prefixo `/api`.

---

## Estrutura do projeto

```
CoreText/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── db.py
│   │   ├── models.py
│   │   ├── routers/
│   │   └── Dockerfile
│   ├── infra/
│   │   ├── docker-compose.dev.yaml
│   │   └── docker-compose.prod.yml
│   ├── requirements.txt
│   ├── .env.example
│   └── .env.prod
│
├── frontend/
│   ├── src/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## Variáveis de ambiente

Exemplo de `.env.prod`:

```env
GEMINI_API_KEY=sua_chave_gemini
GEMINI_MODEL=gemini-2.5-flash

AUTH_SECRET_KEY=seu_segredo_forte
AUTH_TOKEN_TTL_MINUTES=10080

DEBUG=False
LOG_LEVEL=info

POSTGRES_DB=coretext
POSTGRES_USER=coretext
POSTGRES_PASSWORD=sua_senha

POSTGRES_HOST=database
POSTGRES_PORT=5432
DATABASE_URL=postgresql+psycopg://coretext:sua_senha@database:5432/coretext
```

> ⚠️ Não versionar chaves reais, senhas ou arquivos `.env.prod` com credenciais de produção.

---

## Executando em produção com Docker

**Clone o projeto:**

```bash
git clone -b main https://github.com/samuelhgs12/CoreText.git core-text
cd core-text
```

**Configure o ambiente:**

```bash
nano backend/.env.prod
```

**Valide o Docker Compose:**

```bash
docker compose -f backend/infra/docker-compose.prod.yml config
```

**Suba a aplicação:**

```bash
docker compose -f backend/infra/docker-compose.prod.yml up -d --build
```

**Verifique os containers:**

```bash
docker compose -f backend/infra/docker-compose.prod.yml ps
```

Resultado esperado:

```
coretext-database   healthy
coretext-api        healthy
coretext-frontend   running
```

---

## Testes após o deploy

**Testar a API:**

```bash
curl http://localhost/api/health
```

Resposta esperada:

```json
{"status":"ok"}
```

**Testar o frontend:**

```bash
curl -I http://localhost
```

Resposta esperada:

```
HTTP/1.1 200 OK
```

**Acessar no navegador:**

```
http://IP_PUBLICO_DA_EC2
```

---

## Configuração na AWS

A aplicação foi publicada em uma instância EC2 com:

- VPC própria
- Subnet pública
- Internet Gateway
- Tabela de rotas pública
- Security Group
- Docker e Docker Compose instalados
- Aplicação exposta via HTTP na porta 80

---

## HTTPS

A aplicação está disponível via HTTP:

```
http://IP_PUBLICO_DA_EC2
```

O HTTPS não foi configurado nesta etapa porque depende de domínio e certificado SSL/TLS válido.

---

## Persistência de dados

O PostgreSQL utiliza volume Docker persistente:

```
infra_postgres_data
```

Assim, os dados do banco permanecem salvos mesmo após reiniciar ou interromper a instância EC2.

**Comando seguro para parar a aplicação:**

```bash
docker compose -f backend/infra/docker-compose.prod.yml down
```

**Evite comandos que removem volumes:**

```bash
docker compose -f backend/infra/docker-compose.prod.yml down -v
docker system prune --volumes
```

---

## Execução local

### Backend

```bash
cd backend
python -m venv .venv
```

**Windows:**

```bash
.venv\Scripts\activate
```

**Linux/macOS:**

```bash
source .venv/bin/activate
```

**Instalar dependências:**

```bash
pip install -r requirements.txt
```

**Executar API:**

```bash
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend local ficará disponível em:

```
http://localhost:5173
```

---

## Comandos úteis

**Ver containers:**

```bash
docker compose -f backend/infra/docker-compose.prod.yml ps
```

**Ver logs:**

```bash
docker compose -f backend/infra/docker-compose.prod.yml logs -f
```

**Parar aplicação:**

```bash
docker compose -f backend/infra/docker-compose.prod.yml down
```

**Subir aplicação:**

```bash
docker compose -f backend/infra/docker-compose.prod.yml up -d
```

**Rebuildar:**

```bash
docker compose -f backend/infra/docker-compose.prod.yml up -d --build
```

---

## Status do projeto

- [x] Frontend React dockerizado
- [x] Backend FastAPI dockerizado
- [x] PostgreSQL com volume persistente
- [x] Nginx servindo o frontend
- [x] Proxy `/api` para o backend
- [x] Deploy funcional em AWS EC2
- [x] API saudável em `/api/health`
- [x] Acesso externo via HTTP

---

## Autores

Projeto desenvolvido para fins acadêmicos.

**Integrantes:**

- Samuel Henrique
- Edson da Silva
- Kayke Cristofer
- Lucas Viana
- Felipe Lages
