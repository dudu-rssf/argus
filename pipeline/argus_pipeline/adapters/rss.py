"""Notícias oficiais por RSS/Atom (Central do site): BCB, IBGE e Fed.

Código no catálogo: a chave da fonte (bcb_notas, bcb_noticias, ibge, fed). Devolve
`Evento`s do tipo "noticia" (tabela `events`), com título e resumo em texto puro (o site
nunca renderiza HTML da fonte). O id é estável: fonte + hash do link.
"""
from __future__ import annotations

import hashlib
import html
import re
from datetime import date, datetime, timezone

import feedparser
import httpx

from argus_pipeline.adapters.base import AdapterError, Evento

UA = {"User-Agent": "argus-coleta/0.1 (projeto pessoal; github.com/dudu-rssf/argus)"}
FONTES = {
    "bcb_notas": "https://www.bcb.gov.br/api/feed/sitebcb/sitefeeds/notasImprensa?ano={ano}",
    "bcb_noticias": "https://www.bcb.gov.br/api/feed/sitebcb/sitefeeds/noticias?ano={ano}",
    "ibge": "https://agenciadenoticias.ibge.gov.br/agencia-rss",
    "fed": "https://www.federalreserve.gov/feeds/press_monetary.xml",
}
RESUMO_MAX = 600


def url_de(fonte: str, ano: int) -> str:
    if fonte not in FONTES:
        raise AdapterError(f"RSS: fonte desconhecida '{fonte}'")
    return FONTES[fonte].format(ano=ano)


def _texto(s: str | None) -> str:
    s = re.sub(r"<[^>]+>", " ", s or "")
    s = html.unescape(html.unescape(s))
    return re.sub(r"\s+", " ", s).strip()


def _data(item) -> date | None:
    for campo in ("published_parsed", "updated_parsed"):
        t = item.get(campo)
        if t:
            return datetime(*t[:6], tzinfo=timezone.utc).date()
    return None


def parse(conteudo: bytes, fonte: str) -> list[Evento]:
    feed = feedparser.parse(conteudo)
    if feed.bozo and not feed.entries:
        raise AdapterError(f"RSS {fonte}: resposta não é um feed ({type(feed.bozo_exception).__name__})")
    if not feed.entries:
        raise AdapterError(f"RSS {fonte}: feed sem itens")
    eventos: dict[str, Evento] = {}
    for it in feed.entries:
        link, titulo, quando = it.get("link"), _texto(it.get("title")), _data(it)
        if not link or not titulo or not quando:
            continue
        resumo = _texto(it.get("summary"))
        if len(resumo) > RESUMO_MAX:
            resumo = resumo[: RESUMO_MAX - 1].rsplit(" ", 1)[0] + "…"
        id_ = f"noticia-{fonte}-{hashlib.sha1(link.encode()).hexdigest()[:16]}"
        eventos[id_] = Evento(id=id_, tipo="noticia", data_ref=quando, titulo=titulo, url=link, texto=resumo)
    if not eventos:
        raise AdapterError(f"RSS {fonte}: nenhum item com título, link e data")
    return list(eventos.values())


def fetch(codigo: str, desde: date | None) -> list[Evento]:
    hoje = date.today()
    anos = sorted({hoje.year, (desde or hoje).year}) if "{ano}" in FONTES.get(codigo, "") else [hoje.year]
    eventos: list[Evento] = []
    with httpx.Client(timeout=30, headers=UA, follow_redirects=True) as c:
        for ano in anos[-2:]:
            r = c.get(url_de(codigo, ano))
            if r.status_code != 200:
                raise AdapterError(f"RSS {codigo}: HTTP {r.status_code}")
            eventos += parse(r.content, codigo)
    return [e for e in eventos if not desde or e.data_ref >= desde]
