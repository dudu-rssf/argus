# Fase 1, passo 7b — Derivadas do IPCA por subitem (proposta)

**Status:** aprovada em 2026-10-04 · executada, exceto BR-130

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

## Resultado (2026-10-04)

- A Nota Técnica 57 do BCB (dez/2025, Tabela 11) passou a publicar **EX3 Serviços (29683)** e **EX3 Industriais (29684)** no SGS. BR-042 e BR-129 deixaram de ser cálculo próprio e foram verificadas pelo validador.
- A mesma tabela resolve a pendência do EX2: **EX1 = 16121, EX2 = 27838**. BR-032 passou para 27838. As observações antigas de 16121 continuam no banco (nunca são apagadas), mas não pertencem mais ao BR-032.
- **BR-128 (P50):** a NT 57 descreve o P55 como o primeiro subitem cujo peso acumulado atinge 55%, sem suavização. A mesma rotina em 55% reproduz o SGS 28750 em 80 de 80 meses (diferença máxima 0,0). Os subitens vêm de `config/derivadas/ipca_subitens_t7060.yaml`, gerado dos metadados oficiais.
- **BR-130 (serviços intensivos em trabalho):** a NT 57 não traz essa classificação. Fica pendente até existir uma lista curada e aprovada.
