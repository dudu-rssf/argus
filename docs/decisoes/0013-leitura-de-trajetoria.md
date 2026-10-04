# 0013 — Leitura de trajetória em todo gráfico (curto, médio, longo)

**Status:** aceita · 2026-10-04 · complementa a decisão 0003

## Contexto
O Eduardo quer, além do gráfico, algo para "bater o olho": como o dado está no curto, no médio e no longo prazo. A decisão 0003 diz que o Argus entrega informação, não recomendação, e que interpretação fica na aba Análises.

## Decisão
Abaixo de cada gráfico, uma faixa com três leituras da medida que o gráfico mostra, calculadas por regra fixa (`web/lib/leitura.ts`):

| Horizonte | Regra |
| --- | --- |
| Curto | último valor contra o de 3 meses antes: subiu, caiu ou estável, com a diferença |
| Médio | o mesmo, contra 12 meses antes |
| Longo | posição do último valor nos últimos 10 anos (fração do histórico abaixo dele) e média do período |

- Diferença em pontos (p.p.) para taxas e variações; em % para níveis.
- **Estável:** a diferença é menor que 1/4 do movimento típico daquela série no mesmo horizonte (mediana dos movimentos dos últimos 10 anos). Assim um ruído não vira tendência, e uma crise no histórico não esconde uma queda clara.
- **Sem juízo de valor** (escolha do Eduardo, 2026-10-04): setas neutras em dourado; nada de verde/vermelho nem "melhorou/piorou". Por isso a faixa é informação e cabe em qualquer aba; a 0003 continua valendo.
- Sem histórico suficiente (menos de 24 observações na janela), a leitura não aparece; nunca é estimada.

## Consequências
- Toda aba ganha a faixa automaticamente, sem configuração.
- Um placar por aba ("x de y indicadores subindo") fica possível no futuro com a mesma regra, ainda neutro.
- Se um dia houver cores de bom/ruim, isso exige nova decisão e o sentido de cada série declarado no catálogo.
