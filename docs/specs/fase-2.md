# Fase 2 — Site: esqueleto, login, motor de gráfico e Data Health

**Status:** aprovada em 2026-10-04 (dependências e login próprio, decisão 0012) · em andamento

## Objetivo

O site no ar, atrás de senha, lendo o Neon. Ele tem o motor de gráfico com as transformações testadas contra números oficiais, a página Data Health e uma aba de teste montada só por configuração. Com o site no ar, fazemos a verificação de 3 dias da coleta (decisão 0011).

## O que entra / o que fica fora

**Entra:**
- login;
- layout base (barra lateral com as abas, cabeçalho com a hora da última atualização e o botão "Atualizar");
- design tokens navy/dourado;
- motor de gráfico (horizonte, transformação, combinado barras+linha, exportar CSV);
- Data Health;
- aba de teste "Inflação (prévia)" definida em YAML;
- deploy na Vercel.

**Fica fora:**
- as abas de verdade (Fases 3 e 4);
- sombreamento de ciclos, real × nominal, comparação por evento, exportar PNG e preços com Lightweight Charts (Fase 3 em diante);
- notícias (Fase 6).

## Arquitetura

```
web/                      Next.js (App Router) + TypeScript
  app/(protegido)/...     páginas atrás do login
  app/login               tela de senha
  app/api/atualizar       dispara e acompanha o workflow "Coleta" (decisão 0008)
  lib/db.ts               leitura do Neon (só SELECT)
  lib/transform.ts        transformações: funções puras, testadas
  lib/config.ts           lê config/series/*.yaml e config/abas/*.yaml
  components/grafico/     motor de gráfico (ECharts)
  styles/tokens/          cores, fontes, espaçamentos (CLAUDE.md, regra 7)
config/abas/*.yaml        quais gráficos cada aba mostra (decisão 0005)
```

- **Leitura do banco:** só no servidor (componentes de servidor do Next). O navegador nunca recebe a URL do banco.
- **Usuário do banco só de leitura:** o site usa um usuário do Neon que só pode ler (`argus_site`, com GRANT SELECT por migração). Mesmo que o site fosse invadido, ninguém conseguiria alterar dados.
- **Cache:** páginas revalidam a cada 5 min. Quando a coleta do botão termina, o site força a revalidação.

## Login (decisão 0004)

- Senha única. Fica guardada como hash (bcrypt) na variável `ARGUS_SENHA_HASH` da Vercel, nunca em texto.
- Sessão em cookie assinado (`AUTH_SECRET`), `httpOnly`, `secure`, com validade de 30 dias.
- O middleware protege todas as rotas, exceto `/login`. **Falha fechado:** se `ARGUS_SENHA_HASH` ou `AUTH_SECRET` faltarem, nada abre e aparece uma página de erro de configuração. Isso tem teste automático.
- Limite de tentativas: 5 erros em 15 minutos bloqueiam por 15 minutos.

## Motor de gráfico

Transformações por tipo de série (tabela do `plano.md`), como funções puras em `lib/transform.ts`:

| Tipo | Transformações nesta fase |
| --- | --- |
| Índice | Nível, MoM, QoQ, YoY, acumulado 3/6/12m, 3m/6m anualizado |
| Var % mensal | Mensal, acumulado 3/6/12m **encadeado**, 3m/6m anualizado |
| Taxa | Nível, Δ p.p. (1, 3 e 12 meses) |
| Fluxo | Nível, soma 3/12m, YoY |
| Estoque | Nível, MoM, YoY |

**Teste contra número oficial (critério de pronto):** cada transformação é conferida contra uma série oficial já no banco.

| Transformação | Conferida contra |
| --- | --- |
| IPCA 433 acumulado 12m encadeado | IPCA 12m oficial (13522) |
| PIM índice NSA → YoY | variação YoY publicada pelo IBGE (t8888 v11602) |
| PMC índice SA → MoM | variação MoM SA publicada pelo IBGE (t8880 v11708) |
| PIB índice SA → QoQ | taxa QoQ do IBGE (t5932 v6564) |
| PIM índice NSA → acumulado 12m | variação acumulada em 12 meses do IBGE (t8888 v11604) |
| Δ p.p. da Selic | diferença conferida à mão em 3 datas de reunião do Copom |

