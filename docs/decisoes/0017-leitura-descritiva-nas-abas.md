# 0017 — Frases de leitura descritiva também nas abas de dados

**Status:** aceita · 2026-10-15 · pedido do dono · ajusta a decisão 0003 (interpretação só na aba Análises)

## Contexto
Com 10 a 12 gráficos por aba, o site virava "um mar de dados". O dono quer as abas mais digeridas: cada número com contexto e uma frase que diga o que aconteceu.

## Decisão
- **O que pode nas abas de dados:** frases de **descrição por regra fixa**, cada uma com fórmula:
  - subiu ou caiu, e quanto;
  - há quantos meses seguidos;
  - onde está contra a meta, contra a média e o percentil de 10 anos;
  - "maior/menor desde".
- **O que continua só na aba Análises:** julgamento ("bom", "ruim", "preocupante"), causa ("por causa de"), previsão e recomendação.
- **Como o texto é feito:** é gerado de um conjunto fechado de fatos, testados. O botão Fórmula mostra as regras.

## Consequências
- O texto pode soar repetitivo: a regra é a mesma para todo indicador. É o preço de ser auditável.
- **Escolha de formato:** quatro formatos de aba são prototipados na aba Inflação para o dono escolher um (spec fase-6c). O escolhido é replicado.
