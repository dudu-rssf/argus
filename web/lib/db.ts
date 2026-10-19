/**
 * Leitura do banco (Neon). Só SELECT, com uma exceção: gravar pedidos do botão "Atualizar"
 * em pedidos_atualizacao (decisão 0018), a única tabela em que o usuário do site escreve.
 * Roda apenas no servidor: a URL do banco nunca chega ao navegador.
 */
import { neon } from "@neondatabase/serverless";
import type { Ponto } from "./transform";

/**
 * Só para os testes de ponta a ponta locais (sem acesso ao Neon): com ARGUS_DB_FIXTURE
 * apontando para um JSON, as consultas leem dele. Nunca é definido na Vercel.
 */
async function fixture(): Promise<Record<string, unknown> | null> {
  const caminho = process.env.ARGUS_DB_FIXTURE;
  if (!caminho) return null;
  const { readFile } = await import("node:fs/promises");
  return JSON.parse(await readFile(caminho, "utf8"));
}

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Banco não configurado: falta DATABASE_URL nas variáveis da Vercel.");
  return neon(url);
}

/** Observações das séries pedidas; com `desde` (AAAA-MM-DD), só a partir dessa data. */
export async function lerSeries(ids: string[], desde = "0001-01-01"): Promise<Record<string, Ponto[]>> {
  if (!ids.length) return {};
  const fx = await fixture();
  if (fx) {
    const series = fx.series as Record<string, [string, number][]>;
    return Object.fromEntries(ids.map((id) => [id, (series[id] ?? []).filter(([data]) => data >= desde).map(([data, valor]) => ({ data, valor }))]));
  }
  const linhas = (await sql()`
    select series_id, to_char(ref_date, 'YYYY-MM-DD') as data, value::float8 as valor
    from observations where series_id = any(${ids}) and ref_date >= ${desde}::date order by series_id, ref_date`) as {
      series_id: string; data: string; valor: number }[];
  const out: Record<string, Ponto[]> = Object.fromEntries(ids.map((id) => [id, []]));
  for (const l of linhas) out[l.series_id].push({ data: l.data, valor: l.valor });
  return out;
}

export type Execucao = {
  id: number; gatilho: string; status: string; iniciado_em: string; terminado_em: string | null;
  ok: number; sem_novidade: number; erro: number;
};

export async function ultimasExecucoes(limite = 15): Promise<Execucao[]> {
  const fx = await fixture();
  if (fx) return (fx.execucoes as Execucao[]).slice(0, limite);
  return (await sql()`
    select r.id::int, r.gatilho, r.status, to_char(r.iniciado_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as iniciado_em, to_char(r.terminado_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as terminado_em,
           count(*) filter (where i.status = 'ok')::int as ok,
           count(*) filter (where i.status = 'sem_novidade')::int as sem_novidade,
           count(*) filter (where i.status = 'erro')::int as erro
    from ingestion_runs r left join ingestion_items i on i.run_id = r.id
    group by r.id order by r.id desc limit ${limite}`) as Execucao[];
}

export type SaudeSerie = {
  series_id: string; catalogo: string; indicador: string; fonte: string; acesso: string;
  ultima_obs: string | null; n: number; ultima_coleta: string | null; status: string | null;
  erro: string | null; ultimo_dado_novo: string | null;
};

/**
 * Uma linha por série de dados coletada (séries-mãe sem dados próprios, que só
 * agrupam sub-séries, ficam de fora). Base da página Saúde dos dados.
 */
export async function saudeDasSeries(): Promise<SaudeSerie[]> {
  const fx = await fixture();
  if (fx) return fx.saude as SaudeSerie[];
  return (await sql()`
    with obs as (
      select series_id, count(*)::int as n, max(ref_date) as ultima from observations group by series_id
    ), ult as (
      select distinct on (i.series_id) i.series_id, i.status, i.erro, i.ultima_data, r.iniciado_em
      from ingestion_items i join ingestion_runs r on r.id = i.run_id
      order by i.series_id, r.id desc
    ), novo as (
      select i.series_id, max(r.iniciado_em) as quando
      from ingestion_items i join ingestion_runs r on r.id = i.run_id
      where i.status = 'ok' group by i.series_id
    )
    select sd.id as series_id, s.id as catalogo, s.indicador, s.fonte, s.acesso,
           to_char(coalesce(o.ultima, ult.ultima_data), 'YYYY-MM-DD') as ultima_obs, coalesce(o.n, 0) as n,
           to_char(coalesce(ult.iniciado_em, ult_mae.iniciado_em) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as ultima_coleta,
           coalesce(ult.status, ult_mae.status) as status,
           coalesce(ult.erro, ult_mae.erro) as erro,
           to_char(coalesce(novo.quando, novo_mae.quando) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as ultimo_dado_novo
    from series_data sd
    join series s on s.id = sd.series_id
    left join obs o on o.series_id = sd.id
    left join ult on ult.series_id = sd.id
    left join ult ult_mae on ult_mae.series_id = split_part(sd.id, '@', 1)
    left join novo on novo.series_id = sd.id
    left join novo novo_mae on novo_mae.series_id = split_part(sd.id, '@', 1)
    where o.n is not null
       or (ult.status is not null
           and not exists (select 1 from series_data x where starts_with(x.id, sd.id || '@')))
    order by s.id, sd.id`) as SaudeSerie[];
}

