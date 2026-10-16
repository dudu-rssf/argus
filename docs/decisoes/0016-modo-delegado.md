# 0016 — Modo delegado: execução sem aprovação a cada passo, direto no main

**Status:** aceita · 2026-10-15 · pedido do dono do projeto · substitui a regra "código só depois do plano aprovado"

## Contexto
Aprovar cada plano prendia o dono à conversa. Ele quer passar o objetivo, sair e voltar com o trabalho feito. Também dispensou o rascunho separado (branch com prévia): o trabalho é publicado direto.

## Decisão
- O dono passa o objetivo. O plano curto é registrado na spec da tarefa e executado sem esperar aprovação.
- A publicação é no `main`, e a Vercel atualiza o site sozinha.
- Paradas obrigatórias, que continuam pedindo aprovação:
  - ação irreversível (apagar dado do banco, trocar senha ou segredo);
  - dependência nova ainda não aprovada;
  - mudança de rumo (trocar fonte oficial, mudar a arquitetura).
- Ao terminar, um resumo curto do que foi feito.

## Proteções (no lugar da aprovação)
- **Antes de publicar:** testes do pipeline e do site, build e e2e verdes. **Depois:** conferir o CI e o deploy.
- **Se algo publicado quebrar:** reverter o commit primeiro e corrigir depois. O git guarda tudo, então nada se perde.
- **As regras de dados continuam:** catálogo verificado, fixture real, nunca dado inventado e botão Fórmula.
