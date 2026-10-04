# Fase 1, passo 7b — Derivadas do IPCA por subitem (proposta)

**Status:** proposta · 2026-10-04 · aguarda aprovação antes do código

## O que já está pronto (passo 7a)

Calculadas a cada coleta, a partir do banco, com teste contra valor conhecido:

| ID | Série | Fórmula |
| --- | --- | --- |
| BR-127 | Média dos 5 núcleos do Copom | média simples de EX0, EX3, MS, DP e P55, só nos meses com os cinco |
| BR-133 | Saldo do Novo CAGED | variação do estoque (28763) entre meses consecutivos |
| BR-055 | Juro real ex-ante | Selic meta vigente na data do Focus, deflacionada pelo IPCA 12 meses do Focus (Fisher) |
| BR-117 | Juro neutro implícito no Focus | Selic e IPCA esperados para o ano t+3 na mesma pesquisa (Fisher) |
| BR-118 | Postura monetária | juro real ex-ante − neutro implícito, na mesma data |

## O que falta e por que precisa de aprovação

Quatro séries dependem de **listas de subitens** do IPCA. Essas listas são escolhas metodológicas; não posso inventá-las.

| ID | Série | Lista necessária |
| --- | --- | --- |
| BR-128 | Mediana ponderada (P50) | nenhuma: todos os subitens (nível 4 da tabela 7060) |
| BR-129 | Bens industriais subjacentes | subitens industriais do BCB, sem os voláteis |
| BR-042 | Serviços subjacentes | subitens de serviços do BCB, sem os voláteis e os sujeitos a indexação |
| BR-130 | Serviços intensivos em trabalho | subitens de serviços com alto peso de mão de obra |

## Proposta

1. **Fonte das listas:** transcrever do BCB, não montar por conta própria.
   - Serviços e industriais subjacentes: boxe do Relatório de Inflação de jun/2018 e atualizações posteriores (Nota Técnica 57, dez/2025, a conferir).
   - Serviços intensivos em trabalho: classificação publicada pelo BCB em Relatório de Inflação. Se não houver lista oficial, a série fica como `Curado` com a lista e a justificativa de cada subitem documentadas, e você aprova a lista.
2. **Onde ficam:** `config/derivadas/ipca_classificacao.yaml`, com código e nome de cada subitem e o documento de origem. É configuração, não código (CLAUDE.md, arquitetura).
3. **Agregação:** média ponderada das variações mensais dos subitens do grupo, com os pesos do próprio mês (variável 66 da tabela 7060), renormalizados dentro do grupo: Σ(peso × variação) / Σ peso.
4. **P50:** subitens ordenados pela variação do mês; o valor é o do subitem em que o peso acumulado chega a 50%.
   - **Validação do método:** a mesma rotina no percentil 55 deve reproduzir o núcleo oficial P55 (SGS 28750). Se não reproduzir, eu aviso antes de publicar.
5. **Validação das listas:** cada grupo precisa reproduzir algum número publicado pelo BCB (RI/RPM) com diferença de até 0,01 p.p. Sem isso, a série não entra.
6. **Histórico:** a tabela 7060 começa em jan/2020. Antes disso os subitens mudam de código (POF 2008 e 2002, tabelas 1419 e 2938). **MVP a partir de 2020**; emendar o histórico fica para a v2.

## Fora deste passo

- **BR-116, ciclos do Copom:** o catálogo já pede uma spec metodológica própria (o que define início e fim de ciclo, e quais ativos e janelas). Proponho fazê-la na fase da aba Análises.
- **BR-097, massa salarial e consumo:** não há cálculo. É um painel que junta séries já coletadas (BR-020 e BR-004), então fica para o site.

## Perguntas para aprovação

1. Pode seguir com as listas transcritas do BCB e a validação acima?
2. Histórico das quatro séries só a partir de 2020 no MVP: ok?
