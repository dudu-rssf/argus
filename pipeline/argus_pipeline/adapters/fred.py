"""Adapter do FRED (St. Louis Fed), `fred/series/observations`.

A chave vem de FRED_API_KEY (GitHub Secrets) e nunca entra em mensagem de erro.
Valor "." no FRED é ausência de dado (feriado, sem negociação) e fica de fora.
"""
from __future__ import annotations

import json
import os
from datetime import date

import httpx

from argus_pipeline.adapters.base import AdapterError, Observacao

URL = "https://api.stlouisfed.org/fred/series/observations"
UA = {"User-Agent": "argus-coleta/0.1 (projeto pessoal; github.com/dudu-rssf/argus)"}


def parse(texto: str) -> list[Observacao]:
    try:
        corpo = json.loads(texto)
        if "error_message" in corpo:
            raise AdapterError(f"FRED: {corpo['error_message']}")
        obs: list[Observacao] = []
        for o in corpo["observations"]:
            if o["value"].strip() == ".":
                continue
            obs.append((date.fromisoformat(o["date"]), float(o["value"])))
    except (ValueError, KeyError, TypeError) as e:
        raise AdapterError(f"FRED: resposta inesperada ({type(e).__name__}: {e})") from e
    return obs


def fetch(codigo: str, desde: date | None) -> list[Observacao]:
    chave = os.environ.get("FRED_API_KEY")
    if not chave:
        raise AdapterError("FRED: FRED_API_KEY não configurada")
    params = {"series_id": codigo, "api_key": chave, "file_type": "json"}
    if desde:
        params["observation_start"] = desde.isoformat()
    try:
        r = httpx.get(URL, params=params, headers=UA, timeout=60)
    except httpx.HTTPError as e:
        # str(e) pode trazer a URL com a chave: só o tipo do erro é repassado
        raise AdapterError(f"FRED indisponível ({type(e).__name__})") from None
    if r.status_code != 200:
        try:
            msg = r.json().get("error_message", "")
        except ValueError:
            msg = ""
        raise AdapterError(f"FRED HTTP {r.status_code}: {msg}".strip())
    return parse(r.text)
