"""Testes de contrato do adapter ComexStat (MDIC), com respostas reais gravadas em 2026-10-04."""
import json
from datetime import date
from pathlib import Path

import pytest
import respx

from argus_pipeline.adapters import comexstat
from argus_pipeline.adapters.base import AdapterError

REAL = Path(__file__).parent / "fixtures" / "real"


def _ler(nome):
    return (REAL / nome).read_text(encoding="utf-8")


@pytest.fixture(autouse=True)
def sem_espera(monkeypatch):
    """O adapter espera entre pedidos (limite da API); nos testes, não."""
    esperas = []
    monkeypatch.setattr(comexstat, "_dormir", esperas.append)
    monkeypatch.setattr(comexstat, "_ultimo_pedido", 0.0)
    comexstat._ultima_atualizacao.cache_clear()
    return esperas


# ---------- código do catálogo ----------

@pytest.mark.parametrize("codigo,corpo_filtro", [
    ("fluxo=export", None),
    ("fluxo=import", None),
    ("fluxo=export/pais=160", {"filter": "country", "values": [160]}),
    ("fluxo=export/bloco=22", {"filter": "economicBlock", "values": [22]}),
])
def test_corpo_do_pedido(codigo, corpo_filtro):
    corpo = comexstat.montar_corpo(codigo, "2024-01", "2025-12")
    assert corpo["flow"] == codigo.split("=")[1].split("/")[0]
    assert corpo["monthDetail"] is True
    assert corpo["period"] == {"from": "2024-01", "to": "2025-12"}
    assert corpo["metrics"] == ["metricFOB"]
    assert corpo.get("filters", []) == ([corpo_filtro] if corpo_filtro else [])


@pytest.mark.parametrize("desde,esperado", [
    (None, [("1997-01", "2025-12"), ("2026-01", "2026-08")]),
    (date(2024, 8, 1), [("2024-01", "2025-12"), ("2026-01", "2026-08")]),
    (date(2026, 3, 1), [("2026-01", "2026-08")]),
])
def test_periodos_sem_buraco(desde, esperado):
    assert comexstat.periodos(desde, "2026-08") == esperado


@pytest.mark.parametrize("ruim", ["export", "fluxo=saida", "fluxo=export/estado=SP"])
def test_codigo_invalido(ruim):
    with pytest.raises(AdapterError, match="ComexStat"):
        comexstat.montar_corpo(ruim, "2026-01", "2026-08")


# ---------- normalização ----------

def test_parse_total_real_e_ordena():
    obs = comexstat.parse(_ler("comex_import_total.json"))  # a API devolve fora de ordem
    assert obs == [(date(2026, 6, 1), 26493857835.0), (date(2026, 7, 1), 27158319765.0),
                   (date(2026, 8, 1), 25763862100.0)]


def test_parse_bloco_real():
    assert comexstat.parse(_ler("comex_export_ue.json"))[-1] == (date(2026, 8, 1), 5828954186.0)


def test_periodo_da_api_e_recorte_de_anos_por_meses():
    """Resposta real de '1997-01' a '2026-08': só jan-ago de cada ano (por isso `periodos`)."""
    obs = comexstat.parse(_ler("comex_export_historico.json"))
    assert len(obs) == 30 * 8
    assert {d.month for d, _ in obs} == set(range(1, 9))


def test_limite_de_pedidos_vira_adapter_error():
    with pytest.raises(AdapterError, match="limite"):
        comexstat.parse(_ler("comex_export_vazio.json"))


# ---------- fetch (sem rede) ----------

@respx.mock
def test_fetch_usa_ultimo_mes_publicado(sem_espera):
    respx.get(url__regex=r".*/general/dates/updated$").respond(text=_ler("comex_datas.json"))
    rota = respx.post(url__regex=r".*/general$").respond(text=_ler("comex_export_total.json"))
    obs = comexstat.fetch("fluxo=export", date(2026, 6, 1))
    corpo = json.loads(rota.calls.last.request.content)
    assert corpo["period"] == {"from": "2026-01", "to": "2026-08"}
    assert obs[-1] == (date(2026, 8, 1), 33157804370.0)
    assert obs[0][0] == date(2026, 6, 1)


@respx.mock
def test_fetch_descarta_meses_antes_da_janela():
    respx.get(url__regex=r".*/general/dates/updated$").respond(text=_ler("comex_datas.json"))
    respx.post(url__regex=r".*/general$").respond(text=_ler("comex_export_total.json"))
    assert [d for d, _ in comexstat.fetch("fluxo=export", date(2026, 7, 15))] == [date(2026, 7, 1), date(2026, 8, 1)]


@respx.mock
def test_429_espera_e_tenta_de_novo(sem_espera):
    respx.get(url__regex=r".*/general/dates/updated$").respond(text=_ler("comex_datas.json"))
    respx.post(url__regex=r".*/general$").mock(side_effect=[
        respx.MockResponse(429, text=_ler("comex_export_vazio.json")),
        respx.MockResponse(200, text=_ler("comex_export_total.json")),
    ])
    assert len(comexstat.fetch("fluxo=export", date(2026, 6, 1))) == 3
    assert any(e >= 10 for e in sem_espera)


@respx.mock
def test_429_persistente_vira_adapter_error():
    respx.get(url__regex=r".*/general/dates/updated$").respond(text=_ler("comex_datas.json"))
    respx.post(url__regex=r".*/general$").respond(429, text=_ler("comex_export_vazio.json"))
    with pytest.raises(AdapterError, match="429"):
        comexstat.fetch("fluxo=export", date(2026, 6, 1))
