# Fase 6b — Experiência: resumo por aba, praticidade, MoM/ToT/YoY, explicações e estética

**Status:** em andamento (2026-10-15, modo delegado). Pedido do dono, em 5 itens.

## 1. Resumo no topo de cada aba
- Cada aba ganha `resumo:` no YAML com os 4 a 8 indicadores principais. Cada um mostra: o valor (na medida escolhida), a diferença para o período anterior, a data, uma minicurva de 24 meses e a direção.
- **"O que mais mudou":** os 3 painéis da aba cujo último movimento foi maior em relação ao movimento típico da própria série. A medida é |Δ| dividido pela mediana dos |Δ| em 10 anos.
- Botão Fórmula com as duas contas.

## 2. Seis mudanças de praticidade
1. **Índice da aba:** atalhos para cada painel no topo (âncoras).
2. **Horizonte da aba inteira:** 1A/3A/5A/10A/Máx muda todos os gráficos de uma vez; cada gráfico ainda pode ter o seu.
3. **Selo "novo":** painel com dado que entrou nos últimos 7 dias.
4. **Busca rápida (Ctrl+K ou "/"):** encontra qualquer painel de qualquer aba e as seções da aba Análises.
5. **Tela cheia:** botão para abrir o gráfico expandido.
6. **Lembrar escolhas:** a transformação e o horizonte de cada gráfico ficam salvos no navegador.

## 3. MoM / ToT / YoY
- Botões rápidos em todo gráfico, com o equivalente certo para cada tipo de série:
  - **Índice e estoque:** variação mensal, trimestre contra trimestre (média de 3 meses contra os 3 anteriores) e variação em 12 meses.
  - **Variação % mensal:** o próprio mês, acumulado em 3 meses e acumulado em 12 meses.
  - **Taxa:** Δ de 1, 3 e 12 meses (p.p.).
  - **Fluxo:** variação mensal, soma de 3 meses contra os 3 anteriores e variação em 12 meses.
- A transformação nova "tot" é testada e tem fórmula.

## 4. Explicações
- **Botão "i" (clique)** em painéis, resumos, fichas da Central e seções de Análises. Cada um explica o que é o dado (indicador, fonte, código, frequência, unidade, observação do catálogo) e, quando há, uma descrição escrita no YAML (`descricao`).
- **Ciclos alinhados:** o tooltip mostra, mês a mês, cada ciclo (período, bps totais, nº de decisões), a Selic naquele mês e a decisão daquele mês. Pontos marcam as decisões. A tabela de ciclos avisa que cada linha abre o detalhe das decisões.

## 5. Estética "mesa de operações"
- Fundo quase preto azulado, painéis com borda fina e sem sombra.
- O dourado fica só para o que está selecionado ou é atual. Verde e vermelho só em variação com sinal.
- Gráficos sem grade de fundo, eixo de valores à direita, etiqueta com o último valor na ponta da linha, mira (crosshair) tracejada e área degradê sob a série principal.
- Números em fonte mono (JetBrains Mono) e interface em Archivo, mais densa.
- A paleta de séries continua a validada; foi conferida de novo contra o fundo novo (#0a1019), passou em tudo.
