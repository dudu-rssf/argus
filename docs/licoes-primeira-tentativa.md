# Lições da primeira tentativa (`the-macro-monitor`)

Repositório analisado em 04/10/2026. Projeto construído em 16–17/05/2026 com Claude Code (Next.js 16, Supabase, Drizzle, GitHub Actions), 86 commits em dois dias, 13 abas.

## O que derrubou o site

1. **Coleta agendada desativada pelo GitHub.** O workflow `refresh-macro-data.yml` rodou com sucesso 122 vezes (2× ao dia). Depois de 60 dias sem commits, o GitHub desativa workflows agendados em **repositórios públicos**: "This scheduled workflow is disabled because there hasn't been activity in this repository for at least 60 days."
2. **Banco pausado por inatividade.** Sem a coleta escrevendo, o Supabase grátis pausou o projeto após 7 dias de baixa atividade. Todas as páginas dependiam do banco, então o site caiu.

**Antídoto no Argus:** coleta que gera atividade no repositório (decisão 0007), Neon (não pausa por inatividade) e aba Data Health mostrando a última coleta bem-sucedida.

## Dados errados exibidos sem ninguém perceber

O catálogo de séries foi escrito de memória e nunca validado contra o título oficial do SGS. Exemplos de códigos com nome errado no `scripts/seed-series.ts`:

| Código | Exibido como | Na verdade (título oficial BCB) |
| --- | --- | --- |
| 4449 | IPCA-15 — variação mensal | IPCA — Preços monitorados — Total |
| 4466 | INPC — variação mensal | IPCA — Núcleo médias aparadas com suavização |
| 16121 | Núcleo médias aparadas com suavização | IPCA — Núcleo por exclusão EX2 |
| 11428 | Difusão do IPCA | IPCA — Itens livres |
| 11752 | Risco-Brasil EMBI+ | a confirmar (provável câmbio efetivo real) |

**Antídoto no Argus:** nenhum código entra no pipeline sem passar pelo validador, que compara o título oficial da fonte com o nome no catálogo e confere a última observação.

## Segurança

- A senha do banco Supabase ficou em `.claude/settings.local.json`, arquivo de permissões do Claude Code, que foi commitado num repositório público.
- O middleware de login **falhava aberto**: sem a variável `SITE_PASSWORD`, liberava acesso total.
- O cookie de sessão guardava a própria senha em texto puro.

**Antídoto no Argus:** `.claude/settings.local.json` no `.gitignore`, Auth.js com sessão assinada, middleware que falha fechado.

## Processo

- Nenhum teste automatizado.
- 26 scripts avulsos de `seed`, `backfill` e `fix` para remendar dados, sinal de correções feitas no sintoma, não na causa.
- Rotas de API do site chamando fontes externas em tempo real (Focus, RSS, calendário, health), misturando coleta com exibição.

**Antídoto no Argus:** testes antes do código, fixtures gravadas por fonte, proibição de scripts de "fix", coleta só no pipeline.

## O que vale reaproveitar

- A experiência de produto: as 13 abas e o que foi útil nelas.
- O filtro HP (`lib/hp-filter.ts`) como referência para o hiato do produto (v2).
- A lista de feeds RSS (`lib/rss.ts`) como ponto de partida do agregador.
