"""Resumo semanal da coleta, gerado do Postgres de teste."""
import os
from datetime import date

import pytest

from argus_pipeline import db
from argus_pipeline.adapters.base import AdapterError
from argus_pipeline.catalog import Series
from argus_pipeline.collect import run_collection
from argus_pipeline.status import gerar_markdown

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


def _s(id, codigo):
    return Series(id=id, pais="BR", aba="A", bloco="B", indicador=id, fonte="BCB SGS", codigo=codigo,
                  frequencia="Mensal", unidade="%", tipo="Taxa", fase="MVP", status="Verificado")


def test_resumo_mostra_execucoes_fontes_e_falhas_sem_chave(conn):
    def falso(codigo, desde):
        if codigo == "2":
            raise AdapterError("FRED HTTP 500 em https://x?api_key=abcdef0123456789")
        return [(date(2026, 8, 1), 1.0)]

    run_collection(conn, [_s("BR-1", "1"), _s("BR-2", "2")], {"sgs": falso}, gatilho="teste")
    md = gerar_markdown(conn, date.today())
    assert "| teste | parcial | 1 |" in md
    assert "| sgs | 2 | 2026-08-01 |" in md
    assert "`BR-2:2`" in md and "abcdef0123456789" not in md


def test_semana_sem_execucoes(conn):
    md = gerar_markdown(conn, date(2026, 10, 4))
    assert "| — | — | 0 |" in md and "Nenhuma." in md
