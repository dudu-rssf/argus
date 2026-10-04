"""Resumo de saúde do banco (base da aba Data Health).

Uso: uv run python -m argus_pipeline.health [prefixo ...]   (com DATABASE_URL)
Com prefixos (ex.: BR-079 BR-080), detalha só essas séries.
Imprime anotações '::notice::' para leitura no GitHub Actions.
"""
from __future__ import annotations

import os
import sys

from argus_pipeline import db

RESUMO = """
select sd.id, s.indicador, count(o.*) as n, min(o.ref_date), max(o.ref_date),
       (select value from observations o2 where o2.series_id = sd.id order by ref_date desc limit 1)
from series_data sd join series s on s.id = sd.series_id
left join observations o on o.series_id = sd.id
where cardinality(%(prefixos)s::text[]) = 0 or sd.id like any(%(prefixos)s::text[])
group by sd.id, s.indicador order by sd.id
"""


def main(prefixos: list[str]) -> None:
    with db.connect(os.environ["DATABASE_URL"]) as conn, conn.cursor() as cur:
        cur.execute("select count(*), count(distinct series_id) from observations")
        total, n_series = cur.fetchone()
        cur.execute("select id, gatilho, status, iniciado_em, terminado_em from ingestion_runs order by id desc limit 3")
        runs = cur.fetchall()
        cur.execute("select tipo, count(*), min(data_ref), max(data_ref), min(length(texto)) from events group by 1 order by 1")
        eventos = cur.fetchall()
        cur.execute(RESUMO, {"prefixos": [p + "%" for p in prefixos]})
        linhas = cur.fetchall()
    print(f"::notice::Banco: {total} observações em {n_series} séries de dados")
    for r in runs:
        print(f"::notice::Execução {r[0]} ({r[1]}): {r[2]}, {r[3]:%Y-%m-%d %H:%M} → {r[4]:%H:%M}" if r[4] else f"::notice::Execução {r[0]}: {r[2]}")
    for tipo, n, ini, fim, menor in eventos:
        print(f"::notice::Eventos {tipo}: {n} de {ini} a {fim}; menor texto {menor} caracteres")
    # GitHub limita anotações por passo: agrupa várias séries por linha
    bloco = []
    linhas = [x for x in linhas if x[2]]  # séries-mãe vazias (só sub-séries têm dados) ficam de fora
    for sid, ind, n, ini, fim, ult in linhas:
        bloco.append(f"{sid} n={n} {ini}→{fim} último={float(ult) if ult is not None else None}")
        if len(bloco) == 8:
            print("::notice::" + " | ".join(bloco))
            bloco = []
    if bloco:
        print("::notice::" + " | ".join(bloco))


if __name__ == "__main__":
    main(sys.argv[1:])
