# 0015 — Botão "Fórmula" em toda conta mostrada

**Status:** aceita · 2026-10-15 · pedido do dono do projeto

## Contexto
Os gráficos mostram contas: transformações como acumulado, variação e anualizado, séries derivadas como núcleos, juro real e neutro, e as análises (ciclos, hiato, Taylor etc.). Até aqui, só a aba Análises explicava o método, em caixas soltas no fim de cada seção. O dono quer ver, em cada gráfico, como a conta foi feita.

## Decisão
- **Onde o botão aparece.** Todo gráfico ou tabela com conta tem um botão "Fórmula" no rodapé. Ele abre quatro partes:
  - a conta, escrita por extenso;
  - as variáveis, com fonte e código;
  - a metodologia, isto é, as escolhas feitas;
  - as limitações.
- **Nas abas de dados.** A fórmula acompanha a transformação escolhida no menu. Aparece também a de cada série calculada pelo Argus que esteja no gráfico. Dado bruto, sem conta, fica sem o botão.
- **Na aba Análises.** Cada gráfico e tabela tem a sua fórmula. As caixas "Como é calculado" passaram para dentro do botão.
- **Onde ficam os textos.** Num arquivo só, `web/lib/formulas.ts`.
- **Como isso é garantido.** Os testes (`web/tests/formulas.test.ts`) exigem fórmula para:
  - toda transformação oferecida;
  - toda série derivada do pipeline e das abas;
  - toda análise.
  
  Os gráficos da aba Análises não compilam sem fórmula.

## Consequências
- Conta nova sem explicação quebra o build.
- **Se uma conta muda, o texto tem de mudar junto.** A fórmula é escrita à mão, não gerada do código. A revisão de cada mudança em `transform.ts`, `derive/` e nas análises inclui `formulas.ts`.
