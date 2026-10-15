# 0014 — SIDRA com endereço reserva do próprio IBGE (apisidra), não com cópia do SGS

**Status:** aceita · 2026-10-15

## Contexto
Desde 14/10/2026 à noite, `servicodados.ibge.gov.br` (API v3 de agregados, usada pelo adapter SIDRA) não aceita conexão dos runners do GitHub. Cada pedido esperava 2 min. As coletas passaram do limite de 30 min: 4 foram canceladas e 1 terminou parcial, com 18 erros, todos do SIDRA.

Na mesma hora, o workflow **Testar conexões** mostrou o seguinte:
- `apisidra.ibge.gov.br` responde (HTTP 200);
- `servicodados` não conecta.

Os dois endereços servem as mesmas tabelas do IBGE.

O SGS foi considerado como reserva e descartado, por três motivos:
1. Copia só parte das séries. Não tem os detalhes da PNAD, o IPCA por subitem com peso, nem todas as variantes da PMC e da PMS.
2. É cópia de segunda mão.
3. A regra do projeto é usar a fonte original.

## Decisão
1. **A conexão desiste em 10 s.** A leitura continua com até 120 s, porque as respostas grandes demoram. Depois de 3 falhas de conexão seguidas num endereço, ele não é mais pedido naquela rodada, e cada série vira erro registrado.
2. **Endereço reserva.** Quando o principal falha *por conexão*, a mesma série é pedida ao `apisidra.ibge.gov.br` e passa pela mesma normalização: datas, sub-séries `variável.categoria` e marcadores do IBGE.
3. **Quando não há troca de endereço.** Um erro HTTP do principal (500, 400…) é resposta do IBGE, não queda. Fica registrado como erro, sem trocar de endereço.
4. **Os dois falharam.** Um único erro registra os dois motivos.

## Conferência
Respostas reais dos dois endereços, para os mesmos períodos, devolvem observações idênticas: datas, valores e sub-séries. Foram testadas quatro tabelas:
- PIM, 8888;
- PIB com ajuste sazonal, 1621;
- PNAD rendimento, 6390;
- IPCA por subitem, 7060.

Ver `test_reserva_devolve_exatamente_o_mesmo_que_o_principal`.

## Consequências
- **Sem metadados.** O apisidra não traz metadados no mesmo pedido. A frequência vem do cabeçalho da resposta ("Mês", "Trimestre", "Trimestre Móvel"). A janela incremental usa `last N`, com N grande o bastante para mensal ou trimestral, e depois é cortada pela data `desde`.
- **Sem conferência prévia de códigos.** Nesse caminho, variável e categoria não são conferidas antes contra os metadados. O apisidra recusa código inexistente com HTTP 400 e uma explicação, que vira erro registrado.
- **Pedidos de histórico inteiro (`p/all`) não são divididos.** Uma série nova muito grande pela reserva (por exemplo, IPCA por subitem desde 2020) pode passar do limite da API. Nesse caso vira erro registrado e é coletada quando o principal voltar.
