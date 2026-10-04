"""Adapter do Tesouro Nacional: API Séries Temporais do RTN (decisão 0010).

Código no catálogo: `rtn=<código da série>` (ex.: `rtn=10.04.1` = resultado primário
do Governo Central). O tema (10, 13 ou 20) é o primeiro número do código.
Valores correntes em R$ milhões (sem correção pelo IPCA).
"""
from __future__ import annotations

import json
import re
from datetime import date

import httpx

from argus_pipeline.adapters.base import AdapterError, Observacao

URL = "https://apiapex.tesouro.gov.br/aria/v1/series-temporais/custom/resultado-fiscal"
UA = {"User-Agent": "argus-coleta/0.1 (projeto pessoal; github.com/dudu-rssf/argus)"}
TEMAS = {"10", "13", "20"}
PAGINA = 1000
MAX_PAGINAS = 50

_CODIGO = re.compile(r"^rtn=((\d+)(?:\.\d+)+)$")


def parse_codigo(codigo: str) -> tuple[str, str]:
    m = _CODIGO.match(codigo.strip())
    if not m or m.group(2) not in TEMAS:
        raise AdapterError(f"Tesouro: código inválido no catálogo: {codigo!r} "
                           "(esperado rtn=<série>, temas 10, 13 ou 20)")
    return m.group(2), m.group(1)


def parse(texto: str, serie: str) -> tuple[list[Observacao], int]:
    """Devolve as observações da série pedida e o nº de registros da página."""
    try:
        registros = json.loads(texto)["registros"]
        obs = [(date.fromisoformat(r["data"][:10]), float(r["valor"]))
               for r in registros if r["codigoSerie"] == serie and r["valor"] is not None]
    except (ValueError, KeyError, TypeError) as e:
        raise AdapterError(f"Tesouro: resposta inesperada ({type(e).__name__}: {e})") from e
    return sorted(obs), len(registros)


def fetch(codigo: str, desde: date | None) -> list[Observacao]:
    tema, serie = parse_codigo(codigo)
    params = {"tema": tema, "codigo_da_serie": serie, "pageSize": str(PAGINA)}
    if desde:
        params["data_inicio"] = f"{desde:%m/%Y}"
    vistos: dict[date, float] = {}
    with httpx.Client(timeout=60, headers=UA) as c:
        for pagina in range(1, MAX_PAGINAS + 1):
            try:
                r = c.get(URL, params={**params, "page": str(pagina)})
            except httpx.HTTPError as e:
                raise AdapterError(f"Tesouro indisponível ({type(e).__name__})") from e
            if r.status_code != 200:
                raise AdapterError(f"Tesouro HTTP {r.status_code}: {r.text[:200]}")
            obs, n = parse(r.text, serie)
            vistos.update(obs)
            if n < PAGINA:
                break
        else:
            raise AdapterError(f"Tesouro: mais de {MAX_PAGINAS} páginas para {serie}; resposta suspeita")
    if not vistos:
        raise AdapterError(f"Tesouro: série {serie} sem dados (código inexistente?)")
    return sorted(vistos.items())
