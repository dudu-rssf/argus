"""Confere o método das derivadas por subitem reproduzindo um núcleo oficial.

O P50 (BR-128) usa o mesmo cálculo do P55 do BCB. Rodar a rotina em 55% e comparar
com a série oficial (SGS 28750) valida o método e os dados de subitens.
Uso: uv run python -m argus_pipeline.derive.conferir   (com DATABASE_URL)
"""
from __future__ import annotations

import os

from argus_pipeline import db
from argus_pipeline.derive.run import ler, percentil_ipca

TOLERANCIA = 0.005  # p.p.; as duas séries têm 2 casas decimais


def comparar(nosso: list, oficial: list) -> dict:
    of = dict(oficial)
    pares = [(d, v, of[d]) for d, v in nosso if d in of]
    difs = [(d, round(v - o, 4), v, o) for d, v, o in pares if abs(v - o) > TOLERANCIA]
    return {"meses": len(pares), "divergentes": difs,
            "max_dif": max((abs(v - o) for _, v, o in pares), default=None)}


def main() -> None:
    with db.connect(os.environ["DATABASE_URL"]) as conn:
        r = comparar(percentil_ipca(conn, 0.55), ler(conn, "28750"))
    print(f"::notice::P55 próprio × SGS 28750: {r['meses']} meses, {len(r['divergentes'])} acima de "
          f"{TOLERANCIA} p.p., maior diferença {r['max_dif']}")
    for d, dif, v, o in r["divergentes"][:20]:
        print(f"::warning::{d}: nosso {v} × oficial {o} (dif {dif})")


if __name__ == "__main__":
    main()
