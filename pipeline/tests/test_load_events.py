"""Testes da gravação de eventos no Postgres de teste."""
import os
from datetime import date

import pytest

from argus_pipeline import db
from argus_pipeline.adapters.base import Evento
from argus_pipeline.load.events import upsert_events

URL = os.environ.get("TEST_DATABASE_URL")


@pytest.fixture
def conn():
    if not URL:
        pytest.skip("TEST_DATABASE_URL não definida")
    with db.connect(URL) as c:
        with c.cursor() as cur:
            cur.execute("drop schema public cascade; create schema public;")
        c.commit()
        db.apply_migrations(c)
        yield c


def _ev(n, texto="texto", d=date(2026, 9, 16)):
    return Evento(f"copom-ata-{n}", "copom_ata", d, f"{n}ª Reunião", None, texto)


def test_insere_e_nao_duplica(conn):
    assert upsert_events(conn, [_ev(280, d=date(2026, 8, 5)), _ev(281)]) == 2
    assert upsert_events(conn, [_ev(281)]) == 0
    with conn.cursor() as cur:
        cur.execute("select count(*) from events")
        assert cur.fetchone()[0] == 2


def test_texto_revisado_atualiza(conn):
    upsert_events(conn, [_ev(281, "v1")])
    assert upsert_events(conn, [_ev(281, "v2")]) == 1
    with conn.cursor() as cur:
        cur.execute("select texto from events where id='copom-ata-281'")
        assert cur.fetchone()[0] == "v2"

