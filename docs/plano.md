# Plano do Argus

Versão do repositório do Plano Mestre (documento vivo no claude.ai). Em caso de conflito, as decisões em `docs/decisoes/` prevalecem.

## Visão

Plataforma pessoal de informação macro: séries oficiais confiáveis, transformações corretas e comparação histórica de ciclos. **Informação, não recomendação.** A interpretação fica com o usuário, exceto na aba Análises.

Acesso: site online, atrás de senha, para um único usuário.

## Princípios

1. **Pipeline primeiro, tela depois.** Cada fonte é um adapter isolado, com schema validado e teste. Uma fonte quebrada degrada um gráfico, nunca o site.
2. **Fatias verticais.** Cada entrega vai da fonte ao gráfico em produção antes de abrir a próxima.
3. **Dashboard como configuração.** O motor de gráfico e o layout de aba são escritos uma vez; cada aba é uma lista de séries em YAML.
4. **Metadado em todo gráfico.** Fonte, data da última observação, frequência e se o dado é revisável.

## Stack

| Camada | Escolha |
| --- | --- |
| Pipeline | Python, `uv`, `httpx`, `pydantic`, `pytest` |
| Banco | Neon (Postgres), plano grátis |
| Agendamento | GitHub Actions (cron), repositório privado |
| Site | Next.js + TypeScript + Tailwind + shadcn/ui |
| Gráficos | Apache ECharts (macro) + TradingView Lightweight Charts (preços) |
| Login | Auth.js, usuário único, falha fechada |
| Hospedagem | Vercel |

## Abas

Navegação de topo por país. Mesma taxonomia de subabas em todos os países.

| Área | Subaba | Fase |
| --- | --- | --- |
| Central | Command Center (mercado, regime, agenda, últimas divulgações, notícias, saúde dos dados) | MVP |
| Brasil | Atividade | MVP |
| Brasil | Mercado de Trabalho | MVP |
| Brasil | Inflação | MVP |
| Brasil | Política Monetária | MVP |
| Brasil | Fiscal | MVP |
| Brasil | Setor Externo | MVP |
| Brasil | Famílias | MVP |
| Brasil | Análises núcleo (ciclos do Copom, juro neutro implícito no Focus, juro real × neutro) | MVP |
| Brasil | Análises avançadas (Taylor, NAIRU, hiato, Copom por diretor) | v2 |
| Brasil | Empresas, Mercado & Risco, Política | v2 |
| EUA | 9 subabas espelhadas | Logo após o MVP |
| China, Global | Subaba única; ciclos entre países | v2 |
| Ferramentas | Data Health (MVP), Teses (v2), Alertas (v3) | — |

**Regra de corte:** no MVP entra o que vem de fonte oficial com API (BCB SGS, Focus, IBGE SIDRA, ComexStat, Tesouro) e não exige modelo próprio. Fontes difíceis (B3, ANBIMA, pesquisas, texto) e modelagem ficam para a v2.

O catálogo completo, série por série, está em `docs/catalogo/`.

## Notícias (aba Central)

- **MVP:** RSS oficial (BCB, Fed, Tesouro, Agência IBGE) e manchetes de imprensa (título, veículo, link), filtradas por palavra-chave e fonte. Sem IA.
- **v2:** resumo do dia com a Claude API (modelo leve) e monitor geopolítico via GDELT.

## Motor de gráfico

| Controle | Opções |
| --- | --- |
| Horizonte | 1A, 3A, 5A, 10A, Máx, zoom livre |
| Transformação | Nível, MoM, QoQ, YoY, acumulado 3/6/9/12m, 3m e 6m anualizado (SAAR), Δ p.p. |
| Frequência | Diária, mensal, trimestral, anual, com regra de agregação por série |
| Combinado | Barras MoM + linha YoY, eixo duplo |
| Ajuste sazonal | SA × NSA; aviso em MoM sem ajuste |
| Real × nominal | Deflacionar por IPCA ou CPI |
| Sombreamento | Recessões, ciclos de Copom e Fed, eventos |
| Comparação | Sobrepor, rebasear, alinhar por evento (t=0) |
| Exportação | PNG com fonte e data, CSV |

Transformações válidas dependem do **tipo** da série:

| Tipo | Exemplo | Oferecidas |
| --- | --- | --- |
| Índice | IBC-Br, PIM | Nível, MoM, QoQ, YoY, acumulados, SAAR, real/nominal |
| Variação % mensal | IPCA, núcleos | Mensal, acumulados **encadeados** (nunca somados), anualizado |
| Taxa | Selic, desocupação, DBGG % PIB | Nível e Δ p.p.; sem acumulado |
| Fluxo | CAGED, balança | Nível, soma 3/12m, MoM (SA), YoY, real, % PIB |
| Estoque | Crédito, M2, reservas | Nível, MoM, YoY, real, % PIB |
| Derivado | Juro real, Sahm | Conforme a fórmula declarada |

## Modelo de dados mínimo

| Tabela | Conteúdo |
| --- | --- |
| `series` | id, fonte, código na fonte, nome oficial, unidade, frequência, tipo, país, revisável |
| `observations` | série, data de referência, valor, vintage, data de ingestão |
| `cycles` | país, tipo (corte/alta), início, fim, bps totais, regra que o definiu |
| `events` | reuniões de BC, divulgações, eventos |
| `ingestion_runs` | fonte, horário, status, linhas novas, erro |

## Fases

| Fase | Conteúdo | Pronto quando |
| --- | --- | --- |
| 0 — Fundação e validador (3–4 sem.) | Aprendizado, contas, repositório, catálogo em YAML, validador de códigos | Nenhuma série do MVP como "Confirmar" ou "A mapear" |
| 1 — Pipeline (2 sem.) | Adapters BCB SGS, Focus, SIDRA, ComexStat, Tesouro, FRED; carga idempotente; cron | 3 dias seguidos de cron verde com todas as séries do MVP |
| 2 — Motor de gráfico e esqueleto (2–3 sem.) | Leitor de config, transformações testadas, design system, login, Data Health, deploy | Cada transformação bate com valor oficial; aba de teste só via config |
| 3 — Inflação e Política Monetária (2 sem.) | Primeira fatia vertical | 10 pontos por aba conferem com BCB/IBGE |
| 4 — Demais abas do Brasil (2–3 sem.) | Atividade, Trabalho, Fiscal, Externo, Famílias | Todas as séries MVP no site |
| 5 — Análises núcleo (2 sem.) | Spec metodológica, ciclos do Copom, neutro implícito | 3 ciclos conferidos à mão |
| 6 — Central e notícias (1–2 sem.) | Faixa de mercado, regime, agenda, RSS | Argus usado como primeira tela por 2 semanas. **MVP** |
| 7 — EUA (2 sem.) | 67 séries da primeira leva | — |
| 8+ — v2 e v3 | Empresas, Mercado & Risco, Política, Teses, China, Copom por diretor, Alertas | — |

## Identidade visual

Navy profundo como base, dourado como única cor de destaque, cinzas frios para dados secundários; verde e vermelho só para variação. Modo escuro padrão. Interface densa, estilo terminal (referências: Koyfin, MacroMicro, Bloomberg). Sans de alta legibilidade (Inter ou IBM Plex Sans) e mono para números (IBM Plex Mono).
