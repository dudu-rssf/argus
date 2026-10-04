"""Testes de contrato do adapter do Copom (API do site do BCB), respostas reais de 2026-10-04."""
from datetime import date
from pathlib import Path

import httpx
import pytest
import respx

from argus_pipeline.adapters import copom
from argus_pipeline.adapters.base import AdapterError

REAL = Path(__file__).parent / "fixtures" / "real"


def _ler(nome):
    return (REAL / nome).read_text(encoding="utf-8")


def test_lista_real_de_comunicados():
    itens = copom.parse_lista(_ler("copom_comunicados_todos.json"), "comunicados")
    assert len(itens) == 236
    assert itens[0] == (281, date(2026, 9, 16))
    assert (46, date(2000, 4, 19)) in itens


def test_lista_real_de_atas():
    assert copom.parse_lista(_ler("copom_atas.json"), "atas")[:2] == [(281, date(2026, 9, 16)), (280, date(2026, 8, 5))]


def test_comunicado_real_vira_evento_em_texto_puro():
    ev = copom.parse_detalhe(_ler("copom_comunicado_det.json"), "comunicados")
    assert ev.id == "copom-comunicado-281"
    assert ev.tipo == "copom_comunicado"
    assert ev.data_ref == date(2026, 9, 16)
    assert ev.titulo == "Copom reduz a taxa Selic para 13,75% a.a."  # espaço duplo da fonte normalizado
    assert ev.texto.startswith("O ambiente externo permanece incerto")
    assert "<" not in ev.texto and "​" not in ev.texto
    assert "\n\n" in ev.texto  # parágrafos preservados
    assert ev.url is None


def test_ata_real_com_tabela_e_pdf():
    ev = copom.parse_detalhe(_ler("copom_ata_det.json"), "atas")
    assert ev.id == "copom-ata-281"
    assert ev.tipo == "copom_ata"
    assert ev.url == "https://www.bcb.gov.br/content/copom/atascopom/Copom281-not20260916281.pdf"
    assert "A) Atualização da conjuntura econômica e do cenário do Copom[1]" in ev.texto
    assert " | " in ev.texto  # células de tabela separadas
    assert "<" not in ev.texto.replace("< ", "")


def test_codigo_invalido():
    with pytest.raises(AdapterError, match="Copom"):
        copom.fetch("notas", None)


@respx.mock
def test_fetch_janela_busca_so_os_detalhes_recentes():
    respx.get(url__regex=r".*/copom/comunicados\?.*").respond(text=_ler("copom_comunicados_todos.json"))
    det = respx.get(url__regex=r".*/copom/comunicados_detalhes\?.*").respond(text=_ler("copom_comunicado_det.json"))
    eventos = copom.fetch("comunicados", date(2026, 9, 1))
    assert [c.request.url.params["nro_reuniao"] for c in det.calls] == ["281"]
    assert [e.id for e in eventos] == ["copom-comunicado-281"]


@respx.mock
def test_detalhe_com_numero_trocado_vira_erro():
    respx.get(url__regex=r".*/copom/atas\?.*").respond(text=_ler("copom_atas.json"))
    respx.get(url__regex=r".*/copom/atas_detalhes\?.*").respond(text=_ler("copom_ata_det.json"))
    with pytest.raises(AdapterError, match="280"):
        copom.fetch("atas", date(2026, 8, 1))  # pede 281 e 280; a fixture devolve sempre a 281


@respx.mock
def test_fora_do_ar():
    respx.get(url__regex=r".*/copom/.*").mock(side_effect=httpx.ConnectError("x"))
    with pytest.raises(AdapterError, match="indisponível"):
        copom.fetch("atas", None)
