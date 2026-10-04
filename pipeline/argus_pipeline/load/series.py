"""Espelha o catálogo (config) nas tabelas series e series_data."""
from __future__ import annotations

import re

import psycopg

from argus_pipeline.catalog import Series, sgs_codes
from argus_pipeline.validate.checks import fred_codes


def data_codes(s: Series) -> list[str]:
    """Códigos da fonte que viram séries de dados próprias."""
    kind = s.kind
    if kind == "sgs":
        return sgs_codes(s.codigo)
    if kind == "sidra":
        return re.findall(r"t\d+", s.codigo)
    if kind == "fred":
        return fred_codes(s.codigo)
    if kind == "focus":
        return [s.codigo]
    if kind == "derivado":
        return ["derivado"]
    return []


def sync_catalog(conn: psycopg.Connection, series: list[Series]) -> None:
    """Insere ou atualiza séries; nunca apaga observações já coletadas."""
    with conn.cursor() as cur:
        for s in series:
            cur.execute(
                """insert into series (id, pais, aba, bloco, indicador, fonte, codigo, frequencia,
                                       unidade, tipo, fase, status, acesso)
                   values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                   on conflict (id) do update set
                     pais=excluded.pais, aba=excluded.aba, bloco=excluded.bloco,
                     indicador=excluded.indicador, fonte=excluded.fonte, codigo=excluded.codigo,
                     frequencia=excluded.frequencia, unidade=excluded.unidade, tipo=excluded.tipo,
                     fase=excluded.fase, status=excluded.status, acesso=excluded.acesso,
                     atualizado_em=now()""",
                (s.id, s.pais, s.aba, s.bloco, s.indicador, s.fonte, s.codigo, s.frequencia,
                 s.unidade, s.tipo, s.fase, s.status, s.kind),
            )
            for cod in data_codes(s):
                cur.execute(
                    """insert into series_data (id, series_id, codigo_fonte) values (%s, %s, %s)
                       on conflict (id) do nothing""",
                    (f"{s.id}:{cod}", s.id, cod),
                )
    conn.commit()
