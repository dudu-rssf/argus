"""Conexão com o Postgres e aplicação de migrações (SQL puro, numeradas)."""
from __future__ import annotations

from pathlib import Path

import psycopg

MIGRACOES = Path(__file__).resolve().parents[2] / "db" / "migrations"
PERMISSOES = MIGRACOES.parent / "permissoes.sql"


def connect(url: str) -> psycopg.Connection:
    return psycopg.connect(url, autocommit=False)


def apply_migrations(conn: psycopg.Connection, pasta: Path = MIGRACOES) -> list[str]:
    """Aplica, em ordem, as migrações ainda não registradas. Retorna as aplicadas."""
    with conn.cursor() as cur:
        cur.execute("create table if not exists schema_migrations "
                    "(nome text primary key, aplicada_em timestamptz not null default now())")
        cur.execute("select nome from schema_migrations")
        feitas = {r[0] for r in cur.fetchall()}
        aplicadas = []
        for arq in sorted(pasta.glob("*.sql")):
            if arq.name in feitas:
                continue
            cur.execute(arq.read_text(encoding="utf-8"))
            cur.execute("insert into schema_migrations(nome) values (%s)", (arq.name,))
            aplicadas.append(arq.name)
        if PERMISSOES.exists():
            cur.execute(PERMISSOES.read_text(encoding="utf-8"))
    conn.commit()
    return aplicadas


if __name__ == "__main__":
    import os
    with connect(os.environ["DATABASE_URL"]) as c:
        feitas = apply_migrations(c)
        print("migrações aplicadas:", feitas or "nenhuma (banco já atualizado)")
