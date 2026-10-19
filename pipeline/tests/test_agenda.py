"""Agenda de divulgações do IBGE (API de calendário), contra resposta real gravada."""
from datetime import date
from pathlib import Path

import pytest

from argus_pipeline.adapters import agenda
from argus_pipeline.adapters.base import AdapterError

REAL = Path(__file__).parent / "fixtures" / "real"


def test_parse_calendario_real():
    evs = agenda.parse((REAL / "ibge_calendario_janela.json").read_bytes())
    nomes = {e.titulo for e in evs}
    assert {"IPCA", "IPCA-15", "PIB trimestral", "Desemprego (PNAD Contínua)"} <= nomes
    # só os indicadores acompanhados; nada de produtos que o Argus não usa
    assert all(e.titulo in {v[0] for v in agenda.PRODUTOS.values()} for e in evs)
    ipca = sorted((e for e in evs if e.titulo == "IPCA"), key=lambda e: e.data_ref)
    assert ipca[0].data_ref == date(2026, 11, 12) and ipca[0].texto == "Referência: out/2026"
    pib = next(e for e in evs if e.titulo == "PIB trimestral")
    assert pib.texto == "Referência: 3º tri/2026"
    pnad = next(e for e in evs if e.titulo.startswith("Desemprego"))
    assert pnad.texto.startswith("Referência: trimestre até ")
    for e in evs:
        assert e.tipo == "agenda" and e.id.startswith("agenda-ibge-")
        assert e.texto.startswith("Referência: ")


def test_ordenavel_e_sem_repetidos():
    evs = agenda.parse((REAL / "ibge_calendario_janela.json").read_bytes())
    assert len({e.id for e in evs}) == len(evs)


def test_resposta_invalida():
    with pytest.raises(AdapterError):
        agenda.parse(b"<html>erro</html>")
