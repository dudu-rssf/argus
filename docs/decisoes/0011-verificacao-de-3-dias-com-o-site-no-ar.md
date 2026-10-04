# 0011 — Verificação de 3 dias da coleta feita com o site no ar

**Status:** aceita · 2026-10-04 · altera o critério de pronto 1 da Fase 1

## Contexto
A spec da Fase 1 exigia três dias seguidos de coletas agendadas sem falha antes de começar o site. Em 2026-10-04 todas as fontes do MVP já tinham sido carregadas com sucesso em execuções manuais (execuções 1 a 10).

## Decisão
A Fase 2 (site) começa já. A verificação de 3 dias úteis de coleta agendada sem falha passa a ser feita **com o site no ar**, junto com o critério de pronto da Fase 2. Assim a mesma janela testa a coleta, a leitura do banco pelo site e o botão "Atualizar".

## Consequências
- A Fase 1 fica "concluída com verificação pendente"; os passos de código estão prontos.
- Falhas de coleta descobertas nesse período são corrigidas no adapter (CLAUDE.md, regra 5), mesmo com a Fase 2 em andamento.
- A página Data Health do site vira o lugar onde a verificação é acompanhada, além do resumo semanal.
