"""Testes de banco: rodam contra um Postgres de teste (nunca o Neon de produção).

Precisam de TEST_DATABASE_URL; sem ela, são pulados. No CI, um Postgres
temporário é criado pelo GitHub Actions.
"""
import os
from datetime import date

import pytest

from argus_pipeline import db

URL = os.environ.get("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not URL, reason="TEST_DATABASE_URL não definida")


@pytest.fixture
def conn():
    with db.connect(URL) as c:
        with c.cursor() as cur:
            cur.execute("drop schema public cascade; create schema public;")
        c.commit()
        db.apply_migrations(c)
        yield c


def test_migracoes_criam_as_tabelas(conn):
    with conn.cursor() as cur:
        cur.execute("select table_name from information_schema.tables where table_schema='public'")
        tabelas = {r[0] for r in cur.fetchall()}
    assert {"series", "observations", "ingestion_runs", "ingestion_items", "events",
            "schema_migrations"} <= tabelas


def test_migracoes_sao_idempotentes(conn):
    aplicadas = db.apply_migrations(conn)
    assert aplicadas == []  # segunda vez não aplica nada


def test_observacao_exige_serie_existente(conn):
    import psycopg
    with pytest.raises(psycopg.errors.ForeignKeyViolation):
        with conn.cursor() as cur:
            cur.execute("insert into observations(series_id, ref_date, value) values ('NAO-EXISTE', %s, 1)",
                        (date(2026, 1, 1),))
    conn.rollback()


def test_valor_e_numerico_e_data_e_date(conn):
    with conn.cursor() as cur:
        cur.execute("""select column_name, data_type from information_schema.columns
                       where table_name='observations'""")
        tipos = dict(cur.fetchall())
    assert tipos["value"] == "numeric"
    assert tipos["ref_date"] == "date"


def test_usuario_do_site_so_le(conn):
    with conn.cursor() as cur:
        cur.execute("do $$ begin if not exists (select 1 from pg_roles where rolname='argus_site') "
                    "then create role argus_site login; end if; end $$;")
    conn.commit()
    db.apply_migrations(conn)
    with conn.cursor() as cur:
        cur.execute("""select has_table_privilege('argus_site', 'observations', 'select'),
                              has_table_privilege('argus_site', 'observations', 'insert'),
                              has_table_privilege('argus_site', 'events', 'delete')""")
        assert cur.fetchone() == (True, False, False)


def test_sem_usuario_do_site_nao_quebra(conn):
    with conn.cursor() as cur:
        cur.execute("select count(*) from pg_roles where rolname='argus_nao_existe'")
        assert cur.fetchone()[0] == 0
    db.apply_migrations(conn)  # permissões só valem se o usuário existir
