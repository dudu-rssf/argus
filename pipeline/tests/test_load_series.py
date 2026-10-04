"""Testes do espelho do catálogo no banco."""
import os

import pytest

from argus_pipeline import db
from argus_pipeline.catalog import Series
from argus_pipeline.load.series import data_codes, sync_catalog

URL = os.environ.get("TEST_DATABASE_URL")


def _s(id, fonte, codigo, status="Verificado", indicador="Ind"):
    return Series(id=id, pais="BR", aba="Inflação", bloco="B", indicador=indicador, fonte=fonte,
                  codigo=codigo, frequencia="Mensal", unidade="%", tipo="Taxa", fase="MVP", status=status)


@pytest.mark.parametrize("serie,esperado", [
    (_s("BR-1", "BCB SGS", "20539 / 20541"), ["20539", "20541"]),
    (_s("BR-2", "IBGE SIDRA", "t5944 / t6379"), ["t5944", "t6379"]),
    (_s("BR-3", "BCB Olinda (Focus)", "ExpectativasMercadoAnuais · Indicador='IPCA'"),
     ["ExpectativasMercadoAnuais · Indicador='IPCA'"]),
    (_s("BR-4", "FRED", "PIORECRUSDM / DCOILBRENTEU"), ["PIORECRUSDM", "DCOILBRENTEU"]),
    (_s("BR-5", "Argus", "média(11427, 27839)", status="Derivado"), ["derivado"]),
    (_s("BR-6", "FGV IBRE", "—", status="Sem API"), []),
])
def test_data_codes(serie, esperado):
    assert data_codes(serie) == esperado


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


def _contar(conn, tabela):
    with conn.cursor() as cur:
        cur.execute(f"select count(*) from {tabela}")
        return cur.fetchone()[0]


def test_sync_insere_series_e_series_de_dados(conn):
    sync_catalog(conn, [_s("BR-1", "BCB SGS", "20539 / 20541"), _s("BR-6", "FGV IBRE", "—", status="Sem API")])
    assert _contar(conn, "series") == 2
    assert _contar(conn, "series_data") == 2  # só BR-1 tem códigos coletáveis


def test_sync_e_idempotente_e_atualiza_nome(conn):
    sync_catalog(conn, [_s("BR-1", "BCB SGS", "433", indicador="Antigo")])
    sync_catalog(conn, [_s("BR-1", "BCB SGS", "433", indicador="Novo")])
    assert _contar(conn, "series") == 1
    with conn.cursor() as cur:
        cur.execute("select indicador from series where id='BR-1'")
        assert cur.fetchone()[0] == "Novo"


def test_sync_nao_apaga_observacoes_existentes(conn):
    sync_catalog(conn, [_s("BR-1", "BCB SGS", "433")])
    with conn.cursor() as cur:
        cur.execute("insert into observations(series_id, ref_date, value) values ('BR-1:433', '2026-08-01', 0.23)")
    conn.commit()
    sync_catalog(conn, [_s("BR-1", "BCB SGS", "433")])
    assert _contar(conn, "observations") == 1
