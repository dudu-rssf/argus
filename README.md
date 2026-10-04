# Argus

Plataforma pessoal de inteligência global macro, com foco no Brasil: séries oficiais, comparação histórica de ciclos e acompanhamento do cenário, em um só lugar.

**Status:** Fase 0, fundação. Ainda não há código.

## Arquitetura

```
Fontes oficiais (BCB, IBGE, Tesouro, FRED...)
        │  pipeline Python, agendado no GitHub Actions
        ▼
Postgres (Neon)  ◄── única fonte da verdade
        │  leitura
        ▼
Site Next.js (Vercel), atrás de login
```

O site nunca fala com fontes externas. Se uma fonte sair do ar, o site continua mostrando o último dado válido, com a data.

## Documentação

| Arquivo | Conteúdo |
| --- | --- |
| [`CLAUDE.md`](CLAUDE.md) | Regras do projeto para o Claude Code |
| [`docs/plano.md`](docs/plano.md) | Visão, abas, arquitetura e fases |
| [`docs/specs/`](docs/specs/) | Especificação de cada fase |
| [`docs/decisoes/`](docs/decisoes/) | Registro das decisões técnicas |
| [`docs/catalogo/`](docs/catalogo/) | Catálogo de séries: fonte, código, tipo, fase |
| [`docs/licoes-primeira-tentativa.md`](docs/licoes-primeira-tentativa.md) | O que deu errado no `the-macro-monitor` |

## Estrutura

| Pasta | Conteúdo |
| --- | --- |
| `pipeline/` | Coleta, validação e carga (Python) |
| `config/series/` | Definição das séries por aba (YAML) |
| `db/migrations/` | Schema versionado do banco |
| `web/` | Site (Next.js + TypeScript) |
| `.github/workflows/` | Coleta agendada e testes automáticos |
