# Fase 6 — Central (tela inicial) e notícias

**Status:** parte 1 feita em 2026-10-15 (sem agenda e sem notícias) · parte 2 pendente

## Parte 1 — Central com o que já está no banco

1. [x] **Mercado.** Selic meta (com a última decisão em bps), dólar e Ibovespa (contra o dia anterior), IPCA 12 meses (contra o mês anterior), Focus IPCA 12 meses e juro real ex-ante (contra 4 semanas antes). Cada ficha mostra a data do dado.
2. [x] **Resumo das análises.** Episódio atual do Copom, postura (juro real − neutro), Selic contra a faixa de Taylor, hiato (HP e Hamilton), e a direção em 3 e 12 meses de IPCA 12 meses, IBC-Br (variação em 12 meses) e desocupação. Tem link para a aba Análises.
3. [x] **Últimas divulgações.** Séries mensais, trimestrais e anuais das abas cujo último dado entrou ou foi revisado no banco nos últimos 7 dias, com o valor anterior e a diferença.
4. [x] Botão "Fórmula" em cada bloco (decisão 0015). Os gráficos ganharam também a fórmula da leitura de trajetória.

## Parte 2 — pendente

- **Agenda de divulgações.**
  - O BCB não publica o calendário do Copom em API aberta (o portal de dados abertos tem só atas e comunicados).
  - Caminho: um calendário curado (Copom, IBGE), conferido contra a página oficial, num arquivo de configuração. O Focus sai às segundas.
- **Notícias.** RSS de fontes oficiais (BCB, IBGE, Tesouro, Fed) num adapter novo do pipeline. Exige biblioteca nova, que precisa de aprovação.
- **Critério de pronto da fase:** Argus usado como primeira tela por 2 semanas.
