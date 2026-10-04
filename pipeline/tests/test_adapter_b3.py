"""Testes de contrato do adapter do Ibovespa (B3, com Yahoo como alternativa), respostas reais de 2026-10-04."""
import base64
import json
from datetime import date
from pathlib import Path

import httpx
import pytest
import respx

from argus_pipeline.adapters import b3
from argus_pipeline.adapters.base import AdapterError

REAL = Path(__file__).parent / "fixtures" / "real"
CODIGO = "indice=IBOV · yahoo=^BVSP"


def _ler(nome):
    return (REAL / nome).read_text(encoding="utf-8")


def _ano_pedido(request) -> int:
    return int(json.loads(base64.b64decode(str(request.url).rsplit("/", 1)[1]))["year"])


@pytest.mark.parametrize("texto,valor", [("187.952,91", 187952.91), ("97,20", 97.2), ("8.961,44", 8961.44)])
def test_numero_brasileiro(texto, valor):
    assert b3.numero(texto) == valor


def test_parse_ano_real():
    obs = b3.parse_ano(_ler("b3_ibov_2026.json"), 2026)
    d = dict(obs)
    assert d[date(2026, 9, 1)] == 179722.48
    assert d[date(2026, 9, 2)] == 185205.09
    assert date(2026, 9, 5) not in d  # sábado: nulo, fica de fora
    assert d[date(2026, 10, 1)] == 187197.46
    assert [x for x, _ in obs] == sorted(x for x, _ in obs)
    assert len(obs) == len(d)


def test_codigo():
    assert b3.parse_codigo(CODIGO) == ("IBOV", "^BVSP")
    with pytest.raises(AdapterError, match="B3"):
        b3.parse_codigo("IBOV")


def test_url_do_ano():
    url = b3.url_ano("IBOV", 2026)
    assert json.loads(base64.b64decode(url.rsplit("/", 1)[1])) == {"index": "IBOV", "language": "pt-br", "year": "2026"}


@respx.mock
def test_fetch_janela_pede_so_os_anos_necessarios():
    rota = respx.get(url__regex=r".*GetPortfolioDay/.*").respond(text=_ler("b3_ibov_2026.json"))
    obs = b3.fetch(CODIGO, date(2026, 9, 1), hoje=date(2026, 10, 4))
    assert [_ano_pedido(c.request) for c in rota.calls] == [2026]
    assert obs[0][0] == date(2026, 9, 1)  # nada antes da janela


@respx.mock
def test_fetch_sem_desde_comeca_em_1998():
    """Antes de mar/1997 o índice teve reescalonamentos (÷10); a série começa em 1998."""
    rota = respx.get(url__regex=r".*GetPortfolioDay/.*").respond(text=_ler("b3_ibov_2026.json"))
    b3.fetch(CODIGO, None, hoje=date(2026, 10, 4))
    anos = [_ano_pedido(c.request) for c in rota.calls]
    assert anos[0] == 1998 and anos[-1] == 2026 and len(anos) == 29


def test_parse_yahoo_real():
    obs = b3.parse_yahoo(_ler("yahoo_bvsp.json"))
    assert obs[-1] == (date(2026, 10, 2), 192115.0)  # data local de São Paulo
    assert all(isinstance(v, float) for _, v in obs)


@respx.mock
def test_b3_fora_usa_yahoo_na_janela():
    respx.get(url__regex=r".*GetPortfolioDay/.*").mock(side_effect=httpx.ConnectError("fora"))
    rota = respx.get(url__regex=r".*finance\.yahoo\.com/v8/finance/chart/.*").respond(text=_ler("yahoo_bvsp.json"))
    obs = b3.fetch(CODIGO, date(2026, 9, 1), hoje=date(2026, 10, 4))
    assert obs[-1] == (date(2026, 10, 2), 192115.0)
    assert rota.calls.last.request.url.params["interval"] == "1d"


@respx.mock
def test_sem_historico_completo_pelo_yahoo():
    """Na primeira carga, o Yahoo não substitui a B3 (o histórico oficial vem só da B3)."""
    respx.get(url__regex=r".*GetPortfolioDay/.*").mock(side_effect=httpx.ConnectError("fora"))
    with pytest.raises(AdapterError, match="B3"):
        b3.fetch(CODIGO, None, hoje=date(2026, 10, 4))


@respx.mock
def test_as_duas_fora_vira_adapter_error():
    respx.get(url__regex=r".*GetPortfolioDay/.*").respond(500)
    respx.get(url__regex=r".*finance\.yahoo\.com.*").respond(429)
    with pytest.raises(AdapterError, match="B3.*Yahoo"):
        b3.fetch(CODIGO, date(2026, 9, 1), hoje=date(2026, 10, 4))
