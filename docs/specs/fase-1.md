# Fase 1 — Coleta automática

**Duração estimada:** 2–3 semanas · **Status:** aprovada em 2026-10-04 · em andamento (passos 1–5 concluídos; SGS, Focus, SIDRA, FRED e ComexStat em produção)

## Objetivo

Todas as séries do MVP chegando sozinhas ao banco, 5 vezes ao dia, com cada falha registrada e visível. Ao final, o site (Fase 2) só precisa ler o banco.

## Escopo

**Dentro:** séries `MVP` do catálogo com status `Verificado` ou `Derivado` (Brasil + commodities do FRED), comunicados e atas do Copom, Ibovespa.
**Fora:** séries dos EUA (Fase 7), site, botão "Atualizar" (Fase 2; o workflow já nasce acionável por ele).

## Arquitetura

```
config/series/*.yaml ──► pipeline/argus_pipeline/
                           adapters/   um arquivo por fonte (busca e normaliza)
                           derive/     séries derivadas (núcleos, saldo CAGED, juro real…)
                           load/       grava no Postgres (upsert idempotente)
                           run.py      orquestra: lê config → adapters → derive → load → registra
                                    ▼
                         Neon (Postgres)
```

## Banco de dados

| Tabela | Conteúdo | Chave |
| --- | --- | --- |
| `series` | Espelho do catálogo: id (BR-025), fonte, código, nome, unidade, frequência, tipo, aba | `id` |
| `observations` | `series_id`, `ref_date` (ISO), `value` (numeric), `ingested_at` | (`series_id`, `ref_date`) |
| `ingestion_runs` | Uma linha por execução: início, fim, gatilho (agenda/botão/manual), status | `id` |
| `ingestion_items` | Uma linha por série por execução: status, linhas novas, última data, erro | (`run_id`, `series_id`) |
| `events` | Comunicados e atas do Copom, datas de reunião | `id` |

- Migrações em SQL puro, numeradas (`db/migrations/001_…sql`), aplicadas por um script de 30 linhas. Sem ORM.
- **Revisões de dados:** o upsert sobrescreve o valor e grava a data de ingestão; histórico de vintages fica para a v2.

## Coletores (adapters), na ordem de construção

| # | Fonte | Caminho | Séries do MVP | Observação |
| --- | --- | --- | --- | --- |
| 1 | BCB SGS | SOAP `getValoresSeriesXML`; REST como alternativa (decisão 0009) | ~60 | Primeiro, porque é o maior bloco |
| 2 | Focus | Olinda OData | 6 | Guarda mediana por data de referência |
| 3 | IBGE SIDRA | API `agregados/{tabela}/periodos/…/variaveis/…` | ~10 | **Antes:** mapear variável e classificação de cada tabela (ver abaixo) |
| 4 | FRED | API `series/observations` | 3 | Commodities |
| 5 | ComexStat | `POST /general` | 2 | |
| 6 | Tesouro (RTN) | CKAN → XLSX | 1 | Layout de planilha: teste de contrato rígido |
| 7 | B3 | `IndexCall/GetPortfolioDay` (Yahoo como alternativa) | 1 | Ibovespa |
| 8 | BCB site | `copom/comunicados`, `copom/atas` | texto → `events` | |

Cada adapter: (a) fixture real gravada e completa de um intervalo curto, (b) teste de contrato que lê a fixture, (c) teste de normalização (datas ISO, número como número), (d) erro vira `ingestion_items.status = 'erro'`, nunca exceção que derruba a execução inteira.

**Resolvido (passo 6b):** cada série SIDRA tem no catálogo o recorte completo, `t<tabela>/v<variáveis>/c<classificação>=<categorias>` (ex.: `t8888/v12606,12607/c544=129314,129315,129316`), conferido contra os metadados oficiais. Cada combinação variável × categoria vira uma sub-série `@<variável>.<categoria>`.

## Séries derivadas

Calculadas depois da coleta, a partir do banco: média dos 5 núcleos, mediana ponderada, bens industriais e serviços subjacentes, serviços intensivos em trabalho, saldo do CAGED (variação do estoque), juro real ex-ante, juro neutro implícito no Focus. Cada fórmula é uma função pura com teste contra um valor conhecido.

## Carga

- **Primeira execução:** histórico completo de cada série.
- **Execuções seguintes:** janela recente (últimos 24 meses para mensais, 90 dias para diárias), para capturar revisões sem baixar tudo de novo.
- Upsert: rodar duas vezes seguidas não cria duplicata (teste obrigatório).

## Agendamento (decisão 0008)

Workflow `coleta.yml`:
- `schedule` às 08:45, 09:30, 12:30, 15:30 e 19:30 (BRT), em UTC no cron.
- `workflow_dispatch` (manual e, na Fase 2, o botão do site).
- `concurrency: coleta` — uma execução por vez.
- **Proteção dos 60 dias (decisão 0007):** um passo semanal grava `docs/status/coleta.md` (resumo da última semana) com commit, mantendo o repositório ativo e servindo de registro público de saúde da coleta.

## Testes

- Unidade e contrato: `pytest` com fixtures, sem rede.
- Banco: no CI, um Postgres temporário (service container do GitHub Actions) recebe as migrações e o teste de upsert. O Neon de produção nunca é usado em teste.

## Dependências novas (precisam de aprovação — CLAUDE.md, regra 8)

| Pacote | Para quê |
| --- | --- |
| `psycopg[binary]` | Driver do Postgres |
| `openpyxl` | Ler a planilha do RTN (já usado para gerar a planilha do catálogo) |

## Passos e commits

1. [x] Migrações + script de aplicação + teste no Postgres do CI
2. [x] Espelho do catálogo na tabela `series` (+ `series_data`, um registro por código da fonte)
3. [x] Orquestrador (`collect.py`) + registro em `ingestion_runs/items`, com adapter falso
4. [x] Adapter SGS → primeira carga real no Neon: 65 séries, 58.687 observações (execução 1, 2026-10-04)
5. [x] Workflow `coleta.yml` (agenda + manual + concurrency)
6. Adapters — um commit cada
   - [x] 6a Focus (execução 2: 7 séries)
   - [x] 6b SIDRA, com variável e classificação de cada tabela no catálogo (execução 3: 16 recortes, ~81 mil observações)
   - [x] 6c FRED (execução 4: 3 commodities)
   - [x] 6d ComexStat (execução 5: 5 recortes, jan/1997 a ago/2026 sem buraco; o período da API é recorte ano × mês, por isso o adapter divide os pedidos)
   - [ ] 6e Tesouro · 6f B3 · 6g Copom
7. Séries derivadas
8. Proteção dos 60 dias e resumo semanal

## Critério de pronto

1. Três dias seguidos com todas as execuções agendadas concluídas.
2. Toda série MVP `Verificado`/`Derivado` com observações no banco e última data compatível com a fonte.
3. Uma consulta mostra, por série, última atualização e último erro (base da aba Data Health).
4. Dez valores sorteados conferem com a fonte oficial.
