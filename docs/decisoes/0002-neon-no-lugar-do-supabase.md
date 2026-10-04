# 0002 — Neon como banco, no lugar do Supabase

**Status:** aceita · 2026-10-04

## Contexto
O Supabase grátis pausa o projeto após 7 dias de baixa atividade, o que derrubou a primeira tentativa.

## Decisão
Neon (Postgres), plano grátis: a computação "dorme" após 5 minutos parada e acorda na próxima consulta, sem pausa por inatividade. Limite de 1 GB por projeto e 100 horas de computação por mês.

## Consequências
- Primeira consulta após inatividade tem latência extra de partida a frio.
- Login não vem do banco: usa Auth.js (ver 0004).
