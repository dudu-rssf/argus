# Fase 6e — Melhorias na Geral da Inflação (antes de replicar nas outras abas)

**Status:** no ar (2026-10-16), aguardando o retorno do dono. Depois do ok, o formato vai para as outras 6 abas.

## Pedido do dono
1. Perguntas rápidas: botão "Ver mais" em cada pergunta, com explicação aprofundada, minigráficos e dados (ex.: o que é cada núcleo e o gráfico de cada um; serviços com a composição).
2. "O que está mexendo no IPCA": seletor de prazo no canto superior direito (3, 6, 9, 12 meses) e, em cada grupo, um ícone que explica as possíveis influências do movimento.
3. Seção nova: IPCA por grupos de influência (câmbio, renda, clima…), barras do acumulado em 12 meses, com "Ver mais" explicando o agrupamento.
4. "As outras vezes em que esteve assim": mais intuitivo, mais visual, análise melhor.
5. Depois: conversar sobre um agente de IA para vigiar o site e responder perguntas.

## O que foi feito
- **Ver mais** (gaveta lateral) nas 6 perguntas: meta (meta contínua, teto, meses acima), aceleração (mês que entra × mês que sai e próximos meses a sair), núcleos (definição e minigráfico de EX0, EX3, MS, DP, P55, média e EX-FE), serviços (total, subjacentes e composição em 9 tipos a partir dos subitens), difusão (média de 10 anos) e expectativas (Focus 12m e por ano contra a meta).
- **Cabo de guerra** com prazos 3/6/9/12 meses. O "?" de cada grupo mostra os subitens que mais mudaram a contribuição (fato) e as influências típicas do grupo (curadoria, marcada como canal possível).
- **Áreas de influência:** partição do IPCA usada pelo BCB (serviços → renda e trabalho; bens industriais → câmbio e preços globais; alimentação no domicílio → clima e safra; monitorados → governo e regulação), mais as lentes comercializáveis, não comercializáveis e duráveis.
- **Períodos parecidos** refeitos: frase-resposta, gráfico de trajetórias alinhadas (t = −12 a +12), cartões com contexto da época (curadoria), hoje × então × 12 meses depois e "mais parecido em / mais diferente em".

## Dados e conferência
- Classificação dos subitens em `config/derivadas/ipca_classificacao.yaml`; o build recusa prefixo que não casa com nenhum subitem.
- A variação ponderada de cada cesta reproduz a série do BCB desde 2023: diferença média de 0,005 (serviços), 0,003 (alimentação), 0,002 (industriais) e 0,012 p.p. (monitorados); as 4 cestas somam 100% do peso e o IPCA do mês (teste `composicao-real`).
- O site lê os subitens só dos últimos ~3 anos (`lerSeries(ids, desde)`).
- A exportação de conferência grava os subitens em `web/tests/fixtures/subitens.json`.