export async function ultimaAtualizacao(): Promise<{ quando: string | null; falhas: number }> {
  const fx = await fixture();
  if (fx) return fx.ultima as { quando: string | null; falhas: number };
  const [l] = (await sql()`
    select (select to_char(terminado_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') from ingestion_runs
            where status in ('ok', 'parcial') order by id desc limit 1) as quando,
           (select count(*)::int from ingestion_items
            where status = 'erro' and run_id = (select max(id) from ingestion_runs where terminado_em is not null)) as falhas`) as {
      quando: string | null; falhas: number }[];
  return l;
}

export type Evento = { id: string; tipo: string; data_ref: string; titulo: string; url: string | null; texto: string };

/** Últimos eventos de um tipo (ex.: comunicados do Copom), do mais recente para o mais antigo. */
export async function lerEventos(tipo: string, quantidade: number): Promise<Evento[]> {
  const fx = await fixture();
  if (fx) return ((fx.eventos as Evento[] | undefined) ?? []).filter((e) => e.tipo === tipo).slice(0, quantidade);
  return (await sql()`
    select id, tipo, to_char(data_ref, 'YYYY-MM-DD') as data_ref, titulo, url, texto
    from events where tipo = ${tipo} order by data_ref desc, id desc limit ${quantidade}`) as Evento[];
}

export type Divulgacao = {
  series_id: string; data: string; valor: number; anterior_data: string | null; anterior: number | null; quando: string;
};

/**
 * Último dado de cada série que entrou (ou foi revisado) no banco nos últimos `dias`,
 * com o dado anterior para comparação. Base das "Últimas divulgações" da Central.
 */
export async function ultimasDivulgacoes(ids: string[], dias = 7): Promise<Divulgacao[]> {
  if (!ids.length) return [];
  const fx = await fixture();
  if (fx) return ((fx.divulgacoes ?? []) as Divulgacao[]).filter((d) => ids.includes(d.series_id));
  return (await sql()`
    with r as (
      select series_id, ref_date, value::float8 as v, ingested_at,
             row_number() over (partition by series_id order by ref_date desc) as rn
      from observations where series_id = any(${ids})
    )
    select a.series_id, to_char(a.ref_date, 'YYYY-MM-DD') as data, a.v as valor,
           to_char(b.ref_date, 'YYYY-MM-DD') as anterior_data, b.v as anterior,
           to_char(a.ingested_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as quando
    from r a left join r b on b.series_id = a.series_id and b.rn = 2
    where a.rn = 1 and a.ingested_at > now() - make_interval(days => ${dias})
    order by a.ingested_at desc, a.series_id`) as Divulgacao[];
}

// ---------------------------------------------------------------- botão Atualizar sem token (decisão 0018)

export type EstadoPeloBanco = {
  rodando: boolean;
  ultima: { id: number; status: string; iniciado_em: string; terminado_em: string | null } | null;
};

/**
 * Coleta "rodando" se há pedido ainda não atendido, se um pedido foi atendido há menos de
 * 5 minutos e nenhuma coleta começou depois dele (o workflow ainda está subindo), ou se a
 * última execução ainda está em andamento.
 */
export async function estadoPeloBanco(): Promise<EstadoPeloBanco> {
  const fx = await fixture();
  if (fx) {
    const u = (fx.execucoes as Execucao[])[0];
    return { rodando: false, ultima: u ? { id: u.id, status: u.status, iniciado_em: u.iniciado_em, terminado_em: u.terminado_em } : null };
  }
  const [l] = (await sql()`
    with u as (select id, status, iniciado_em, terminado_em from ingestion_runs order by id desc limit 1),
         p as (select max(pedido_em) filter (where atendido_em is null) as pendente,
                      max(atendido_em) as atendido from pedidos_atualizacao)
    select u.id::int, u.status,
           to_char(u.iniciado_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as iniciado_em,
           to_char(u.terminado_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as terminado_em,
           (p.pendente is not null
             or (p.atendido > now() - interval '5 minutes' and (u.iniciado_em is null or u.iniciado_em < p.atendido))
             or u.status = 'rodando') as rodando
    from p left join u on true`) as { id: number | null; status: string | null; iniciado_em: string | null; terminado_em: string | null; rodando: boolean }[];
  return { rodando: !!l?.rodando, ultima: l?.id ? { id: l.id, status: l.status!, iniciado_em: l.iniciado_em!, terminado_em: l.terminado_em } : null };
}

/** Registra um pedido de coleta (um por vez: se já há um pendente, não grava outro). */
export async function registrarPedido(): Promise<void> {
  if (await fixture()) return;
  await sql()`insert into pedidos_atualizacao (pedido_em)
              select now() where not exists (select 1 from pedidos_atualizacao where atendido_em is null)`;
}
