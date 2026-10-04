"""Testes do validador de códigos.

As respostas HTTP são simuladas (respx) com o formato documentado de cada fonte.
Na primeira execução real no GitHub Actions, gravar respostas verdadeiras em
tests/fixtures/ e trocar os mocks por elas (decisão 0006).
"""
from datetime import date
from urllib.parse import unquote

import httpx
import pytest
import respx

from argus_pipeline.validate import checks
from argus_pipeline.validate.checks import (
    CheckResult,
    check_fred,
    check_focus,
    check_sgs,
    check_sidra,
    fred_codes,
    is_stale,
)

HOJE = date(2026, 10, 4)


@pytest.fixture
def client():
    with httpx.Client() as c:
        yield c


@pytest.fixture(autouse=True)
def sem_espera(monkeypatch):
    monkeypatch.setattr(checks, "PAUSA_S", 0)


# ---------- SGS ----------

@respx.mock
def test_sgs_titulo_pelo_portal_e_ultima_obs(client):
    respx.get(url__regex=r".*package_search.*").respond(json={
        "success": True,
        "result": {"results": [
            {"name": "114270-outra-serie", "title": "Outra"},
            {"name": "11427-indice-nacional-de-precos", "title": "IPCA - Núcleo por exclusão - EX0"},
        ]},
    })
    respx.get(url__regex=r".*bcdata\.sgs\.11427/dados/ultimos/1.*").respond(
        json=[{"data": "01/08/2026", "valor": "0.31"}]
    )
    r = check_sgs("11427", client)
    assert r.ok
    assert r.titulo_oficial == "IPCA - Núcleo por exclusão - EX0"
    assert r.origem_titulo == "portal"
    assert r.ultima_obs == date(2026, 8, 1)


@respx.mock
def test_sgs_cai_no_soap_quando_portal_nao_acha(client):
    respx.get(url__regex=r".*package_search.*").respond(json={"success": True, "result": {"results": []}})
    respx.post(url__regex=r".*FachadaWSSGS.*").respond(text=(
        '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">'
        "<soapenv:Body><getUltimoValorVOReturn>"
        "<nomeCompleto>Taxa de juros - Meta Selic definida pelo Copom</nomeCompleto>"
        "</getUltimoValorVOReturn></soapenv:Body></soapenv:Envelope>"
    ))
    respx.get(url__regex=r".*bcdata\.sgs\.432/.*").respond(json=[{"data": "18/09/2026", "valor": "14.25"}])
    r = check_sgs("432", client)
    assert r.titulo_oficial == "Taxa de juros - Meta Selic definida pelo Copom"
    assert r.origem_titulo == "soap"


@respx.mock
def test_sgs_codigo_inexistente_vira_erro_sem_inventar_dado(client):
    respx.get(url__regex=r".*package_search.*").respond(json={"success": True, "result": {"results": []}})
    respx.post(url__regex=r".*FachadaWSSGS.*").respond(status_code=500)
    respx.get(url__regex=r".*bcdata\.sgs\.999999/.*").respond(status_code=404)
    r = check_sgs("999999", client)
    assert not r.ok
    assert r.titulo_oficial is None
    assert r.ultima_obs is None
    assert r.erro


# ---------- SIDRA ----------

@respx.mock
def test_sidra_le_nome_e_fim_do_periodo(client):
    respx.get(url__regex=r".*agregados/1621/metadados.*").respond(json={
        "id": 1621,
        "nome": "Série encadeada do índice de volume trimestral com ajuste sazonal",
        "periodicidade": {"frequencia": "trimestral", "inicio": 199601, "fim": 202602},
    })
    r = check_sidra("t1621", client)
    assert r.ok
    assert "ajuste sazonal" in r.titulo_oficial
    assert r.ultima_obs == date(2026, 4, 1)  # 2º trimestre começa em abril


# ---------- Focus ----------

@respx.mock
def test_focus_endpoint_com_filtro_de_indicador(client):
    rota = respx.get(url__regex=r".*ExpectativasMercadoAnuais.*").respond(
        json={"value": [{"Indicador": "IPCA", "Data": "2026-10-02", "Mediana": 4.8}]}
    )
    r = check_focus("ExpectativasMercadoAnuais · Indicador='IPCA'", client)
    assert r.ok
    assert r.ultima_obs == date(2026, 10, 2)
    url = str(rota.calls.last.request.url)
    assert "+" not in url.split("?", 1)[1]  # espaço como %20, nunca '+'
    assert "Indicador eq 'IPCA'" in unquote(url)


