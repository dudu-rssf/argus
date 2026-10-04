"""Adapter dos comunicados e atas do Copom (API do site do BCB, não documentada).

Código no catálogo: `comunicados` ou `atas`. Devolve `Evento`s (tabela `events`),
com o texto convertido de HTML para texto puro: parágrafos separados por linha em
branco, células de tabela por " | " e notas como "[1]". O site do Argus nunca renderiza HTML da fonte.
"""
from __future__ import annotations

import json
import re
from datetime import date
from html.parser import HTMLParser

import httpx

from argus_pipeline.adapters.base import AdapterError, Evento

BASE = "https://www.bcb.gov.br/api/servico/sitebcb/copom"
UA = {"User-Agent": "argus-coleta/0.1 (projeto pessoal; github.com/dudu-rssf/argus)"}

_TIPOS = {
    "comunicados": {"tipo": "copom_comunicado", "prefixo": "copom-comunicado", "nro": "nro_reuniao",
                    "texto": "textoComunicado", "url": None},
    "atas": {"tipo": "copom_ata", "prefixo": "copom-ata", "nro": "nroReuniao",
             "texto": "textoAta", "url": "urlPdfAta"},
}
_BLOCO = {"p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "li", "tr", "table", "hr", "br"}
_CELULA = {"td", "th"}


class _Texto(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.partes: list[str] = []
        self._celulas = 0

    def handle_starttag(self, tag, attrs):
        if tag == "sup":  # nota de rodapé: "Copom[1]"
            self.partes.append("[")
        elif tag in _CELULA:
            if self._celulas:
                self.partes.append(" | ")
            self._celulas += 1
        elif tag in _BLOCO:
            self.partes.append("\n\n")

    def handle_endtag(self, tag):
        if tag == "sup":
            self.partes.append("]")
        elif tag == "tr":
            self._celulas = 0
            self.partes.append("\n")
        elif tag in _BLOCO:
            self.partes.append("\n\n")

    def handle_data(self, data):
        self.partes.append(data)


def html_para_texto(html: str) -> str:
    p = _Texto()
    p.feed(html)
    texto = "".join(p.partes).replace("​", "").replace("\xa0", " ")
    linhas = [re.sub(r"[ \t]+", " ", linha).strip() for linha in texto.split("\n")]
    return re.sub(r"\n{3,}", "\n\n", "\n".join(linhas)).strip()


def _cfg(codigo: str) -> dict:
    if codigo not in _TIPOS:
        raise AdapterError(f"Copom: código inválido no catálogo: {codigo!r} (esperado comunicados ou atas)")
    return _TIPOS[codigo]


def parse_lista(texto: str, codigo: str) -> list[tuple[int, date]]:
    cfg = _cfg(codigo)
    try:
        return [(int(x[cfg["nro"]]), date.fromisoformat(x["dataReferencia"][:10]))
                for x in json.loads(texto)["conteudo"]]
    except (ValueError, KeyError, TypeError) as e:
        raise AdapterError(f"Copom {codigo}: lista inesperada ({type(e).__name__}: {e})") from e


def parse_detalhe(texto: str, codigo: str) -> Evento:
    cfg = _cfg(codigo)
    try:
        x = json.loads(texto)["conteudo"][0]
        nro = int(x[cfg["nro"]])
        return Evento(
            id=f"{cfg['prefixo']}-{nro}",
            tipo=cfg["tipo"],
            data_ref=date.fromisoformat(x["dataReferencia"][:10]),
            titulo=re.sub(r"\s+", " ", x["titulo"]).strip(),
            url=x.get(cfg["url"]) if cfg["url"] else None,
            texto=html_para_texto(x[cfg["texto"]] or ""),
        )
    except (ValueError, KeyError, TypeError, IndexError) as e:
        raise AdapterError(f"Copom {codigo}: detalhe inesperado ({type(e).__name__}: {e})") from e


def _get(client: httpx.Client, url: str, params: dict) -> str:
    try:
        r = client.get(url, params=params)
    except httpx.HTTPError as e:
        raise AdapterError(f"Copom: site do BCB indisponível ({type(e).__name__})") from e
    if r.status_code != 200:
        raise AdapterError(f"Copom HTTP {r.status_code}")
    return r.text


def fetch(codigo: str, desde: date | None) -> list[Evento]:
    _cfg(codigo)
    eventos = []
    with httpx.Client(timeout=60, headers=UA, follow_redirects=True) as c:
        lista = parse_lista(_get(c, f"{BASE}/{codigo}", {"quantidade": "1000"}), codigo)
        for nro, data_ref in lista:
            if desde and data_ref < desde:
                continue
            ev = parse_detalhe(_get(c, f"{BASE}/{codigo}_detalhes", {"nro_reuniao": str(nro)}), codigo)
            if not ev.id.endswith(f"-{nro}"):
                raise AdapterError(f"Copom {codigo}: pedi a reunião {nro} e veio {ev.id}")
            eventos.append(ev)
    return eventos
