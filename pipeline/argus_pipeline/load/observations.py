"""Gravação de observações: upsert idempotente."""
from __future__ import annotations

from datetime import date

import psycopg


def upsert_observations(conn: psycopg.Connection, series_data_id: str, linhas: list[tuple[date, float]]) -> int:
    """Insere ou atualiza; devolve quantas linhas mudaram (novas ou revisadas)."""
    if not linhas:
        return 0
    datas = [d for d, _ in linhas]
    valores = [v for _, v in linhas]
    with conn.cursor() as cur:
        cur.execute(
            """insert into observations (series_id, ref_date, value)
               select %s, d, v from unnest(%s::date[], %s::numeric[]) as t(d, v)
               on conflict (series_id, ref_date) do update
                 set value = excluded.value, ingested_at = now()
                 where observations.value is distinct from excluded.value
               returning 1""",
            (series_data_id, datas, valores),
        )
        return len(cur.fetchall())


def ultima_data(conn: psycopg.Connection, series_data_id: str) -> date | None:
    with conn.cursor() as cur:
        cur.execute("select max(ref_date) from observations where series_id = %s", (series_data_id,))
        return cur.fetchone()[0]
