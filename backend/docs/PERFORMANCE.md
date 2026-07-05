# Desempenho da geração de resumos (Issue 18)

Este documento registra a medição do tempo de resposta da geração de resumos
(individual e integrado), a comparação com a meta de desempenho do projeto
(< 30 segundos) e as limitações encontradas durante os testes.

## Objetivo

Verificar se a geração de resumos — extração do PDF + chamada à LLM (Google
Gemini) + persistência no banco — se mantém, na prática, abaixo de 30
segundos, tanto para resumo individual (issue 12) quanto integrado (issue 13),
com PDFs de tamanhos diferentes.

## Como o tempo é medido

O tempo de geração (`generation_time_ms`) é medido em produção, não só no
benchmark: `app/services/summarization.py` cronometra do início da extração
de texto até o retorno da resposta da LLM, e grava o valor no banco junto com
cada `Summary`/`IntegratedSummary`. Desde a issue 18, se esse tempo ultrapassa
30.000 ms, um `logger.warning(...)` é emitido (`PERFORMANCE_TARGET_MS` em
`summarization.py`), para que isso apareça nos logs da aplicação sem precisar
consultar o banco manualmente.

## Metodologia do benchmark

Script: [`scripts/benchmark_summaries.py`](../scripts/benchmark_summaries.py).
Ele **reutiliza o caminho de código de produção** (mesmas funções
`generate_individual_summary` / `generate_integrated_summary`, mesma extração
de PDF, mesma chamada real à API Gemini configurada em `.env`) — não é uma
simulação.

Dois tamanhos de PDF foram usados, gerados a partir de texto real em português
(não lorem ipsum), para que o resumo produzido pela LLM fosse representativo
de um caso de uso real:

| Tamanho | Palavras | Páginas | Conteúdo |
| --- | --- | --- | --- |
| Pequeno | 136 | 1 | Parágrafo sobre energia solar fotovoltaica |
| Médio | 650 | 3 | Texto de ~7 seções sobre mudanças climáticas (causas, efeitos, mitigação, adaptação) |

Cenários medidos:

1. **Resumo individual — PDF pequeno**
2. **Resumo individual — PDF médio**
3. **Resumo integrado — PDF pequeno + PDF médio juntos**

## Resultados

> Os números abaixo são medições **reais** (chamadas de verdade à API Gemini,
> não mockadas), coletadas em 2026-07-05. Ver limitação sobre a
> fragmentação da coleta na seção seguinte.

| Cenário | Execuções (n) | Mínimo | Mediana | Média | Máximo | Meta (30s) |
| --- | --- | --- | --- | --- | --- | --- |
| Resumo individual — pequeno | 9 | 3,5s | 5,0s | 5,5s | 7,6s | ✅ OK |
| Resumo individual — médio | 7 | 5,6s | 10,4s | 9,4s | 12,5s | ✅ OK |
| Resumo integrado — pequeno + médio | 4 | 8,3s | 10,0s | 10,1s | 11,9s | ✅ OK |

Dados brutos e metadados completos: [`docs/performance/results_20260705_manual.json`](performance/results_20260705_manual.json).

### Análise

- **Todos os cenários testados ficaram bem abaixo do limite de 30 segundos**
  — mesmo o pior caso observado (12,5s, resumo individual do PDF médio) tem
  folga considerável em relação à meta.
- O tempo cresce com o tamanho do documento (pequeno: ~5,5s em média → médio:
  ~9,4s em média), como esperado, já que mais texto é enviado à LLM.
- O resumo integrado (dois documentos, ~786 palavras no total) ficou na
  mesma faixa do resumo individual do PDF médio sozinho (~10s), sugerindo que
  o principal custo de tempo é a geração da resposta pela LLM, não a
  quantidade de arquivos em si.
- Houve variação relevante entre execuções do mesmo cenário (ex.: resumo
  individual pequeno variou de 3,5s a 7,6s). Isso é esperado ao depender de
  uma API externa e **não é controlável pela aplicação** — ver limitações.

