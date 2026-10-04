"""Fórmulas das séries derivadas: funções puras sobre listas de (data, valor).

Nenhuma fórmula inventa valor: data sem todos os insumos fica de fora.
"""
from __future__ import annotations

from bisect import bisect_right
from datetime import date

Serie = list[tuple[date, float]]


def media(series: list[Serie]) -> Serie:
    """Média simples nas datas em que todas as séries têm valor."""
    if not series:
        return []
    mapas = [dict(s) for s in series]
    comuns = set(mapas[0]).intersection(*mapas[1:])
    return [(d, sum(m[d] for m in mapas) / len(mapas)) for d in sorted(comuns)]


def _meses(d: date) -> int:
    return d.year * 12 + d.month - 1


def variacao_mensal(estoque: Serie) -> Serie:
    """Diferença entre meses consecutivos (ex.: saldo do CAGED = Δ estoque)."""
    s = sorted(estoque)
    return [(d1, v1 - v0) for (d0, v0), (d1, v1) in zip(s, s[1:]) if _meses(d1) - _meses(d0) == 1]


def fisher(nominal: float, inflacao: float) -> float:
    """Taxa real em % a partir de nominal e inflação em %: (1+n)/(1+i) − 1."""
    return ((1 + nominal / 100) / (1 + inflacao / 100) - 1) * 100


def asof(base: Serie, outra: Serie) -> list[tuple[date, float, float]]:
    """Para cada data da base, o último valor da outra série até essa data (inclusive)."""
    o = sorted(outra)
    datas = [d for d, _ in o]
    out = []
    for d, v in sorted(base):
        i = bisect_right(datas, d)
        if i:
            out.append((d, v, o[i - 1][1]))
    return out


def juro_real_ex_ante(selic_meta: Serie, ipca_12m_focus: Serie) -> Serie:
    """Selic meta vigente deflacionada pela expectativa Focus de IPCA 12 meses à frente (Fisher)."""
    return [(d, fisher(s, i)) for d, i, s in asof(ipca_12m_focus, selic_meta)]


def neutro_focus(selic_anual: dict[str, Serie], ipca_anual: dict[str, Serie], anos_a_frente: int = 3) -> Serie:
    """Juro real implícito no Focus para o ano t+3 (proxy de mercado do neutro).

    `selic_anual`/`ipca_anual`: sub-séries por ano de referência ('2029' -> série).
    Em cada data de pesquisa d, usa o ano d.year + anos_a_frente.
    """
    out = []
    datas = {d for s in selic_anual.values() for d, _ in s}
    selic = {(ano, d): v for ano, s in selic_anual.items() for d, v in s}
    ipca = {(ano, d): v for ano, s in ipca_anual.items() for d, v in s}
    for d in sorted(datas):
        chave = (str(d.year + anos_a_frente), d)
        if chave in selic and chave in ipca:
            out.append((d, fisher(selic[chave], ipca[chave])))
    return out


def diferenca_asof(base: Serie, outra: Serie) -> Serie:
    """base − último valor da outra até a mesma data."""
    return [(d, v - o) for d, v, o in asof(base, outra)]
