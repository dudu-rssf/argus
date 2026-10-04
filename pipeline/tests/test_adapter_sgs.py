"""Testes de contrato do adapter SGS, com respostas reais gravadas em 2026-10-04."""
from datetime import date
from pathlib import Path

import httpx
import pytest
import respx

from argus_pipeline.adapters import sgs
from argus_pipeline.adapters.base import AdapterError

REAL = Path(__file__).parent / "fixtures" / "real"


def _ler(nome):
    return (REAL / nome).read_text(encoding="utf-8")


def test_parse_mensal_real():
    obs = sgs.parse_valores_xml(_ler("sgs_xml_433_curto.xml"))
    assert obs[0] == (date(2025, 1, 1), 0.16)
    assert obs[1] == (date(2025, 2, 1), 1.31)
    assert all(isinstance(v, float) for _, v in obs)
    assert [d for d, _ in obs] == sorted(d for d, _ in obs)
    assert len(obs) >= 18  # jan/2025 a pelo menos jun/2026


def test_parse_diaria_real():
    obs = sgs.parse_valores_xml(_ler("sgs_xml_1_curto.xml"))
    assert obs[0] == (date(2026, 9, 1), 5.157)
    assert obs[1] == (date(2026, 9, 2), 5.1273)


def test_codigo_inexistente_vira_adapter_error():
    with pytest.raises(AdapterError, match="999999 not found"):
        sgs.parse_valores_xml(_ler("sgs_xml_inexistente.xml"))


@pytest.mark.parametrize("texto,esperado", [
    ("1/2025", date(2025, 1, 1)),
    ("12/2025", date(2025, 12, 1)),
    ("1/9/2026", date(2026, 9, 1)),
    ("31/12/2025", date(2025, 12, 31)),
    ("2025", date(2025, 1, 1)),
])
def test_parse_data(texto, esperado):
    assert sgs.parse_data(texto) == esperado


@respx.mock
def test_fetch_usa_soap_com_janela():
    rota = respx.post(url__regex=r".*FachadaWSSGS.*").respond(text=_ler("sgs_xml_433_curto.xml"))
    obs = sgs.fetch("433", date(2025, 1, 1))
    corpo = rota.calls.last.request.content.decode()
    assert "<item xsi:type=\"xsd:long\">433</item>" in corpo
    assert "01/01/2025" in corpo
    assert obs[0] == (date(2025, 1, 1), 0.16)


@respx.mock
def test_fetch_sem_desde_pede_historico_completo():
    rota = respx.post(url__regex=r".*FachadaWSSGS.*").respond(text=_ler("sgs_xml_433_curto.xml"))
    sgs.fetch("433", None)
    assert "01/01/1900" in rota.calls.last.request.content.decode()


@respx.mock
def test_soap_fora_do_ar_cai_na_api_rest():
    respx.post(url__regex=r".*FachadaWSSGS.*").mock(side_effect=httpx.ConnectError("fora"))
    respx.get(url__regex=r".*bcdata\.sgs\.433/dados.*").respond(
        json=[{"data": "01/07/2026", "valor": "0.26"}, {"data": "01/08/2026", "valor": "0.23"}])
    obs = sgs.fetch("433", date(2026, 7, 1))
    assert obs == [(date(2026, 7, 1), 0.26), (date(2026, 8, 1), 0.23)]


@respx.mock
def test_as_duas_vias_fora_vira_adapter_error():
    respx.post(url__regex=r".*FachadaWSSGS.*").mock(side_effect=httpx.ConnectError("fora"))
    respx.get(url__regex=r".*bcdata\.sgs.*").mock(side_effect=httpx.ConnectError("dns"))
    with pytest.raises(AdapterError, match="soap.*rest"):
        sgs.fetch("433", date(2026, 7, 1))
