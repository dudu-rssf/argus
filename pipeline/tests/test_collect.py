"""Testes do orquestrador da coleta, com adapters falsos (sem rede)."""
import os
from datetime import date

import pytest

from argus_pipeline import db
from argus_pipeline.adapters.base import AdapterError
from argus_pipeline.catalog import Series
from argus_pipeline.collect import janela_inicio, run_collection

URL = os.environ.get("TEST_DATABASE_URL")
HOJE = date(2026, 10, 4)


def _s(id, codigo, freq="Mensal", fase="MVP", status="Verificado"):
    return Series(id=id, pais="BR", aba="A", bloco="B", indicador=f"Ind {id}", fonte="BCB SGS",
                  codigo=codigo, frequencia=freq, unidade="%", tipo="Taxa", fase=fase, status=status)


def test_janela_inicio():
    assert janela_inicio(None, "Mensal") is None  # primeira carga: histórico completo
    assert janela_inicio(date(2026, 8, 1), "Mensal") == date(2024, 8, 1)
    assert janela_inicio(date(2026, 10, 2), "Diária") == date(2026, 7, 4)


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


def _q(conn, sql, *args):
    with conn.cursor() as cur:
        cur.execute(sql, args)
        return cur.fetchall()


def test_coleta_grava_observacoes_e_registra_execucao(conn):
    def falso(codigo, desde):
        return [(date(2026, 7, 1), 0.26), (date(2026, 8, 1), 0.23)]

    run_id = run_collection(conn, [_s("BR-1", "433")], {"sgs": falso}, gatilho="teste", hoje=HOJE)
    assert _q(conn, "select count(*) from observations")[0][0] == 2
    assert _q(conn, "select status from ingestion_runs where id=%s", run_id)[0][0] == "ok"
    item = _q(conn, "select status, linhas, ultima_data from ingestion_items where run_id=%s", run_id)[0]
    assert item == ("ok", 2, date(2026, 8, 1))


def test_falha_de_uma_fonte_nao_derruba_as_outras(conn):
    def falso(codigo, desde):
        if codigo == "1":
            raise AdapterError("fonte fora do ar")
        return [(date(2026, 8, 1), 1.0)]

    run_id = run_collection(conn, [_s("BR-1", "1"), _s("BR-2", "2")], {"sgs": falso}, gatilho="teste", hoje=HOJE)
    itens = dict(_q(conn, "select series_id, status from ingestion_items where run_id=%s", run_id))
    assert itens == {"BR-1:1": "erro", "BR-2:2": "ok"}
    assert _q(conn, "select status from ingestion_runs where id=%s", run_id)[0][0] == "parcial"
    erro = _q(conn, "select erro from ingestion_items where series_id='BR-1:1'")[0][0]
    assert "fora do ar" in erro


def test_rodar_duas_vezes_nao_duplica_e_marca_sem_novidade(conn):
    def falso(codigo, desde):
        return [(date(2026, 8, 1), 0.23)]

    run_collection(conn, [_s("BR-1", "433")], {"sgs": falso}, gatilho="teste", hoje=HOJE)
    run_id = run_collection(conn, [_s("BR-1", "433")], {"sgs": falso}, gatilho="teste", hoje=HOJE)
    assert _q(conn, "select count(*) from observations")[0][0] == 1
    assert _q(conn, "select status, linhas from ingestion_items where run_id=%s", run_id)[0] == ("sem_novidade", 0)


def test_revisao_de_valor_atualiza(conn):
    valores = iter([0.23, 0.25])

    def falso(codigo, desde):
        return [(date(2026, 8, 1), next(valores))]

    run_collection(conn, [_s("BR-1", "433")], {"sgs": falso}, gatilho="teste", hoje=HOJE)
    run_collection(conn, [_s("BR-1", "433")], {"sgs": falso}, gatilho="teste", hoje=HOJE)
    assert float(_q(conn, "select value from observations")[0][0]) == 0.25


def test_so_coleta_series_mvp_verificadas_com_adapter(conn):
    chamadas = []

    def falso(codigo, desde):
        chamadas.append(codigo)
        return []

    series = [_s("BR-1", "1"), _s("BR-2", "2", fase="v2"), _s("BR-3", "3", status="Confirmar")]
    run_collection(conn, series, {"sgs": falso}, gatilho="teste", hoje=HOJE)
    assert chamadas == ["1"]


def test_segunda_carga_pede_so_a_janela_recente(conn):
    pedidos = []

    def falso(codigo, desde):
        pedidos.append(desde)
        return [(date(2026, 8, 1), 1.0)]

    run_collection(conn, [_s("BR-1", "433")], {"sgs": falso}, gatilho="teste", hoje=HOJE)
    run_collection(conn, [_s("BR-1", "433")], {"sgs": falso}, gatilho="teste", hoje=HOJE)
    assert pedidos == [None, date(2024, 8, 1)]
