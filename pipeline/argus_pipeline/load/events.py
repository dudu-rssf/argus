"""Gravação de eventos (comunicados, atas): upsert idempotente na tabela `events`."""
from __future__ import annotations

import psycopg

from argus_pipeline.adapters.base import Evento


def upsert_events(conn: psycopg.Connection, eventos: list[Evento]) -> int:
    """Insere ou atualiza; devolve quantos eventos mudaram (novos ou com texto revisado)."""
    mudou = 0
    with conn.cursor() as cur:
        for e in eventos:
            cur.execute(
                """insert into events (id, tipo, data_ref, titulo, url, texto)
                   values (%s, %s, %s, %s, %s, %s)
                   on conflict (id) do update set
                     tipo = excluded.tipo, data_ref = excluded.data_ref, titulo = excluded.titulo,
                     url = excluded.url, texto = excluded.texto, ingested_at = now()
                   where (events.tipo, events.data_ref, events.titulo, events.url, events.texto)
                         is distinct from
                         (excluded.tipo, excluded.data_ref, excluded.titulo, excluded.url, excluded.texto)
                   returning 1""",
                (e.id, e.tipo, e.data_ref, e.titulo, e.url, e.texto),
            )
            mudou += len(cur.fetchall())
    return mudou

