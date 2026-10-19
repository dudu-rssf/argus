# 0018 — Relógio próprio para a coleta e botão "Atualizar" sem token

**Status:** aceita · 2026-10-19 · complementa a 0008

## Contexto
O agendamento (cron) do GitHub Actions atrasou de 1 a 3 horas e pulou execuções: na sexta 16/10 rodaram 4 das 5 coletas, e na segunda 19/10 nenhuma das três primeiras tinha rodado às 11h. O botão "Atualizar" dependia de um token do GitHub na Vercel, que o dono teria de criar à mão.

## Decisão
- **Workflow "Relógio"** (`.github/workflows/relogio.yml`, `pipeline/argus_pipeline/relogio.py`): fica rodando ~5h45 e, a cada minuto, dispara a Coleta quando um horário da decisão 0008 venceu (há menos de 3 h) e nenhuma coleta começou depois dele. Ao terminar, chama a si mesmo; o cron de hora em hora só religa a corrente se ela se romper. Usa o token automático do próprio workflow (`actions: write`), sem segredo novo.
- A Coleta deixa de ter cron próprio (evita execuções duplicadas).
- **Botão "Atualizar" sem token:** o site grava uma linha em `pedidos_atualizacao`; o Relógio dispara a coleta em até 1 minuto e marca o pedido como atendido. É a única tabela em que o usuário do site (`argus_site`) escreve (só INSERT). Com `GITHUB_TOKEN` na Vercel, o caminho antigo continua valendo.

## Consequências
- Coletas no horário com atraso de até ~1 minuto, enquanto o GitHub Actions estiver de pé.
- O repositório é público: minutos de Actions são gratuitos, inclusive o relógio rodando o dia todo.
- Se o Relógio cair e o cron também falhar, a coleta para; a página Saúde dos dados mostra a última coleta, e o resumo semanal registra.
