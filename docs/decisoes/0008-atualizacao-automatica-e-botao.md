# 0008 — Atualização automática várias vezes ao dia e botão "Atualizar"

**Status:** aceita · 2026-10-04

## Contexto
O site precisa estar sempre atualizado sem intervenção, e o Eduardo quer poder forçar uma atualização completa a qualquer momento. A decisão 0001 proíbe o site de chamar fontes de dados diretamente.

## Decisão

**Coleta agendada.** O workflow de coleta (Fase 1) roda no GitHub Actions em horários próximos às divulgações, em horário de Brasília:

| Horário (BRT) | Motivo |
| --- | --- |
| 08:45 | Focus (segunda), divulgações do BCB às 8h30 |
| 09:30 | IBGE (9h) |
| 12:30 | Câmbio e juros do meio do dia |
| 15:30 | Divulgações vespertinas, EUA (10h ET) |
| 19:30 | Fechamento de mercado, PTAX, reservas |

Cada execução busca só o que é novo (carga incremental) e registra o resultado em `ingestion_runs`.

**Botão "Atualizar" no site.** O botão chama uma rota do próprio site (servidor, nunca o navegador), que dispara o mesmo workflow pela API do GitHub (`workflow_dispatch`). O site acompanha o status da execução e, ao terminar, recarrega as páginas com os dados novos (≈1–3 min).

- O site fala com o **GitHub**, não com as fontes de dados: a regra da decisão 0001 continua valendo.
- Token do GitHub com permissão mínima (só `actions: write` no repositório `argus`), guardado na Vercel, nunca no navegador.
- Uma execução por vez (`concurrency` no workflow); clique durante uma execução em andamento mostra o progresso em vez de disparar outra.
- O botão fica ao lado da hora da última atualização bem-sucedida e do aviso de fontes que falharam.

## Consequências
- Dados diários ou mensais não mudam entre execuções; o ganho do botão é capturar uma divulgação no minuto em que sai.
- Cinco execuções diárias de poucos minutos cabem na cota gratuita do GitHub Actions; conferir consumo na Fase 1.
- Atividade contínua do workflow não impede o desligamento após 60 dias sem commits (decisão 0007); a proteção é definida na Fase 1.