# ---------- FRED ----------

@pytest.mark.parametrize("codigo,esperado", [
    ("PAYEMS", ["PAYEMS"]),
    ("JTSJOL / JTSHIL / JTSQUL / JTSLDL", ["JTSJOL", "JTSHIL", "JTSQUL", "JTSLDL"]),
    ("U6RATE + séries LNS140000xx", ["U6RATE"]),
    ("FIXHAI (a confirmar)", ["FIXHAI"]),
    ("DGS1MO…DGS30 / T10Y2Y / T10Y3M", ["DGS1MO", "DGS30", "T10Y2Y", "T10Y3M"]),
])
def test_fred_codes(codigo, esperado):
    assert fred_codes(codigo) == esperado


@respx.mock
def test_fred_com_chave(client):
    respx.get(url__regex=r".*fred/series\?.*").respond(json={
        "seriess": [{"id": "PAYEMS", "title": "All Employees, Total Nonfarm", "observation_end": "2026-09-01"}]
    })
    r = check_fred("PAYEMS", client, api_key="x")
    assert r.titulo_oficial == "All Employees, Total Nonfarm"
    assert r.ultima_obs == date(2026, 9, 1)


def test_fred_sem_chave_nao_quebra(client):
    r = check_fred("PAYEMS", client, api_key=None)
    assert not r.ok
    assert "FRED_API_KEY" in r.erro


# ---------- atualidade ----------

@pytest.mark.parametrize("freq,ultima,esperado", [
    ("Mensal", date(2026, 8, 1), False),
    ("Mensal", date(2026, 3, 1), True),
    ("Diária", date(2026, 9, 30), False),
    ("Diária", date(2026, 8, 1), True),
    ("Trimestral", date(2026, 4, 1), False),
    ("Anual", date(2025, 1, 1), False),
])
def test_is_stale(freq, ultima, esperado):
    assert is_stale(freq, ultima, hoje=HOJE) is esperado


def test_check_result_resumo():
    r = CheckResult(codigo="1", titulo_oficial="X", ultima_obs=date(2026, 9, 1))
    assert r.ok


# ---------- correções após a primeira execução real (2026-10-04) ----------

@respx.mock
def test_sgs_ultima_obs_pelo_soap_quando_api_rest_falha(client):
    """No GitHub Actions, api.bcb.gov.br não resolveu DNS; www3 (SOAP) funcionou."""
    respx.get(url__regex=r".*package_search.*").respond(json={"success": True, "result": {"results": [
        {"name": "433-ipca", "title": "Índice nacional de preços ao consumidor-amplo (IPCA)"}]}})
    respx.get(url__regex=r".*bcdata\.sgs\.433/.*").mock(side_effect=httpx.ConnectError("Name or service not known"))
    respx.post(url__regex=r".*FachadaWSSGS.*").respond(text=(
        '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">'
        "<soapenv:Body><getUltimoValorVOReturn>"
        "<nomeCompleto>Índice nacional de preços ao consumidor-amplo (IPCA)</nomeCompleto>"
        "<ultimoValor><ano>2026</ano><mes>8</mes><dia>1</dia><valor>0.23</valor></ultimoValor>"
        "</getUltimoValorVOReturn></soapenv:Body></soapenv:Envelope>"
    ))
    r = check_sgs("433", client)
    assert r.ok
    assert r.ultima_obs == date(2026, 8, 1)


@respx.mock
def test_sidra_trimestre_movel_e_mensal(client):
    respx.get(url__regex=r".*agregados/6390/metadados.*").respond(json={
        "id": 6390, "nome": "Rendimento médio",
        "periodicidade": {"frequencia": "trimestral móvel", "inicio": 201203, "fim": 202608},
    })
    r = check_sidra("t6390", client)
    assert r.ok
    assert r.ultima_obs == date(2026, 8, 1)


def test_defasagem_normal_do_ibge_nao_e_desatualizada():
    """PMC/PMS de julho divulgadas em setembro: em 4/out ainda são o dado mais recente."""
    assert is_stale("Mensal", date(2026, 7, 1), hoje=HOJE) is False
