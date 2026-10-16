# Fase 6c — Abas mais digeridas: quatro protótipos na Inflação

**Status:** em andamento (2026-10-15, modo delegado). O dono escolhe um formato, que depois é replicado nas outras abas e na Central.

## Base comum
- **Fatos por regra** (`web/lib/fatos.ts`, testado), calculados para cada medida:
  - último valor e Δ de 1, 3 e 12 meses;
  - meses seguidos na mesma direção;
  - percentil e média de 10 anos;
  - "maior/menor desde" (só quando passa de 12 meses);
  - distância da meta.
- **Frase gerada só desses fatos** (decisão 0017), com fórmula.
- **Medidas da Inflação:**
  - IPCA (mês e 12 meses) e meta;
  - serviços, bens industriais, alimentação no domicílio, livres, monitorados;
  - média dos 5 núcleos, mediana ponderada, serviços e industriais subjacentes, difusão;
  - Focus 12 meses e IGP-M.

## Os quatro formatos (menu "Protótipos")
- **A. Perguntas.** Quatro perguntas:
  - A inflação está convergindo para a meta?
  - O que está puxando?
  - A inflação de fundo está melhorando?
  - O que o mercado espera?

  Cada uma tem a frase, um gráfico principal com a referência e "Aprofundar" (fechado) com os detalhes.
- **B. Sinais.** Uma tabela única, como num terminal:
  - colunas: último, Δ 1m/3m/12m, percentil de 10 anos (com barra), distância da meta, sequência e minicurva;
  - clicar numa linha abre o gráfico;
  - no topo, a contagem ("9 de 14 medidas caíram em 3 meses").
- **C. Briefing.** Leitura primeiro: as 5 frases mais relevantes do momento, ordenadas pelo tamanho do movimento contra o típico, por extremos e por sequências longas. Cada frase tem minicurva e link. Depois, a tabela curta dos números do mês e dois gráficos.
- **D. Mapa.**
  - Cada medida vira um ponto: no eixo horizontal, a distância da meta; no vertical, a variação em 3 meses. Um rastro mostra os últimos 6 meses.
  - Os quadrantes têm nomes neutros: "acima da meta e subindo" etc.
  - Embaixo, a lista por quadrante; clicar abre o gráfico.

## Critério de pronto
Os quatro no ar, com testes e e2e, para o dono comparar.
