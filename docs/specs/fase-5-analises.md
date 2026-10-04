# Fase 5 — Aba Análises

**Status:** aprovada em 2026-10-04 (escopo: itens 1 a 5, com a seção de ciclos completa) · em andamento

A aba Análises é o único lugar com interpretação (decisão 0003). Por isso cada análise mostra o método na própria página: regra, fontes, limitações.

## Ordem

1. **Ciclos de política monetária** (esta entrega): corte, alta e manutenção desde 1999.
2. **Postura monetária:** juro real ex-ante × neutro implícito no Focus, alinhado por ciclo; estimativas do BC (curadas) depois.
3. **Períodos históricos parecidos com hoje.**
4. **Copom por diretor:** votos e dissidências extraídos das atas e comunicados; tabela curada de diretores.
5. **Regra de Taylor, hiato e NAIRU:** faixa de especificações, com as estimativas do BC e da IFI como referência.

## 1. Ciclos — método

**Fonte da Selic:** meta definida pelo Copom (SGS 432, diária, desde mar/1999). Cada mudança de valor é uma decisão do Copom, na data em que passa a valer.

**Regra dos episódios** (parâmetro único, visível na página):
- **Ciclo de corte / de alta:** começa no primeiro movimento numa direção e reúne os movimentos seguintes na mesma direção, desde que o intervalo entre dois movimentos seja menor que **6 meses**. Termina no último movimento antes de uma inversão ou de uma pausa de 6 meses ou mais.
- **Manutenção:** o intervalo de 6 meses ou mais sem mudança entre dois ciclos (nunca no meio de um ciclo). Pausas menores que 6 meses ficam dentro do ciclo.
- O episódio em curso aparece como "em andamento", com fim em hoje.

**Para cada episódio:**
- início, fim, duração (meses e anos), número de decisões, Selic inicial e final, total em pontos-base, maior movimento;
- métricas no início e no fim, e a variação: IPCA 12 meses, expectativa Focus 12 meses, juro real ex-ante, PIB (taxa anual do trimestre), IBC-Br (variação anual), desocupação, dólar e Ibovespa (variação %);
- depois do fim: dólar, Ibovespa e IPCA 12m 3, 6 e 12 meses adiante.

**Gráfico:** a Selic de cada ciclo alinhada no início (t = 0, em meses), separando cortes e altas, com o ciclo atual destacado.

**Limitações declaradas na página:**
- As métricas usam a data de referência do dado, não a data em que ele foi divulgado (quem decidiu no início do ciclo ainda não conhecia o PIB daquele trimestre).
- Desocupação só existe a partir de 2012 (PNAD Contínua); antes, o campo fica vazio, nunca estimado.
- Ibovespa desde 1998; Focus IPCA 12m desde 2001.

## Critério de pronto (item 1)

- Função de episódios testada com a história real: os ciclos de 2016–2018, 2019–2020, 2021–2022, 2023–2024 e 2024–2025 saem com as datas e os pontos-base corretos.
- Página com tabela, detalhe por episódio e gráfico alinhado, no ar.
