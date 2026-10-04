"""Cálculo das séries derivadas a partir do banco.

Os insumos são localizados pelo código da fonte (ex.: '432', "ExpectativasMercadoAnuais ·
Indicador='Selic'"), não pelo ID do catálogo. Cada série derivada é recalculada inteira
a cada execução; o upsert só grava o que mudou.
"""
from __future__ import annotations

from typing import Callable

import psycopg

from argus_pipeline.derive import formulas as f

FOCUS_IPCA_12M = "ExpectativasMercadoInflacao12Meses · Indicador='IPCA'"
FOCUS_SELIC_ANUAL = "ExpectativasMercadoAnuais · Indicador='Selic'"
FOCUS_IPCA_ANUAL = "ExpectativasMercadoAnuais · Indicador='IPCA'"
NUCLEOS_COPOM = ["11427", "27839", "4466", "16122", "28750"]  # EX0, EX3, MS, DP, P55


class DerivacaoError(Exception):
    """Insumo ausente ou vazio: a série derivada não é calculada (nunca valor inventado)."""


def _ids_base(conn: psycopg.Connection, codigo: str) -> list[str]:
    with conn.cursor() as cur:
        cur.execute("select id from series_data where codigo_fonte = %s and position('@' in id) = 0 order by id",
                    (codigo,))
        return [r[0] for r in cur.fetchall()]


def ler(conn: psycopg.Connection, codigo: str) -> f.Serie:
    ids = _ids_base(conn, codigo)
    if not ids:
        raise DerivacaoError(f"insumo {codigo!r} não está no banco")
    with conn.cursor() as cur:
        cur.execute("select ref_date, value::float8 from observations where series_id = %s order by ref_date", (ids[0],))
        serie = cur.fetchall()
    if not serie:
        raise DerivacaoError(f"insumo {codigo!r} sem observações")
    return serie


def ler_subs(conn: psycopg.Connection, codigo: str) -> dict[str, f.Serie]:
    ids = _ids_base(conn, codigo)
    if not ids:
        raise DerivacaoError(f"insumo {codigo!r} não está no banco")
    with conn.cursor() as cur:
        cur.execute("""select split_part(series_id, '@', 2), ref_date, value::float8 from observations
                       where starts_with(series_id, %s) order by 1, 2""", (ids[0] + "@",))
        subs: dict[str, f.Serie] = {}
        for sub, d, v in cur.fetchall():
            subs.setdefault(sub, []).append((d, v))
    if not subs:
        raise DerivacaoError(f"insumo {codigo!r} sem sub-séries")
    return subs


def _juro_real(conn):
    return f.juro_real_ex_ante(ler(conn, "432"), ler(conn, FOCUS_IPCA_12M))


def _neutro(conn):
    return f.neutro_focus(ler_subs(conn, FOCUS_SELIC_ANUAL), ler_subs(conn, FOCUS_IPCA_ANUAL))


DERIVADAS: dict[str, Callable[[psycopg.Connection], f.Serie]] = {
    "BR-127": lambda c: f.media([ler(c, cod) for cod in NUCLEOS_COPOM]),
    "BR-133": lambda c: f.variacao_mensal(ler(c, "28763")),
    "BR-055": _juro_real,
    "BR-117": _neutro,
    "BR-118": lambda c: f.diferenca_asof(_juro_real(c), _neutro(c)),
}
