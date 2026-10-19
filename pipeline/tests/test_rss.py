"""Adapter de notícias oficiais (RSS/Atom), contra respostas reais gravadas."""
from datetime import date
from pathlib import Path

import pytest

from argus_pipeline.adapters import rss
from argus_pipeline.adapters.base import AdapterError

REAL = Path(__file__).parent / "fixtures" / "real"


def ler(nome: str) -> bytes:
    return (REAL / nome).read_bytes()


@pytest.mark.parametrize("fonte,arquivo", [
    ("bcb_notas", "rss_bcb_notas.xml"), ("bcb_noticias", "rss_bcb_noticias.xml"),
    ("ibge", "rss_ibge.xml"), ("fed", "rss_fed.xml"),
])
def test_parse_feeds_reais(fonte, arquivo):
    evs = rss.parse(ler(arquivo), fonte)
    # a gravação do IBGE foi cortada em ~200 kB pelo gravador de fixtures: só os primeiros itens
    assert len(evs) >= (3 if fonte == "ibge" else 5)
    for e in evs:
        assert e.tipo == "noticia"
        assert e.id.startswith(f"noticia-{fonte}-") and len(e.id) == len(f"noticia-{fonte}-") + 16
        assert e.titulo and "<" not in e.titulo and "&#39;" not in e.titulo
        assert e.url and e.url.startswith("https://")
        assert isinstance(e.data_ref, date)
        assert "<" not in e.texto and len(e.texto) <= 600
    assert len({e.id for e in evs}) == len(evs)


def test_titulo_e_data_do_fed():
    evs = rss.parse(ler("rss_fed.xml"), "fed")
    assert any("FOMC" in e.titulo for e in evs)
    assert evs[0].titulo.startswith("[Fed] ") is False  # a fonte vai no id, não no título


def test_fonte_desconhecida():
    with pytest.raises(AdapterError):
        rss.url_de("nao_existe", 2026)


def test_url_do_bcb_usa_o_ano():
    assert rss.url_de("bcb_notas", 2026).endswith("notasImprensa?ano=2026")
    assert rss.url_de("fed", 2026) == "https://www.federalreserve.gov/feeds/press_monetary.xml"


def test_feed_vazio_ou_quebrado_e_erro():
    with pytest.raises(AdapterError):
        rss.parse(b"<html><body>erro</body></html>", "ibge")
