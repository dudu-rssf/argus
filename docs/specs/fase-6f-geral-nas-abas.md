# Fase 6f — Seção Geral em todas as abas do Brasil

**Status:** no ar (2026-10-16). Pedido do dono: aplicar nas outras abas o formato aprovado na Inflação (6d + 6e).

## Formato (igual ao da Inflação)
Frase-resumo · relógio do ciclo · perguntas rápidas com "Ver mais" (explicação, minigráficos, números) · decomposição com prazos de 3/6/9/12 meses e "?" com influências típicas · bloco de forças · períodos parecidos (frase, trajetórias, cartões com contexto da época).

## Motor comum
- `web/lib/geral/motor.ts`: tipos e funções puras (decomposição por prazo, parecidos, fórmulas-padrão).
- `web/lib/geral/abas/<aba>.ts`: séries, regras e textos de cada aba; `index.ts` registra.
- `web/components/geral/geral-aba.tsx`: visual genérico. A Inflação mantém o visual próprio.

## Por aba
| Aba | Relógio | Decomposição | Forças |
| --- | --- | --- | --- |
| Atividade | IBC-Br 12m × média de 10 anos | quem acelera e quem freia (PIM, PMC, PMS, IBC-Br; não aditiva) | demanda do PIB |
| Mercado de Trabalho | desocupação × média de 10 anos, direção em 12 meses (PNAD sem ajuste sazonal) | mudança da desocupação = ocupação + participação (exata) | renda, CAGED, informalidade |
| Política Monetária | juro real − neutro implícito × zero | mudança do juro real = Selic + expectativa (Fisher, exata) | crédito |
| Fiscal | resultado primário 12m × zero (NFSP com sinal trocado) | déficit nominal = primário por esfera + juros | dívida, juros, receita e despesa |
| Setor Externo | conta corrente % PIB × média de 10 anos | exportações por destino (China, EUA, UE, resto) | câmbio e commodities |
| Famílias | comprometimento de renda × média de 10 anos | crédito por modalidade (contribuição ao crescimento) | renda, dívida, consumo |

## Conferência
- `web/tests/geral-abas-real.test.ts` roda cada aba com o retrato real exportado (`web/tests/fixtures/abas.json`, workflow Exportar dados de conferência) e exige: perguntas respondidas, Ver mais preenchido, decomposição, forças e 5 períodos parecidos.
- Sinais conferidos nos dados: NFSP positivo = déficit (primário + juros = nominal); câmbio real efetivo mais alto = real mais fraco; taxa de desocupação recalculada por participação e ocupação bate com a divulgada.
- e2e: cada aba abre na Geral, Ver mais abre com gráfico, prazo de 12 meses funciona.
