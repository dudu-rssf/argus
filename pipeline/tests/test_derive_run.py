"""Séries derivadas lendo do Postgres de teste, pelo orquestrador da coleta."""
import os
from datetime import date

import pytest

from argus_pipeline import db
from argus_pipeline.catalog import Series
from argus_pipeline.collect import run_collection
from argus_pipeline.derive import formulas as f
from argus_pipeline.derive.run import DERIVADAS

URL = os.environ.get("TEST_DATABASE_URL")
HOJE = date(2026, 10, 4)


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


def _s(id, fonte, codigo, status="Verificado", freq="Mensal"):
    return Series(id=id, pais="BR", aba="A", bloco="B", indicador=id, fonte=fonte, codigo=codigo,
                  frequencia=freq, unidade="u", tipo="Taxa", fase="MVP", status=status)


def _q(conn, sql, *a):
    with conn.cursor() as cur:
        cur.execute(sql, a)
        return cur.fetchall()


def _valores(conn, sid):
    return [(d, float(v)) for d, v in _q(conn, "select ref_date, value from observations where series_id=%s order by 1", sid)]


def test_saldo_caged_e_media_dos_nucleos(conn):
    dados = {"28763": [(date(2026, 7, 1), 100.0), (date(2026, 8, 1), 130.0)],
             **{c: [(date(2026, 8, 1), v)] for c, v in zip(["11427", "27839", "4466", "16122", "28750"],
                                                           [0.20, 0.25, 0.18, 0.22, 0.15])}}
    series = [_s("BR-022", "BCB SGS", "28763"), _s("BR-031", "BCB SGS", "11427"),
              _s("BR-034", "BCB SGS", "27839 / 28750"), _s("BR-030", "BCB SGS", "4466"),
              _s("BR-033", "BCB SGS", "16122"),
              _s("BR-133", "Argus", "Δ(28763)", status="Derivado"),
              _s("BR-127", "Argus", "média(...)", status="Derivado")]
    run_id = run_collection(conn, series, {"sgs": lambda cod, desde: dados[cod]}, gatilho="teste",
                            hoje=HOJE, derivadas=DERIVADAS)
    assert _valores(conn, "BR-133:derivado") == [(date(2026, 8, 1), 30.0)]
    assert _valores(conn, "BR-127:derivado") == [(date(2026, 8, 1), pytest.approx(0.20))]
    assert _q(conn, "select status from ingestion_runs where id=%s", run_id)[0][0] == "ok"


def test_juro_real_neutro_e_postura(conn):
    focus_sub = {
        "ExpectativasMercadoAnuais · Indicador='Selic'": [(date(2026, 9, 25), 10.5, "2029")],
        "ExpectativasMercadoAnuais · Indicador='IPCA'": [(date(2026, 9, 25), 3.5, "2029")],
        "ExpectativasMercadoInflacao12Meses · Indicador='IPCA'": [(date(2026, 9, 25), 4.5)],
    }
    series = [_s("BR-050", "BCB SGS", "432", freq="Diária"),
              _s("BR-047", "BCB Olinda (Focus)", "ExpectativasMercadoInflacao12Meses · Indicador='IPCA'", freq="Diária"),
              _s("BR-132", "BCB Olinda (Focus)", "ExpectativasMercadoAnuais · Indicador='Selic'", freq="Semanal"),
              _s("BR-046", "BCB Olinda (Focus)", "ExpectativasMercadoAnuais · Indicador='IPCA'", freq="Semanal"),
              _s("BR-055", "Argus", "f(432, Focus IPCA 12m)", status="Derivado"),
              _s("BR-117", "Argus", "f(Focus)", status="Derivado"),
              _s("BR-118", "Argus", "f(juro real, neutro)", status="Derivado")]
    adapters = {"sgs": lambda cod, desde: [(date(2026, 9, 17), 13.75)],
                "focus": lambda cod, desde: focus_sub[cod]}
    run_collection(conn, series, adapters, gatilho="teste", hoje=HOJE, derivadas=DERIVADAS)
    real = f.fisher(13.75, 4.5)
    neutro = f.fisher(10.5, 3.5)
    assert _valores(conn, "BR-055:derivado") == [(date(2026, 9, 25), pytest.approx(real))]
    assert _valores(conn, "BR-117:derivado") == [(date(2026, 9, 25), pytest.approx(neutro))]
    assert _valores(conn, "BR-118:derivado") == [(date(2026, 9, 25), pytest.approx(real - neutro))]


def test_insumo_ausente_vira_erro_registrado(conn):
    series = [_s("BR-133", "Argus", "Δ(28763)", status="Derivado")]
    run_id = run_collection(conn, series, {}, gatilho="teste", hoje=HOJE, derivadas=DERIVADAS)
    status, erro = _q(conn, "select status, erro from ingestion_items where run_id=%s", run_id)[0]
    assert status == "erro" and "28763" in erro
    assert _q(conn, "select count(*) from observations")[0][0] == 0


def test_p50_pelos_subitens_do_ipca(conn, monkeypatch):
    from argus_pipeline.derive import run
    monkeypatch.setattr(run, "carregar_subitens", lambda: [{"id": "7173"}, {"id": "7175"}, {"id": "7176"}])
    linhas = [(date(2026, 8, 1), v, sub) for v, sub in [
        (0.5, "63.7173"), (-0.2, "63.7175"), (0.1, "63.7176"), (-0.3, "63.7169"),   # 7169 = índice geral
        (30.0, "66.7173"), (40.0, "66.7175"), (30.0, "66.7176"), (100.0, "66.7169")]]
    series = [_s("BR-041", "IBGE SIDRA", "t7060/v63,66/c315=all"),
              _s("BR-128", "Argus", "f(t7060)", status="Derivado")]
    run_collection(conn, series, {"sidra": lambda cod, desde: linhas}, gatilho="teste", hoje=HOJE,
                   derivadas=DERIVADAS)
    # ordenado: -0,2 (40%) -> 0,1 (70%): P50 = 0,1; o índice geral não entra
    assert _valores(conn, "BR-128:derivado") == [(date(2026, 8, 1), 0.1)]
