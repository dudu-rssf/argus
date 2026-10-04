# 0005 — Dashboard como configuração

**Status:** aceita · 2026-10-03

## Decisão
Um motor de gráfico e um layout de aba, escritos uma vez. Cada aba é um arquivo YAML em `config/series/` com séries, fonte, código, tipo e gráficos. Séries derivadas são fórmulas declaradas na configuração.

## Consequências
- Adicionar aba ou série não exige programação.
- O tipo da série (índice, variação % mensal, taxa, fluxo, estoque, derivado) define as transformações válidas.
