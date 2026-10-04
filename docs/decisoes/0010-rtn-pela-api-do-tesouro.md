# 0010 — RTN pela API Séries Temporais do Tesouro, não pela planilha

**Status:** aceita · 2026-10-04 · substitui o caminho "CKAN → XLSX" da spec da Fase 1 para o BR-074

## Contexto
A spec da Fase 1 previa ler o RTN (Resultado do Tesouro Nacional) da planilha "Série Histórica" no CKAN do Tesouro Transparente: 4,3 MB, layout que muda com frequência, exige teste de contrato rígido. Ao gravar os metadados do pacote no CKAN (2026-10-04), o próprio pacote listava um recurso "API Séries Temporais":

- `GET https://apiapex.tesouro.gov.br/aria/v1/series-temporais/custom/resultado-fiscal?tema=10&codigo_da_serie=10.04.1`
- JSON paginado (`registros`, `pageSize` 1000), com código, nome, data ISO e valor numérico de cada série.
- Temas 10, 13 e 20 = tabelas 1.2 (resultado fiscal mensal), 1.3 (investimento) e 1.4 (custeio) do RTN.
- Resposta real: primário do Governo Central de jan/1997 a ago/2026, 356 meses, sem buraco; um mês à frente da planilha (jul/2026).

## Decisão
O BR-074 usa a API. Código no catálogo: `rtn=<código da série>` (ex.: `rtn=10.04.1`). Sem dependência nova (o `openpyxl` continua só para gerar a planilha do catálogo).

## Consequências
- Sem leitura de planilha: o risco de "layout mutável" deixa de existir para o RTN.
- A API não é documentada em OpenAPI; o contrato está nas fixtures reais (`tesouro_rf_*.json`) e nos testes.
- Particularidades tratadas no adapter: o campo `next` aparece mesmo na última página (o fim é detectado por página incompleta); código inexistente devolve lista vazia com status `ok`, e o adapter registra isso como erro.
