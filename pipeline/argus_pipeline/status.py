"""Resumo semanal da coleta em docs/status/coleta.md (Fase 1, passo 8).

O commit semanal desse arquivo mantém o repositório ativo (o GitHub desliga
agendamentos de repositórios públicos sem atividade por 60 dias; decisão 0007)
e serve de registro público da saúde da coleta. Não contém valores de séries.

Uso: uv run python -m argus_pipeline.status   (com DATABASE_URL)
"""
from __future__ import annotations

import os
from datetime import date, timedelta
from pathlib import Path

import psycopg

from argus_pipeline import db
from argus_pipeline.validate.checks import redigir

DESTINO = Path(__file__).resolve().parents[2] / "docs" / "status" / "coleta.md"


def gerar_markdown(conn: psycopg.Connection, hoje: date) -> str:
    inicio = hoje - timedelta(days=7)
    with conn.cursor() as cur:
        cur.execute("""select gatilho, status, count(*) from ingestion_runs
                       where iniciado_em >= %s group by 1, 2 order by 1, 2""", (inicio,))
        execucoes = cur.fetchall()
        cur.execute("""select s.acesso, count(distinct sd.id), max(i.ultima_data)
                       from series s join series_data sd on sd.series_id = s.id
                       left join ingestion_items i on i.series_id = sd.id and i.status <> 'erro'
                       group by 1 order by 1""")
        fontes = cur.fetchall()
        cur.execute("""select i.series_id, count(*), max(r.iniciado_em),
                              (array_agg(i.erro order by r.iniciado_em desc))[1]
                       from ingestion_items i join ingestion_runs r on r.id = i.run_id
                       where i.status = 'erro' and r.iniciado_em >= %s
                       group by 1 order by 2 desc, 1""", (inicio,))
        erros = cur.fetchall()

    linhas = [
        "# Saúde da coleta",
        "",
        f"Semana de {inicio.isoformat()} a {hoje.isoformat()}. Gerado automaticamente pelo workflow "
        "\"Resumo semanal\"; não editar à mão.",
        "",
        "## Execuções",
        "",
        "| Gatilho | Status | Execuções |",
        "| --- | --- | --- |",
        *[f"| {g} | {s} | {n} |" for g, s, n in execucoes],
        *(["| — | — | 0 |"] if not execucoes else []),
        "",
        "## Fontes",
        "",
        "| Acesso | Séries de dados | Último dado coletado |",
        "| --- | --- | --- |",
        *[f"| {a} | {n} | {d.isoformat() if d else '—'} |" for a, n, d in fontes],
        "",
        "## Falhas na semana",
        "",
    ]
    if erros:
        linhas += ["| Série | Falhas | Última | Erro mais recente |", "| --- | --- | --- | --- |"]
        for sid, n, quando, erro in erros:
            msg = redigir(erro or "").replace("|", "/").replace("\n", " ")[:160]
            linhas.append(f"| `{sid}` | {n} | {quando:%Y-%m-%d %H:%M} | {msg} |")
    else:
        linhas.append("Nenhuma.")
    return "\n".join(linhas) + "\n"


def main() -> None:
    with db.connect(os.environ["DATABASE_URL"]) as conn:
        texto = gerar_markdown(conn, date.today())
    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    DESTINO.write_text(texto, encoding="utf-8")
    print(f"::notice::{DESTINO.name} atualizado")


if __name__ == "__main__":
    main()
