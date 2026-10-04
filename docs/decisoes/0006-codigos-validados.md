# 0006 — Nenhum código de série sem validação

**Status:** aceita · 2026-10-04

## Contexto
Na primeira tentativa, pelo menos 5 códigos SGS exibiam o indicador errado (ex.: 4449, Preços monitorados, aparecia como IPCA-15).

## Decisão
Toda série do catálogo passa por um validador que busca o título oficial na fonte, compara com o nome no catálogo e confere a data da última observação. Só séries com status `Verificado` entram no pipeline.
