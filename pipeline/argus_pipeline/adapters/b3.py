"""Adapter de índices da B3 (Ibovespa), com Yahoo Finance como alternativa.

Código no catálogo: `indice=<código B3> · yahoo=<símbolo>` (ex.: `indice=IBOV · yahoo=^BVSP`).

- Fonte oficial: `IndexCall/GetPortfolioDay`, um pedido por ano (tabela dia × mês,
  números no formato brasileiro). Fechamento diário em pontos.
- A série começa em 1998: até mar/1997 o Ibovespa passou por reescalonamentos (÷10)
  que a B3 publica sem ajuste; emendar esse trecho fica para a v2.
- Alternativa: se a B3 falhar numa carga incremental, o Yahoo cobre a janela recente
  (valores arredondados ao ponto). Como a janela diária é de 90 dias, a próxima carga
  com a B3 no ar sobrescreve esses valores com os oficiais. Na primeira carga (histórico),
  não há alternativa: falha da B3 vira erro.
"""
from __future__ import annotations

import base64
import json
import re
from datetime import date, datetime, timedelta, timezone

import httpx

from argus_pipeline.adapters.base import AdapterError, Observacao

B3_URL = "https://sistemaswebb3-listados.b3.com.br/indexStatisticsProxy/IndexCall/GetPortfolioDay/{param}"
YAHOO_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{simbolo}"
UA = {"User-Agent": "argus-coleta/0.1 (projeto pessoal; github.com/dudu-rssf/argus)"}
ANO_INICIAL = 1998

_CODIGO = re.compile(r"^indice=(\w+)\s*·\s*yahoo=(\S+)$")


def parse_codigo(codigo: str) -> tuple[str, str]:
    m = _CODIGO.match(codigo.strip())
    if not m:
        raise AdapterError(f"B3: código inválido no catálogo: {codigo!r} (esperado indice=<código> · yahoo=<símbolo>)")
    return m.group(1), m.group(2)


def numero(texto: str) -> float:
    return float(texto.replace(".", "").replace(",", "."))


def url_ano(indice: str, ano: int) -> str:
    param = json.dumps({"index": indice, "language": "pt-br", "year": str(ano)}, separators=(",", ":"))
    return B3_URL.format(param=base64.b64encode(param.encode()).decode())


def parse_ano(texto: str, ano: int) -> list[Observacao]:
    try:
        linhas = json.loads(texto)["results"]
        obs = []
        for linha in linhas:
            for mes in range(1, 13):
                bruto = linha.get(f"rateValue{mes}")
                if bruto:
                    obs.append((date(ano, mes, int(linha["day"])), numero(bruto)))
    except (ValueError, KeyError, TypeError) as e:
        raise AdapterError(f"B3 {ano}: resposta inesperada ({type(e).__name__}: {e})") from e
    return sorted(obs)


def parse_yahoo(texto: str) -> list[Observacao]:
    try:
        chart = json.loads(texto)["chart"]
        if chart.get("error"):
            raise AdapterError(f"Yahoo: {chart['error']}")
        r = chart["result"][0]
        fuso = timezone(timedelta(seconds=r["meta"]["gmtoffset"]))
        fech = r["indicators"]["quote"][0]["close"]
        obs = {datetime.fromtimestamp(t, fuso).date(): float(v)
               for t, v in zip(r["timestamp"], fech) if v is not None}
    except (ValueError, KeyError, TypeError, IndexError) as e:
        raise AdapterError(f"Yahoo: resposta inesperada ({type(e).__name__}: {e})") from e
    return sorted(obs.items())


def _via_b3(client: httpx.Client, indice: str, desde: date | None, hoje: date) -> list[Observacao]:
    obs: list[Observacao] = []
    for ano in range(desde.year if desde else ANO_INICIAL, hoje.year + 1):
        try:
            r = client.get(url_ano(indice, ano))
        except httpx.HTTPError as e:
            raise AdapterError(f"B3 indisponível ({type(e).__name__})") from e
        if r.status_code != 200:
            raise AdapterError(f"B3 HTTP {r.status_code}")
        obs.extend(parse_ano(r.text, ano))
    return obs


def _via_yahoo(client: httpx.Client, simbolo: str, desde: date, hoje: date) -> list[Observacao]:
    params = {"interval": "1d",
              "period1": str(int(datetime(desde.year, desde.month, desde.day, tzinfo=timezone.utc).timestamp())),
              "period2": str(int(datetime(hoje.year, hoje.month, hoje.day, tzinfo=timezone.utc).timestamp()) + 86400)}
    try:
        r = client.get(YAHOO_URL.format(simbolo=simbolo), params=params)
    except httpx.HTTPError as e:
        raise AdapterError(f"Yahoo indisponível ({type(e).__name__})") from e
    if r.status_code != 200:
        raise AdapterError(f"Yahoo HTTP {r.status_code}")
    return parse_yahoo(r.text)


def fetch(codigo: str, desde: date | None, hoje: date | None = None) -> list[Observacao]:
    indice, simbolo = parse_codigo(codigo)
    hoje = hoje or date.today()
    with httpx.Client(timeout=60, headers=UA, follow_redirects=True) as client:
        try:
            obs = _via_b3(client, indice, desde, hoje)
        except AdapterError as erro_b3:
            if desde is None:
                raise
            try:
                obs = _via_yahoo(client, simbolo, desde, hoje)
            except AdapterError as erro_yahoo:
                raise AdapterError(f"{erro_b3}; {erro_yahoo}") from erro_yahoo
    return [o for o in obs if desde is None or o[0] >= desde]
