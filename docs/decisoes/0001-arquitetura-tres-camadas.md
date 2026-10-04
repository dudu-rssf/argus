# 0001 — Arquitetura em três camadas desacopladas

**Status:** aceita · 2026-10-03

## Contexto
A primeira tentativa misturava coleta e exibição: rotas de API do site chamavam fontes externas em tempo real. Uma fonte instável derrubava páginas.

## Decisão
Pipeline Python agendado → Postgres → site Next.js que só lê o banco. Chamadas externas só em `pipeline/adapters/`.

## Consequências
- Fonte fora do ar afeta só a próxima carga; o site mostra o último dado válido com a data.
- Dados intradiários não fazem parte do MVP.
