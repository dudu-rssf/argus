"""Adapter do ComexStat (MDIC), `POST /general`.

Código no catálogo: `fluxo=export|import[/pais=<id>|/bloco=<id>]`
(ex.: `fluxo=export/pais=160` = exportações para a China). Valor: FOB mensal em US$.
Atenção: o período da API é um recorte de anos x meses, não um intervalo contínuo
("1997-01" a "2026-08" devolve só jan-ago de cada ano). Por isso o adapter pede os
anos completos (jan-dez) num pedido e o ano corrente (jan até o último mês) em outro.
A API limita a frequência de pedidos (HTTP 429, "tente em 10 segundos"): o adapter
espera entre pedidos e tenta de novo algumas vezes antes de registrar erro.
"""
from __future__ import annotations

import json
import re
import time
from datetime import date
from functools import lru_cache

import httpx

from argus_pipeline.adapters.base import AdapterError, Observacao

BASE = "https://api-comexstat.mdic.gov.br"
UA = {"User-Agent": "argus-coleta/0.1 (projeto pessoal; github.com/dudu-rssf/argus)"}
INICIO = "1997-01"
INTERVALO = 10.5   # segundos entre pedidos
TENTATIVAS = 6

_CODIGO = re.compile(r"^fluxo=(export|import)(?:/(pais|bloco)=(\d+))?$")
_FILTRO = {"pais": "country", "bloco": "economicBlock"}

_dormir = time.sleep
_ultimo_pedido = 0.0


def periodos(desde: date | None, ate: str) -> list[tuple[str, str]]:
    """Recortes que cobrem de `desde` (ou 1997) até `ate` ('AAAA-MM') sem buracos."""
    ano_fim = int(ate[:4])
    ano_ini = desde.year if desde else int(INICIO[:4])
    out = []
    if ano_ini < ano_fim:
        out.append((f"{ano_ini}-01", f"{ano_fim - 1}-12"))
    out.append((f"{ano_fim}-01", ate))
    return out


def montar_corpo(codigo: str, de: str, ate: str) -> dict:
    m = _CODIGO.match(codigo.strip())
    if not m:
        raise AdapterError(f"ComexStat: código inválido no catálogo: {codigo!r} "
                           "(esperado fluxo=export|import[/pais=<id>|/bloco=<id>])")
    fluxo, tipo, valor = m.groups()
    corpo = {"flow": fluxo, "monthDetail": True,
             "period": {"from": de, "to": ate},
             "metrics": ["metricFOB"]}
    if tipo:
        corpo["filters"] = [{"filter": _FILTRO[tipo], "values": [int(valor)]}]
    return corpo


def parse(texto: str) -> list[Observacao]:
    try:
        corpo = json.loads(texto)
        if "error" in corpo:
            raise AdapterError(f"ComexStat: {corpo['error'].get('message')} "
                               f"(código {corpo['error'].get('code')}; limite de pedidos?)")
        obs = [(date(int(x["year"]), int(x["monthNumber"]), 1), float(x["metricFOB"]))
               for x in corpo["data"]["list"]]
    except (ValueError, KeyError, TypeError) as e:
        raise AdapterError(f"ComexStat: resposta inesperada ({type(e).__name__}: {e})") from e
    return sorted(obs)


def _pedir(client: httpx.Client, metodo: str, url: str, **kw) -> str:
    global _ultimo_pedido
    for tentativa in range(TENTATIVAS):
        espera = INTERVALO - (time.monotonic() - _ultimo_pedido)
        if espera > 0:
            _dormir(espera)
        try:
            r = client.request(metodo, url, **kw)
        except httpx.HTTPError as e:
            raise AdapterError(f"ComexStat indisponível ({type(e).__name__})") from e
        finally:
            _ultimo_pedido = time.monotonic()
        if r.status_code == 429 and tentativa < TENTATIVAS - 1:
            _dormir(INTERVALO * (tentativa + 1))  # espera crescente: 10, 21, 31 s...
            continue
        if r.status_code != 200:
            raise AdapterError(f"ComexStat HTTP {r.status_code}: {r.text[:200]}")
        return r.text
    raise AssertionError("inalcançável")


@lru_cache(maxsize=1)
def _ultima_atualizacao() -> str:
    """Último mês publicado ('AAAA-MM'); um pedido por execução."""
    with httpx.Client(timeout=60, headers=UA) as c:
        texto = _pedir(c, "GET", f"{BASE}/general/dates/updated")
    try:
        d = json.loads(texto)["data"]
        return f"{d['year']}-{int(d['monthNumber']):02d}"
    except (ValueError, KeyError, TypeError) as e:
        raise AdapterError(f"ComexStat: data de atualização inesperada ({e})") from e


def fetch(codigo: str, desde: date | None) -> list[Observacao]:
    montar_corpo(codigo, INICIO, INICIO)  # valida o código antes de qualquer pedido
    obs: list[Observacao] = []
    with httpx.Client(timeout=120, headers=UA) as c:
        for de, ate in periodos(desde, _ultima_atualizacao()):
            obs.extend(parse(_pedir(c, "POST", f"{BASE}/general", json=montar_corpo(codigo, de, ate))))
    inicio = desde.replace(day=1) if desde else date.min
    return sorted(o for o in obs if o[0] >= inicio)
