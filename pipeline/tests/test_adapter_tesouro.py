"""Testes de contrato do adapter do Tesouro (API Séries Temporais do RTN), respostas reais de 2026-10-04."""
from datetime import date
from pathlib import Path

import pytest
import respx

from argus_pipeline.adapters import tesouro
from argus_pipeline.adapters.base import AdapterError

REAL = Path(__file__).parent / "fixtures" / "real"


def _ler(nome):
    return (REAL / nome).read_text(encoding="utf-8")


def test_parse_real():
    obs, n = tesouro.parse(_ler("tesouro_rf_primario_2026.json"), "10.04.1")
    assert (date(2026, 7, 1), 10803.550512866495) in obs
    assert [d for d, _ in obs] == sorted(d for d, _ in obs)
    assert n == len(obs)


def test_historico_real_completo_sem_buraco():
    obs, _ = tesouro.parse(_ler("tesouro_rf_primario_hist.json"), "10.04.1")
    assert obs[0][0] == date(1997, 1, 1) and obs[-1][0] == date(2026, 8, 1)
    assert len(obs) == 356


def test_ignora_outras_series_da_resposta():
    """Resposta do tema inteiro: só a série pedida entra."""
    obs, _ = tesouro.parse(_ler("tesouro_rf_10.json"), "10.01.1")
    assert sorted(obs) == [(date(2026, 6, 1), 251923.53976024996), (date(2026, 7, 1), 275883.9599669101)]


@pytest.mark.parametrize("codigo,tema,serie", [
    ("rtn=10.04.1", "10", "10.04.1"),
    ("rtn=13.1.1", "13", "13.1.1"),
])
def test_codigo(codigo, tema, serie):
    assert tesouro.parse_codigo(codigo) == (tema, serie)


@pytest.mark.parametrize("ruim", ["10.04.1", "rtn=", "rtn=abc", "rtn=11.01.1"])
def test_codigo_invalido(ruim):
    with pytest.raises(AdapterError, match="Tesouro"):
        tesouro.parse_codigo(ruim)


@respx.mock
def test_fetch_monta_parametros():
    rota = respx.get(url__regex=r".*/series-temporais/custom/resultado-fiscal.*").respond(
        text=_ler("tesouro_rf_primario_2026.json"))
    obs = tesouro.fetch("rtn=10.04.1", date(2026, 1, 15))
    p = rota.calls.last.request.url.params
    assert (p["tema"], p["codigo_da_serie"], p["data_inicio"]) == ("10", "10.04.1", "01/2026")
    assert "data_fim" not in p and p.get("correcao_ipca", "false") == "false"
    assert obs[-1] == (date(2026, 7, 1), 10803.550512866495)


@respx.mock
def test_fetch_sem_desde_pede_historico():
    rota = respx.get(url__regex=r".*resultado-fiscal.*").respond(text=_ler("tesouro_rf_primario_hist.json"))
    assert len(tesouro.fetch("rtn=10.04.1", None)) == 356
    assert "data_inicio" not in rota.calls.last.request.url.params


@respx.mock
def test_serie_inexistente_vira_adapter_error():
    respx.get(url__regex=r".*resultado-fiscal.*").respond(text=_ler("tesouro_rf_inexistente.json"))
    with pytest.raises(AdapterError, match="99.99.9"):
        tesouro.fetch("rtn=99.99.9", None)


@respx.mock
def test_pagina_cheia_pede_a_seguinte(monkeypatch):
    monkeypatch.setattr(tesouro, "PAGINA", 3)  # força paginação com a resposta real
    texto = _ler("tesouro_rf_primario_2026.json")
    rota = respx.get(url__regex=r".*resultado-fiscal.*").respond(text=texto)
    with pytest.raises(AdapterError, match="páginas"):
        tesouro.fetch("rtn=10.04.1", date(2026, 1, 1))  # a resposta nunca fica abaixo de 3 itens
    assert rota.call_count == tesouro.MAX_PAGINAS
    assert rota.calls[1].request.url.params["page"] == "2"


@respx.mock
def test_erro_http():
    respx.get(url__regex=r".*resultado-fiscal.*").respond(503, text="fora")
    with pytest.raises(AdapterError, match="503"):
        tesouro.fetch("rtn=10.04.1", None)
