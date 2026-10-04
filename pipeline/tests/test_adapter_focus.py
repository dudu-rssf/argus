"""Testes de contrato do adapter Focus (Olinda), com respostas reais de 2026-09-25."""
from datetime import date
from pathlib import Path
from urllib.parse import unquote

import respx

from argus_pipeline.adapters import focus

REAL = Path(__file__).parent / "fixtures" / "real"


def _json(nome):
    return (REAL / nome).read_text(encoding="utf-8")


def test_parse_anuais_usa_ano_de_referencia_como_sub_serie():
    obs = focus.parse(_json("focus_anuais_ipca.json"), "ExpectativasMercadoAnuais")
    assert (date(2026, 9, 25), 4.9915, "2026") in obs
    assert (date(2026, 9, 25), 4.3118, "2027") in obs


def test_parse_selic_usa_reuniao_como_sub_serie():
    obs = focus.parse(_json("focus_selic.json"), "ExpectativasMercadoSelic")
    assert (date(2026, 9, 25), 10.5, "R6/2028") in obs


def test_parse_12_meses_so_suavizada():
    obs = focus.parse(_json("focus_12m.json"), "ExpectativasMercadoInflacao12Meses")
    assert (date(2026, 9, 25), 4.6475) in obs          # suavizada
    assert all(v != 4.7934 for _, v, *resto in obs)    # não suavizada fica de fora


def test_url_com_filtros_e_espacos_em_porcento20():
    url = focus.montar_url("ExpectativasMercadoAnuais · Indicador='IPCA'", date(2026, 7, 1), skip=0)
    assert "+" not in url.split("?", 1)[1]
    u = unquote(url)
    assert "Indicador eq 'IPCA'" in u and "baseCalculo eq 0" in u and "Data ge '2026-07-01'" in u


@respx.mock
def test_fetch_pagina_ate_acabar():
    import json
    pagina = json.loads(_json("focus_selic.json"))["value"]
    respostas = iter([{"value": pagina * 1}, {"value": []}])
    rota = respx.get(url__regex=r".*ExpectativasMercadoSelic.*").mock(
        side_effect=lambda req: __import__("httpx").Response(200, json=next(respostas)))
    obs = focus.fetch("ExpectativasMercadoSelic", None, tamanho_pagina=len(pagina))
    assert rota.call_count == 2
    assert len(obs) == len(pagina)
