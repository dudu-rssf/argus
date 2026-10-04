# 0009 — Coleta do SGS pelo serviço SOAP do BCB

**Status:** aceita · 2026-10-04

## Contexto
Sondagem no GitHub Actions (workflow "Sondar BCB", 2026-10-04):

| Caminho | Resultado |
| --- | --- |
| API REST `api.bcb.gov.br` | Não resolve DNS no runner nem no DNS público (8.8.8.8) |
| SOAP `www3.bcb.gov.br/wssgs/services/FachadaWSSGS`, `getValoresSeriesXML` | HTTP 200, histórico completo em uma chamada: IPCA (433) desde 1980 = 560 obs; meta Selic (432) desde 1999 = 10.073 obs; < 1 s cada |
| SOAP `getValoresSeriesVO` | Funciona, mas resposta ~20× maior (SOAP-encoded com referências) |
| SOAP `getUltimoValorVO` | Funciona (título + último valor); já usado pelo validador |

## Decisão
O adapter do SGS (Fase 1) usa **`getValoresSeriesXML`** como caminho principal. A API REST fica como alternativa, testada a cada execução, sem bloquear a coleta.

## Formato da resposta
String XML (ISO-8859-1) dentro do envelope SOAP:
`<SERIES><SERIE ID='433'><ITEM><DATA>1/1980</DATA><VALOR>6.62</VALOR><BLOQUEADO>false</BLOQUEADO></ITEM>…`
`DATA` vem como `M/AAAA` (mensal) ou `DD/MM/AAAA` (diária); o adapter normaliza para ISO (CLAUDE.md, regra 6).

## Consequências
- Sem o limite de 10 anos por consulta da API REST: uma chamada por série traz todo o histórico.
- Dependência de um serviço legado: o teste de contrato com resposta real gravada detecta mudança de formato; falha vira registro em `ingestion_runs`.
- Amostras reais em `pipeline/tests/fixtures/real/` estão truncadas em 30 KB; a Fase 1 grava fixtures completas de intervalos curtos.
