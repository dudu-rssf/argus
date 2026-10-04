"""Adapter do Focus (BCB Olinda, OData).

Guarda a mediana, base de cálculo 0 (todas as respostas dos últimos 30 dias).
Sub-séries: ano de referência (anuais) e reunião do Copom (Selic).
Para expectativas em 12 meses, só a série suavizada.
"""
from __future__ import annotations

import json
import re
from datetime import date
from urllib.parse import quote, urlencode

import httpx

from argus_pipeline.adapters.base import AdapterError, Observacao

BASE = "https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/{endpoint}"
UA = {"User-Agent": "argus-coleta/0.1 (projeto pessoal; github.com/dudu-rssf/argus)"}
PAGINA = 10000

_SUB = {"ExpectativasMercadoAnuais": "DataReferencia", "ExpectativasMercadoSelic": "Reuniao"}


def _endpoint_e_filtros(codigo: str) -> tuple[str, list[str]]:
    endpoint, _, resto = codigo.partition("·")
    filtros = []
    for f in [x.strip() for x in resto.split(";") if x.strip()]:
        m = re.match(r"(\w+)='(.+)'$", f)
        if not m:
            raise AdapterError(f"Focus: filtro inválido no catálogo: {f!r}")
        filtros.append(f"{m.group(1)} eq '{m.group(2)}'")
    return endpoint.strip(), filtros


def montar_url(codigo: str, desde: date | None, skip: int, tamanho: int = PAGINA) -> str:
    endpoint, filtros = _endpoint_e_filtros(codigo)
    filtros.append("baseCalculo eq 0")
    if endpoint == "ExpectativasMercadoInflacao12Meses":
        filtros.append("Suavizada eq 'S'")
    if desde:
        filtros.append(f"Data ge '{desde.isoformat()}'")
    params = {"$format": "json", "$top": str(tamanho), "$skip": str(skip),
              "$orderby": "Data asc", "$filter": " and ".join(filtros)}
    # OData do BCB: espaço como %20 e '$' literal (httpx usaria '+' e '%24')
    return BASE.format(endpoint=endpoint) + "?" + urlencode(params, quote_via=quote, safe="$'")


def parse(texto: str, endpoint: str) -> list[Observacao]:
    try:
        valores = json.loads(texto)["value"]
    except (ValueError, KeyError) as e:
        raise AdapterError(f"Focus: resposta inesperada ({e})") from e
    campo_sub = _SUB.get(endpoint)
    obs: list[Observacao] = []
    for v in valores:
        if v.get("Mediana") is None:
            continue
        if endpoint == "ExpectativasMercadoInflacao12Meses" and v.get("Suavizada") != "S":
            continue
        d = date.fromisoformat(v["Data"][:10])
        if campo_sub:
            obs.append((d, float(v["Mediana"]), str(v[campo_sub])))
        else:
            obs.append((d, float(v["Mediana"])))
    return obs


def fetch(codigo: str, desde: date | None, tamanho_pagina: int = PAGINA) -> list[Observacao]:
    endpoint, _ = _endpoint_e_filtros(codigo)
    obs: list[Observacao] = []
    skip = 0
    with httpx.Client(headers=UA, timeout=120, follow_redirects=True) as c:
        while True:
            try:
                r = c.get(montar_url(codigo, desde, skip, tamanho_pagina))
                r.raise_for_status()
            except httpx.HTTPError as e:
                raise AdapterError(f"Focus {endpoint}: {type(e).__name__}") from e
            pagina = parse(r.text, endpoint)
            obs.extend(pagina)
            if len(json.loads(r.text).get("value", [])) < tamanho_pagina:
                break
            skip += tamanho_pagina
    return obs
