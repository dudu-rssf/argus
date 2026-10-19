"""Agenda de divulgações do IBGE (API oficial de calendário, servicodados v3).

Código no catálogo: `calendario`. Devolve `Evento`s do tipo "agenda" (tabela `events`),
um por divulgação futura dos indicadores que o Argus acompanha, com a data de divulgação
em `data_ref` e o período de referência no texto. Datas remarcadas pelo IBGE atualizam o
mesmo evento (o id é o id do IBGE).
"""
from __future__ import annotations

import json
from datetime import date, datetime, timedelta

import httpx

from argus_pipeline.adapters.base import AdapterError, Evento

URL = "https://servicodados.ibge.gov.br/api/v3/calendario/"
UA = {"User-Agent": "argus-coleta/0.1 (projeto pessoal; github.com/dudu-rssf/argus)"}
JANELA_DIAS = 120
MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

# nome_produto do IBGE → (nome curto no Argus, aba)
PRODUTOS = {
    "Índice Nacional de Preços ao Consumidor Amplo": ("IPCA", "inflacao"),
    "Índice Nacional de Preços ao Consumidor Amplo 15": ("IPCA-15", "inflacao"),
    "Divulgação mensal#pnadc1": ("Desemprego (PNAD Contínua)", "mercado-de-trabalho"),
    "PIM-PF Brasil#pimpf1": ("Produção industrial (PIM-PF)", "atividade"),
    "Pesquisa Mensal de Comércio": ("Varejo (PMC)", "atividade"),
    "Pesquisa Mensal de Serviços": ("Serviços (PMS)", "atividade"),
    "Sistema de Contas Nacionais Trimestrais": ("PIB trimestral", "atividade"),
    "Levantamento Sistemático da Produção Agrícola": ("Safra (LSPA)", "atividade"),
}


def _referencia(it: dict, nome: str) -> str:
    a, m = it.get("ano_referencia_fim") or it.get("ano_referencia_inicio"), it.get("mes_referencia_fim") or it.get("mes_referencia_inicio")
    mi = it.get("mes_referencia_inicio")
    if not (a and m and 1 <= int(m) <= 12):
        return str(a) if a else "—"
    if nome == "PIB trimestral":
        return f"{(int(m) - 1) // 3 + 1}º tri/{a}"
    if nome.startswith("Desemprego"):  # PNAD: trimestre móvel que termina no mês informado
        return f"trimestre até {MESES[int(m) - 1]}/{a}"
    if mi and int(mi) != int(m) and 1 <= int(mi) <= 12:
        return f"trimestre {MESES[int(mi) - 1]}–{MESES[int(m) - 1]}/{a}"
    return f"{MESES[int(m) - 1]}/{a}"


def parse(conteudo: bytes) -> list[Evento]:
    try:
        dados = json.loads(conteudo)
        itens = dados["items"]
    except (ValueError, KeyError, TypeError) as e:
        raise AdapterError(f"IBGE calendário: resposta inesperada ({type(e).__name__})") from e
    eventos: dict[str, Evento] = {}
    for it in itens:
        prod = PRODUTOS.get(it.get("nome_produto", ""))
        if not prod:
            continue
        quando = datetime.strptime(it["data_divulgacao"][:10], "%d/%m/%Y").date()
        id_ = f"agenda-ibge-{it['id']}"
        eventos[id_] = Evento(id=id_, tipo="agenda", data_ref=quando, titulo=prod[0], url=it.get("link") or None,
                              texto=f"Referência: {_referencia(it, prod[0])}")
    return list(eventos.values())


def fetch(codigo: str, desde: date | None) -> list[Evento]:
    if codigo != "calendario":
        raise AdapterError(f"IBGE calendário: código desconhecido '{codigo}'")
    hoje = date.today()
    params = {"de": hoje.strftime("%m-%d-%Y"), "ate": (hoje + timedelta(days=JANELA_DIAS)).strftime("%m-%d-%Y"), "qtd": "500"}
    with httpx.Client(timeout=httpx.Timeout(60, connect=10), headers=UA, follow_redirects=True) as c:
        r = c.get(URL, params=params)
    if r.status_code != 200:
        raise AdapterError(f"IBGE calendário: HTTP {r.status_code}")
    return parse(r.content)
