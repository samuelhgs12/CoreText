# CoreText Frontend

Interface web do CoreText, uma aplicacao para upload, organizacao e resumo de documentos PDF com apoio de IA.

O frontend foi desenvolvido com React e Vite, consumindo a API do backend para autenticacao, gerenciamento de arquivos, dashboard, perfil e geracao/listagem de resumos.

## Tecnologias

- React
- Vite
- React Router
- React Markdown
- ESLint

## Requisitos

- Node.js 20 ou superior
- npm
- Backend do CoreText em execucao

Por padrao, o frontend tenta acessar a API em:

```bash
http://127.0.0.1:8000
```

## Configuracao

Crie um arquivo `.env.local` dentro da pasta `frontend` caso precise apontar para outra URL de backend:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Em ambiente publicado, use a URL publica da API:

```bash
VITE_API_BASE_URL=https://sua-api.com
```

## Instalacao

Dentro da pasta `frontend`, instale as dependencias:

```bash
npm install
```

## Execucao em desenvolvimento

```bash
npm run dev
```

O Vite exibira a URL local da aplicacao, normalmente:

```bash
http://localhost:5173
```

## Build de producao

```bash
npm run build
```

Os arquivos finais serao gerados em:

```bash
dist/
```

Para testar o build localmente:

```bash
npm run preview
```

## Rotas da aplicacao

- `/login`: entrada do usuario
- `/cadastro`: criacao de conta
- `/dashboard`: painel principal apos login
- `/upload`: envio de PDF
- `/arquivos`: listagem, selecao, visualizacao e exclusao de PDFs
- `/resumos`: listagem, visualizacao, geracao e exclusao de resumos
- `/perfil`: visualizacao dos dados do usuario e troca local da foto de perfil

As rotas internas sao protegidas. Usuarios sem token valido sao redirecionados para login.

## Funcionalidades integradas ao backend

- Cadastro com nome completo, username, e-mail e senha
- Login com e-mail ou username e senha
- Armazenamento do token no `localStorage`
- Logout
- Protecao das paginas internas
- Upload de arquivos PDF
- Listagem dos arquivos do usuario autenticado
- Selecao individual e multipla de arquivos
- Visualizacao real do PDF enviado
- Exclusao de arquivos
- Geracao de resumo individual
- Geracao de resumo integrado com multiplos arquivos
- Listagem de resumos gerados anteriormente
- Visualizacao de resumo com suporte a Markdown
- Exclusao de resumos
- Dashboard com metricas e resumos recentes vindos da API
- Perfil carregado a partir dos dados do usuario autenticado
- Edicao de nome, username e e-mail via backend

## Observacoes importantes

- O frontend valida o formato PDF antes do upload. A regra de tamanho maximo de 50 MB deve ser garantida pelo backend.
- A geracao de resumos depende da configuracao de LLM no backend.
- As acoes rapidas do dashboard sao navegacoes estaticas da interface.

## Estrutura principal

```bash
src/
  components/      Componentes compartilhados
  pages/           Telas da aplicacao
  services/        Comunicacao com a API
  utils/           Utilitarios, como tema claro/escuro
  mocks/           Dados estaticos ainda usados apenas para navegacao do dashboard
```

## Fluxo recomendado para teste manual

1. Inicie o backend.
2. Configure `VITE_API_BASE_URL`, se necessario.
3. Rode `npm run dev`.
4. Crie uma conta em `/cadastro`.
5. Faca login em `/login`.
6. Envie um PDF em `/upload`.
7. Confira o arquivo em `/arquivos`.
8. Selecione um ou mais PDFs e gere um resumo.
9. Veja o resultado em `/resumos`.
10. Confira as metricas em `/dashboard`.
11. Acesse `/perfil` e valide os dados do usuario.

