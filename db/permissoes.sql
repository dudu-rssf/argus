-- Permissões do usuário do site (argus_site): só leitura, exceto gravar pedidos do botão
-- "Atualizar" em pedidos_atualizacao (decisão 0018).
-- Reaplicado a cada execução (idempotente), porque o usuário é criado no console do Neon
-- e as tabelas novas de migrações futuras também precisam do SELECT.
do $$
begin
    if exists (select 1 from pg_roles where rolname = 'argus_site') then
        grant usage on schema public to argus_site;
        grant select on all tables in schema public to argus_site;
        revoke insert, update, delete, truncate, references, trigger
            on all tables in schema public from argus_site;
        if exists (select 1 from pg_tables where tablename = 'pedidos_atualizacao') then
            grant insert on pedidos_atualizacao to argus_site;
            grant usage on sequence pedidos_atualizacao_id_seq to argus_site;
        end if;
    end if;
end
$$;