## Limitações encontradas

1. **Cota diária gratuita da API Gemini é o maior risco para desempenho e
   testes, não a latência de geração em si.** Durante os próprios testes
   deste benchmark, o plano gratuito do `gemini-2.5-flash` retornou
   `429 RESOURCE_EXHAUSTED` indicando um limite de **20 requisições por dia**
   por projeto/modelo (além de um limite por minuto observado
   anteriormente). Isso significa que, com a chave gratuita atual, a
   aplicação **para de gerar resumos completamente após 20 chamadas em um
   mesmo dia**, independentemente de quão rápido cada chamada individual
   seja. Esse é o limite mais restritivo do sistema hoje — mais do que
   qualquer tempo de resposta medido.
2. **Indisponibilidade transitória do modelo.** Em pelo menos uma chamada
   durante os testes, a API retornou `503 UNAVAILABLE` ("model is currently
   experiencing high demand"). O `LLMClient` (issue 11) já trata esse caso
   como `LLMConnectionError`, mas é um lembrete de que a aplicação depende de
   um serviço de terceiros fora do nosso controle.
3. **Coleta de dados fragmentada.** Por causa da limitação (1), não foi
   possível rodar os 3 cenários × 3 execuções em uma única execução contínua
   do script no dia dos testes — os dados desta versão do relatório foram
   agregados a partir de execuções parciais. O script foi corrigido (nesta
   mesma issue) para registrar falhas por execução e continuar, em vez de
   abortar o benchmark inteiro; execuções futuras, feitas em dias diferentes
   ou com uma chave paga, devem produzir um `results_<timestamp>.json`
   único e completo.
4. **Amostra pequena e um único ambiente.** As medições foram feitas a partir
   de uma única máquina/conexão de rede, sem variar horário do dia, região ou
   carga simultânea. Não simulam múltiplos usuários gerando resumos ao mesmo
   tempo.
5. **Sem chunking para documentos muito grandes.** O prompt (issue 11/12/13)
   envia o texto extraído inteiro para a LLM. PDFs muito maiores que o
   "médio" testado aqui (dezenas de páginas) não foram medidos; o tempo de
   geração e o custo de tokens devem crescer proporcionalmente, e em algum
   ponto pode ser necessário dividir o texto em partes.
6. **Alerta de performance é só um log, não uma ação automática.** O aviso em
   `summarization.py` quando `generation_time_ms > 30000` fica nos logs da
   aplicação; não há hoje um dashboard, alerta externo (e-mail/Slack) ou
   retry automático quando isso acontece.

## Observações para a apresentação

- O **tempo de geração em si atende com folga a meta de 30 segundos** em
  todos os cenários testados (pequeno, médio e integrado) — o pior caso
  observado foi 12,5s.
- O **maior risco de desempenho do sistema hoje não é a latência, é a cota
  gratuita da API** (20 requisições/dia no plano usado). Vale mencionar isso
  explicitamente na apresentação como uma limitação conhecida de
  infraestrutura, não do código da aplicação.
- O tempo de geração já é registrado por resumo no banco de dados
  (`generation_time_ms`) desde a issue 12/13, e a aplicação já loga um aviso
  quando uma geração ultrapassa 30s — a infraestrutura de observabilidade
  pedida pela issue 18 está em produção, não só no benchmark.
- Para uma demonstração ao vivo confiável, recomenda-se: (a) usar uma chave
  de API com cota maior (plano pago) ou (b) limitar o número de gerações de
  resumo feitas nos ensaios antes da apresentação, para não esgotar a cota
  gratuita do dia da apresentação em si.

## Como reproduzir

```bash
cd backend
# venv ativado, .env com GEMINI_API_KEY válida
python scripts/benchmark_summaries.py --runs 3 --delay 15
```

Os resultados são salvos em `docs/performance/results_<timestamp>.json`.
Ajuste `--delay` (segundos entre chamadas) e `--runs` (execuções por cenário)
conforme a cota disponível na chave usada.
