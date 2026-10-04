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
        # "t5944/v4096 ; t6379/v4097" -> um código por tabela/recorte
        return [c.strip() for c in s.codigo.split(";") if re.match(r"\s*t\d+", c)]
    if kind in ("comexstat", "tesouro"):
        # "fluxo=export ; fluxo=import", "rtn=10.01.1 ; rtn=10.03.1" -> um código por recorte
        prefixo = {"comexstat": "fluxo=", "tesouro": "rtn="}[kind]
        return [c.strip() for c in s.codigo.split(";") if c.strip().startswith(prefixo)]
    if kind == "copom":
        return [c.strip() for c in s.codigo.split(";") if c.strip()]
    if kind == "b3":
        return [s.codigo.strip()]
    if kind == "fred":
        return fred_codes(s.codigo)
    if kind == "focus":
        # "Endpoint · Indicador='A' ; Indicador='B'" -> um código por indicador
        endpoint, _, filtros = s.codigo.partition("·")
        partes = [f.strip() for f in filtros.split(";") if f.strip()]
        return [f"{endpoint.strip()} · {f}" for f in partes] or [endpoint.strip()]
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
            ids = [f"{s.id}:{cod}" for cod in data_codes(s)]
            for sid, cod in zip(ids, data_codes(s)):
                cur.execute(
                    """insert into series_data (id, series_id, codigo_fonte) values (%s, %s, %s)
                       on conflict (id) do nothing""",
                    (sid, s.id, cod),
                )
            # Código trocado no catálogo: remove a série de dados antiga só se ela nunca
            # recebeu observações (o que já foi coletado nunca é apagado).
            cur.execute(
                """delete from series_data d
                   where d.series_id = %s and d.id <> all(%s)
                     and not exists (select 1 from observations o where o.series_id = d.id)""",
                (s.id, ids),
            )
    conn.commit()
