-- 001 — Estrutura inicial do Argus (Fase 1)
-- Datas em DATE (ISO), valores em NUMERIC, textos em UTF-8 (CLAUDE.md, regra 6).

create table series (
    id           text primary key,          -- ID do catálogo, ex.: BR-025
    pais         text not null,
    aba          text not null,
    bloco        text not null,
    indicador    text not null,
    fonte        text not null,
    codigo       text not null,             -- código/endpoint como no catálogo
    frequencia   text not null,
    unidade      text not null,
    tipo         text not null,
    fase         text not null,
    status       text not null,
    acesso       text not null,             -- sgs, sidra, focus, fred, derivado...
    atualizado_em timestamptz not null default now()
);

-- Uma série do catálogo pode reunir vários códigos da fonte (ex.: saldo total, PF e PJ).
-- Cada código coletado vira uma "série de dados" própria.
create table series_data (
    id           text primary key,          -- ex.: BR-062:20541
    series_id    text not null references series(id) on delete cascade,
    codigo_fonte text not null,
    titulo_oficial text
);

create table observations (
    series_id    text not null references series_data(id) on delete cascade,
    ref_date     date not null,
    value        numeric not null,
    ingested_at  timestamptz not null default now(),
    primary key (series_id, ref_date)
);

create table ingestion_runs (
    id           bigserial primary key,
    gatilho      text not null check (gatilho in ('agenda', 'botao', 'manual', 'teste')),
    iniciado_em  timestamptz not null default now(),
    terminado_em timestamptz,
    status       text not null default 'rodando' check (status in ('rodando', 'ok', 'parcial', 'erro'))
);

create table ingestion_items (
    run_id       bigint not null references ingestion_runs(id) on delete cascade,
    series_id    text not null references series_data(id) on delete cascade,
    status       text not null check (status in ('ok', 'sem_novidade', 'erro')),
    linhas       integer not null default 0,
    ultima_data  date,
    erro         text,
    primary key (run_id, series_id)
);

create table events (
    id           text primary key,          -- ex.: copom-comunicado-281
    tipo         text not null,
    data_ref     date not null,
    titulo       text not null,
    url          text,
    texto        text,
    ingested_at  timestamptz not null default now()
);

create index observations_series_date on observations (series_id, ref_date desc);
create index ingestion_items_series on ingestion_items (series_id, run_id desc);
