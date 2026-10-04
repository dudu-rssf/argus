"""Testes de contrato do adapter FRED, com respostas reais gravadas em 2026-10-04."""
from datetime import date
from pathlib import Path

import httpx
import pytest
import respx

from argus_pipeline.adapters import fred
from argus_pipeline.adapters.base import AdapterError

REAL = Path(__file__).parent / "fixtures" / "real"
CHAVE = "abcdef0123456789abcdef0123456789"


def _ler(nome):
    return (REAL / nome).read_text(encoding="utf-8")


def test_parse_mensal_real():
    obs = fred.parse(_ler("fred_obs_PIORECRUSDM.json"))
    assert obs[0] == (date(2025, 1, 1), 103.7826086956522)
    assert obs[1] == (date(2025, 2, 1), 108.2)
    assert all(isinstance(v, float) for _, v in obs)


def test_ponto_do_fred_e_ausencia_e_fica_de_fora():
    obs = dict(fred.parse(_ler("fred_obs_DCOILBRENTEU.json")))
    assert date(2026, 8, 31) not in obs  # feriado em Londres: valor "."
    assert obs[date(2026, 8, 28)] == 89.75
    assert obs[date(2026, 9, 1)] == 96.02


def test_serie_inexistente_vira_adapter_error():
    with pytest.raises(AdapterError, match="does not exist"):
        fred.parse(_ler("fred_obs_inexistente.json"))


@respx.mock
def test_fetch_manda_janela_e_chave(monkeypatch):
    monkeypatch.setenv("FRED_API_KEY", CHAVE)
    rota = respx.get(url__regex=r".*api\.stlouisfed\.org/fred/series/observations.*").respond(
        text=_ler("fred_obs_PIORECRUSDM.json"))
    fred.fetch("PIORECRUSDM", date(2025, 1, 1))
    params = rota.calls.last.request.url.params
    assert params["series_id"] == "PIORECRUSDM"
    assert params["observation_start"] == "2025-01-01"
    assert params["api_key"] == CHAVE


@respx.mock
def test_fetch_sem_desde_nao_manda_inicio(monkeypatch):
    monkeypatch.setenv("FRED_API_KEY", CHAVE)
    rota = respx.get(url__regex=r".*fred/series/observations.*").respond(text=_ler("fred_obs_PIORECRUSDM.json"))
    fred.fetch("PIORECRUSDM", None)
    assert "observation_start" not in rota.calls.last.request.url.params


def test_sem_chave_vira_adapter_error(monkeypatch):
    monkeypatch.delenv("FRED_API_KEY", raising=False)
    with pytest.raises(AdapterError, match="FRED_API_KEY"):
        fred.fetch("PIORECRUSDM", None)


@respx.mock
def test_erro_http_nao_vaza_a_chave(monkeypatch):
    monkeypatch.setenv("FRED_API_KEY", CHAVE)
    respx.get(url__regex=r".*fred/series/observations.*").respond(400, text=_ler("fred_obs_inexistente.json"))
    with pytest.raises(AdapterError) as e:
        fred.fetch("NAOEXISTE123", None)
    assert CHAVE not in str(e.value) and "does not exist" in str(e.value)


@respx.mock
def test_falha_de_rede_nao_vaza_a_chave(monkeypatch):
    monkeypatch.setenv("FRED_API_KEY", CHAVE)
    respx.get(url__regex=r".*fred/series/observations.*").mock(side_effect=httpx.ConnectError("x"))
    with pytest.raises(AdapterError) as e:
        fred.fetch("PIORECRUSDM", None)
    assert CHAVE not in str(e.value)
