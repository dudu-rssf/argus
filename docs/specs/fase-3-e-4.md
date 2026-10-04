# Fases 3 e 4 — Abas do Brasil

**Status:** concluídas em 2026-10-04 (MVP de abas; ajustes de conteúdo seguem com o uso)

## O que foi feito

Sete abas, todas só por configuração em `config/abas/` (decisão 0005), sem código específico por aba:

| Aba | Painéis |
| --- | --- |
| Atividade | PIB (QoQ), oferta, demanda, IBC-Br, indústria, varejo, serviços, PIB nominal, Focus PIB |
| Mercado de Trabalho | Desocupação, participação e ocupação, ocupados e informais, informalidade, renda real, massa real, CAGED (estoque e saldo) |
| Inflação | IPCA e IPCA-15 (mensal + 12m), núcleos do Copom, sínteses (média, P50, EX-FE), livres × monitorados, serviços/industriais/alimentação, subjacentes, difusão, IGPs, IC-Br, Focus |
| Política Monetária | Meta Selic, juro real × neutro implícito, diferença, Focus Selic, comunicados e atas do Copom (texto), crédito (saldo, livre/direcionado, concessões, juros, spread), M1–M4 |
| Fiscal | Primário, nominal e juros (% PIB), primário por esfera, dívida bruta e líquida, RTN (receita, despesa, primário, nominal em 12 meses), Focus fiscal |
| Setor Externo | Exportações e importações, destinos (China, EUA, UE), transações correntes, IDP, reservas, dólar, câmbio real, Focus câmbio, commodities |
| Famílias | Endividamento, comprometimento de renda, inadimplência, crédito por modalidade, massa real, consumo das famílias |

Novidades do motor para estas abas: moldes de ano (`{ano}`, `{ano+1}`) para o Focus por ano de referência; painel de textos oficiais (comunicados e atas do Copom).

## Critério de pronto

- [x] **Toda série das abas tem dados no banco:** 118 de 118 (workflow "Saúde do banco", passo `conferir_abas`).
- [x] **10 pontos por aba conferem com a fonte:** workflow "Conferir amostra contra as fontes" sorteou 70 valores; 69 iguais à fonte e 1 não conferido porque o ComexStat recusou o pedido por limite de frequência (o adapter passou a esperar mais entre tentativas).
- [x] **Transformações conferidas contra BCB e IBGE** (Fase 2).

## Fora destas fases

- Saldo da balança comercial (exportações − importações) como série própria: derivada a criar.
- Curva do Focus por reunião do Copom (eixo por reunião, não por data): tipo de painel novo.
- Meta de inflação e metas fiscais (BR-049, BR-075): dados curados, ainda não carregados.
- Serviços intensivos em trabalho (BR-130): falta lista curada e aprovada.
