# Argus — regras do projeto

Plataforma pessoal de inteligência global macro, com foco no Brasil. O Argus **entrega informação, não recomendação**: dados confiáveis, comparáveis e bem transformados. Interpretação só na aba Análises.

O dono do projeto é iniciante em programação. Explique o que cada mudança faz em uma ou duas frases, sem jargão desnecessário, e peça aprovação antes de qualquer ação irreversível.

## Leia antes de começar qualquer tarefa

1. `docs/plano.md` — visão, abas, arquitetura e fases.
2. `docs/specs/<fase atual>.md` — o que está sendo feito agora e o critério de pronto.
3. `docs/decisoes/` — por que cada escolha foi feita. Não reverta uma decisão sem escrever uma nova.
4. `docs/licoes-primeira-tentativa.md` — erros que já aconteceram e não podem se repetir.

## Arquitetura (não negociável)

- **Três camadas que nunca se misturam:** pipeline Python agendado (coleta e valida) → Postgres (Neon) → site Next.js (só lê o banco).
- **Nenhuma chamada a API externa fora de `pipeline/adapters/`.** O site nunca chama BCB, IBGE, FRED, RSS etc. diretamente, nem em rota de API.
- **Séries são configuração, não código.** Uma série nova entra em `config/series/*.yaml`; o motor de gráfico e as abas leem a configuração.
- **Todo código de série vem do catálogo** (`docs/catalogo/`) e só entra em produção com status `Verificado`, confirmado pelo validador contra o título oficial da fonte.

## Regras de trabalho

1. Toda tarefa começa com um plano curto. Código só depois do plano aprovado.
2. Teste antes da implementação. Adapter novo exige fixture gravada (resposta real da API) em `pipeline/tests/fixtures/` e teste de contrato.
3. Um commit por passo com testes verdes. Nunca dois módulos no mesmo commit.
4. Proibido silenciar erro: falha de fonte vira registro em `ingestion_runs`; nunca dado inventado, zero ou valor padrão.
5. Nada de scripts avulsos de "fix" ou "seed" para corrigir dados. Corrija a causa no adapter ou na configuração e rode a carga de novo.
6. Datas sempre ISO (`AAAA-MM-DD`), texto sempre UTF-8, números como número (nunca string com vírgula).
7. Design tokens só em `web/styles/tokens`; nenhuma cor solta em componente.
8. Sem dependência nova sem perguntar.

## Segurança

- Segredos só em `.env.local` (local), GitHub Secrets (pipeline) e variáveis de ambiente da Vercel (site). Nunca em código, docs ou commits.
- `.claude/settings.local.json` nunca vai para o git (contém comandos com credenciais). Já vazou uma senha assim; ver `docs/licoes-primeira-tentativa.md`.
- O site inteiro fica atrás de login. O middleware de autenticação **falha fechado**: se a configuração de senha estiver ausente, bloqueia o acesso, nunca libera.
- Antes de cada commit, confira que nenhum arquivo contém chave, senha ou URL de banco com credencial.

## Comandos

Ainda não há código. Esta seção é preenchida na Fase 1 (pipeline) e na Fase 2 (site).
