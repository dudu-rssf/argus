# Fase 5 — Aba Análises

**Status:** aprovada em 2026-10-04 (escopo: itens 1 a 5, com a seção de ciclos completa) · em andamento

A aba Análises é o único lugar com interpretação (decisão 0003). Por isso cada análise mostra o método na própria página: regra, fontes, limitações.

## Ordem

1. [x] **Ciclos de política monetária:** corte, alta e manutenção desde 1999.
2. [x] **Postura monetária:** juro real ex-ante × neutro implícito no Focus, alinhado por ciclo; estimativas do BC (curadas) depois.
3. [x] **Períodos históricos parecidos com hoje:** variáveis padronizadas (z-score), distância euclidiana média, variáveis escolhidas na tela; 5 análogos fora dos últimos 24 meses e a 12 meses um do outro; desfecho em 12 meses com mediana.
4. [x] **Copom por diretor** (parte automática; mandato e indicação curados ficam para depois): votos e dissidências extraídos das atas e comunicados; tabela curada de diretores.
5. [x] **Regra de Taylor, hiato e curva de Phillips** (parte automática; estimativas do BC e da IFI curadas ficam para depois): faixa de especificações; NAIRU não estimada (dispersão descritiva).

## 1. Ciclos — método

**Fonte da Selic:** meta definida pelo Copom (SGS 432, diária, desde mar/1999). Cada mudança de valor é uma decisão do Copom, na data em que passa a valer.

**Regra dos episódios** (parâmetro único, visível na página):
- **Ciclo de corte / de alta:** começa no primeiro movimento numa direção e reúne os movimentos seguintes na mesma direção, desde que o intervalo entre dois movimentos seja menor que **6 meses**. Termina no último movimento antes de uma inversão ou de uma pausa de 6 meses ou mais.
- **Manutenção:** todo intervalo sem mudança entre dois ciclos (nunca no meio de um ciclo). Pausas menores que 6 meses entre movimentos na mesma direção ficam dentro do ciclo; entre direções opostas, viram manutenção (ex.: mai–set/2024).
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

## 5. Hiato, Taylor e Phillips — método

**Hiato** sobre 100 × ln(PIB com ajuste sazonal, IBGE t1621, desde 1996), em % do PIB tendencial. Três estimativas:
- HP com a amostra inteira (λ = 1600);
- HP em tempo real (janela crescente, mínimo de 20 trimestres; fica o último ponto de cada janela);
- Hamilton (2018), h = 8, p = 4, regressão com a amostra inteira.

Os três foram conferidos contra o statsmodels 0.15 com o PIB real (6 casas). Ver `web/tests/hiato.test.ts` e `web/tests/fixtures/gerar_hiato_referencia.py`.

**Regra de Taylor:** Selic = r* + π + a·(π − π*) + b·hiato, mês a mês desde dez/2001 (início do Focus 12 meses).
- r*: neutro implícito no Focus (BR-117).
- π: IPCA 12 meses ou Focus 12 meses.
- π*: meta do CMN do ano (BR-134, SGS 13521).
- a, b ∈ {0,5; 1}.
- Hiato: HP ou Hamilton.

São 16 especificações. A página mostra a faixa (menor e maior), a mediana e a Selic efetiva. No mês corrente, os dados são os disponíveis até hoje. Depois do último PIB, vale o último hiato conhecido, e a página avisa.

**Phillips (descritiva, sem reta nem NAIRU):**
- IPCA 12 meses × desocupação, mensal, desde 2012;
- IPCA 12 meses − meta × hiato HP, trimestral, desde 1999.

Pontos por período (1999–2005, 2006–2012, 2013–2019, 2020 em diante), com o último em destaque.

**Conferido com os dados reais do banco** (`web/tests/item5-real.test.ts`, retrato de 15/10/2026):
- meta do CMN de 1999 a 2026 igual à história oficial;
- faixa sem lacunas de dez/2001 a out/2026;
- em out/2026: Selic 13,75% contra uma regra entre 11,07% e 14,35% (mediana 12,34%), com o hiato do 2º tri 2026 (HP −0,42%, Hamilton +1,91%).

**Pendente (curado):** estimativas de hiato e neutro do BC (Relatório de Política Monetária) e da IFI, digitadas com a fonte.
