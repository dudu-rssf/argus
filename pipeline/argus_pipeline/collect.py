"""Orquestrador da coleta: lê o catálogo, chama os adapters, grava e registra.

Uso (a partir de pipeline/), com DATABASE_URL definida:
    uv run python -m argus_pipeline.collect --gatilho manual [--fontes sgs focus]
"""
from __future__ import annotations

import argparse
import os
from datetime import date

import psycopg

from argus_pipeline.adapters.base import AdapterError, Fetcher
from argus_pipeline.catalog import Series
from argus_pipeline.load.observations import ultima_data, upsert_observations
from argus_pipeline.load.series import data_codes, sync_catalog
from argus_pipeline.validate.checks import redigir

COLETAVEIS = {"Verificado"}


def janela_inicio(ultima: date | None, frequencia: str) -> date | None:
    """Primeira carga: histórico completo. Depois: janela recente para pegar revisões."""
    if ultima is None:
        return None
    f = frequencia.lower()
    if f.startswith(("diár", "diar", "seman", "contín", "contin")):
        return date.fromordinal(ultima.toordinal() - 90)
    mes = ultima.month - 24
    ano = ultima.year + (mes - 1) // 12
    mes = (mes - 1) % 12 + 1
    return date(ano, mes, 1)


def _garantir_sub_serie(conn, sub_id: str, series_id: str, codigo: str) -> None:
    with conn.cursor() as cur:
        cur.execute("insert into series_data (id, series_id, codigo_fonte) values (%s,%s,%s) "
                    "on conflict (id) do nothing", (sub_id, series_id, codigo))


def _registrar_item(conn, run_id, sid, status, linhas=0, ultima=None, erro=None):
    with conn.cursor() as cur:
        cur.execute(
            """insert into ingestion_items (run_id, series_id, status, linhas, ultima_data, erro)
               values (%s,%s,%s,%s,%s,%s)""",
            (run_id, sid, status, linhas, ultima, erro),
        )


def run_collection(
    conn: psycopg.Connection,
    series: list[Series],
    adapters: dict[str, Fetcher],
    gatilho: str,
    hoje: date | None = None,
    fases: tuple[str, ...] = ("MVP",),
) -> int:
    alvo = [s for s in series if s.fase in fases and s.status in COLETAVEIS and s.kind in adapters]
    sync_catalog(conn, alvo)
    with conn.cursor() as cur:
        cur.execute("insert into ingestion_runs (gatilho) values (%s) returning id", (gatilho,))
        run_id = cur.fetchone()[0]
    conn.commit()

    erros = oks = 0
    for s in alvo:
        fetch = adapters[s.kind]
        for cod in data_codes(s):
            sid = f"{s.id}:{cod}"
            try:
                desde = janela_inicio(ultima_data(conn, sid), s.frequencia)
                linhas = fetch(cod, desde)
                grupos: dict[str, list] = {}
                for linha in linhas:
                    alvo_id = f"{sid}@{linha[2]}" if len(linha) > 2 else sid
                    grupos.setdefault(alvo_id, []).append((linha[0], linha[1]))
                mudou = 0
                for alvo_id, obs in grupos.items():
                    if alvo_id != sid:
                        _garantir_sub_serie(conn, alvo_id, s.id, cod)
                    mudou += upsert_observations(conn, alvo_id, obs)
                _registrar_item(conn, run_id, sid, "ok" if mudou else "sem_novidade", mudou,
                                max((linha[0] for linha in linhas), default=None))
                conn.commit()
                oks += 1
            except (AdapterError, psycopg.DataError, ValueError) as e:
                conn.rollback()
                _registrar_item(conn, run_id, sid, "erro", erro=redigir(str(e))[:1000])
                conn.commit()
                erros += 1

    status = "ok" if not erros else ("parcial" if oks else "erro")
    with conn.cursor() as cur:
        cur.execute("update ingestion_runs set status=%s, terminado_em=now() where id=%s", (status, run_id))
    conn.commit()
    return run_id


def main() -> None:
    from pathlib import Path

    from argus_pipeline import db
    from argus_pipeline.adapters import registry
    from argus_pipeline.catalog import load_catalog

    ap = argparse.ArgumentParser()
    ap.add_argument("--gatilho", default="manual", choices=["agenda", "botao", "manual"])
    ap.add_argument("--fontes", nargs="*", help="limita às fontes indicadas (ex.: sgs focus)")
    args = ap.parse_args()

    repo = Path(__file__).resolve().parents[2]
    series = load_catalog(repo / "docs" / "catalogo" / "brasil.csv", pais="BR")
    adapters = registry.ADAPTERS
    if args.fontes:
        adapters = {k: v for k, v in adapters.items() if k in args.fontes}

    with db.connect(os.environ["DATABASE_URL"]) as conn:
        db.apply_migrations(conn)
        run_id = run_collection(conn, series, adapters, gatilho=args.gatilho)
        with conn.cursor() as cur:
            cur.execute("select status, count(*) from ingestion_items where run_id=%s group by 1", (run_id,))
            resumo = dict(cur.fetchall())
            cur.execute("select status from ingestion_runs where id=%s", (run_id,))
            status = cur.fetchone()[0]
            cur.execute("""select series_id, erro from ingestion_items
                           where run_id=%s and status='erro' order by 1""", (run_id,))
            erros = cur.fetchall()
    print(f"::notice::Execução {run_id}: {status} · {resumo}")
    for sid, erro in erros:
        print(f"::warning::{sid}: {erro[:300]}")


if __name__ == "__main__":
    main()