As variações publicadas pelo IBGE que ainda não estão no banco (v11602, v11604, v11708) entram no catálogo como recortes de conferência das séries BR-007 e BR-008.

**Controles:** horizonte (1A, 3A, 5A, 10A, Máx, zoom), transformação (só as válidas para o tipo), gráfico combinado barras MoM + linha YoY, tabela de valores e exportação para CSV. Cada gráfico mostra a fonte, o código e a data da última observação.

## Data Health

Uma linha por série de dados:
- fonte;
- última observação;
- última coleta;
- status da última execução;
- último erro;
- dias desde o último dado novo.

No topo, as últimas execuções (agenda, botão ou manual) e um filtro "só com problema". É aqui que se acompanha a verificação de 3 dias.

## Botão "Atualizar" (decisão 0008)

O botão chama `/api/atualizar` no servidor do site, que dispara o workflow "Coleta" pela API do GitHub. O token tem só a permissão `actions: write` no repositório. O botão mostra o progresso até a coleta terminar e recarrega a página. Se uma coleta já estiver rodando, o clique mostra o andamento dela em vez de disparar outra.

## Dependências novas (precisam de aprovação — CLAUDE.md, regra 8)

| Pacote | Para quê |
| --- | --- |
| `next`, `react`, `react-dom`, `typescript` | O site |
| `tailwindcss` + componentes shadcn/ui (copiados para o repositório) | Layout e componentes |
| `echarts` | Gráficos macro (já previsto no plano) |
| `@neondatabase/serverless` | Ler o Neon a partir da Vercel |
| `jose` | Assinar e conferir o cookie de sessão |
| `bcryptjs` | Conferir a senha contra o hash |
| `yaml` | Ler a configuração das séries e abas |
| `vitest` | Testes das transformações e do login |
| `@playwright/test` | Teste ponta a ponta: login, falha fechada, gráfico abre |

Uma mudança em relação à decisão 0004: login próprio com `jose` + `bcryptjs`, no lugar do Auth.js. Para uma senha única, o Auth.js traz muito código que não usaríamos. O próprio login fica com ~80 linhas testadas. Se aprovado, vira a decisão 0012.

## A sua parte (eu guio passo a passo quando chegar a hora)

1. **Neon:** criar o usuário `argus_site` pelo SQL Editor (não pelo menu Roles: lá o usuário nasce com poder de administrador). As permissões de leitura são dadas pelo pipeline.
2. **GitHub:** criar um token "fine-grained" só para o repositório `argus`, com a permissão Actions: Read and write.
3. **Vercel:** importar o repositório (pasta `web`) e cadastrar 4 variáveis: `DATABASE_URL` (do `argus_site`), `GITHUB_TOKEN`, `AUTH_SECRET` e `ARGUS_SENHA_HASH`. As duas últimas são geradas na página `/configurar` do próprio site, no navegador, sem a senha passar por ninguém.
4. **Domínio:** apontar o domínio já comprado para a Vercel (opcional nesta fase).

## Passos e commits

1. [x] Permissões só de leitura para `argus_site` (reaplicadas a cada coleta, `db/permissoes.sql`); recortes de conferência do IBGE no catálogo.
2. [x] Esqueleto Next.js + tokens + layout base.
3. [x] Login com falha fechada (testes primeiro).
4. [x] `lib/transform.ts` com testes unitários.
5. [x] Testes contra número oficial (banco de teste com dados reais gravados).
6. [x] Leitor de configuração + motor de gráfico.
7. [x] Data Health.
8. [x] Aba de teste "Inflação (prévia)" só por YAML.
9. [x] Botão "Atualizar".
10. Deploy na Vercel + teste ponta a ponta no ar.

## Critério de pronto

1. Todas as conferências da tabela acima batem: pelo menos 90% dos pontos idênticos nas casas decimais da fonte e nenhum a mais de 1 unidade da última casa (a diferença vem do arredondamento do insumo publicado).
2. A aba de teste existe só com YAML, sem código específico.
3. Sem `ARGUS_SENHA_HASH` ou sem `AUTH_SECRET`, o site bloqueia tudo (teste automático).
4. Site no ar na Vercel. O botão "Atualizar" dispara a coleta e a página mostra o dado novo.
5. **Verificação de 3 dias (decisão 0011):** três dias úteis seguidos com todas as coletas agendadas verdes, acompanhados pela Data Health.
