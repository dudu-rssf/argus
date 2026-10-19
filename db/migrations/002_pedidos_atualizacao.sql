-- Pedidos do botão "Atualizar" (decisão 0018): o site grava um pedido; o relógio (workflow)
-- dispara a coleta e marca o pedido como atendido. Única tabela em que o site escreve.
create table if not exists pedidos_atualizacao (
    id          bigserial primary key,
    pedido_em   timestamptz not null default now(),
    atendido_em timestamptz
);
