"""Sorteia 10 valores por aba do site e confere cada um contra a fonte oficial, na hora.

Critério de pronto das Fases 1 e 3: o que está no banco (e no site) é o que a fonte publica.
Uso: uv run python -m argus_pipeline.conferir_amostra [--por-aba 10] [--semente N]   (com DATABASE_URL)
"""
from __future__ import annotations

import argparse
import os
import random
from datetime import date, timedelta
from pathlib import Path

from argus_pipeline import db
from argus_pipeline.adapters.base import AdapterError
from argus_pipeline.adapters.registry import ADAPTERS
from argus_pipeline.catalog import load_catalog
from argus_pipeline.conferir_abas import dados_das_abas

REPO = Path(__file__).resolve().parents[2]
TOLERANCIA = 1e-6


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--por-aba", type=int, default=10)
    ap.add_argument("--semente", type=int, default=date.today().toordinal())
    args = ap.parse_args()
    sorteio = random.Random(args.semente)
    catalogo = {s.id: s for s in load_catalog(REPO / "docs" / "catalogo" / "brasil.csv", pais="BR")}

    por_aba: dict[str, list[str]] = {}
    for dado, usos in dados_das_abas(date.today().year).items():
        s = catalogo[dado.split(":")[0]]
        if s.kind in ADAPTERS:  # derivadas não têm fonte externa para comparar
            for u in usos:
                por_aba.setdefault(u.split(" / ")[0], []).append(dado)

    total = ok = 0
    with db.connect(os.environ["DATABASE_URL"]) as conn, conn.cursor() as cur:
        for aba, dados in por_aba.items():
            for _ in range(args.por_aba):
                dado = sorteio.choice(sorted(set(dados)))
                cur.execute("select ref_date, value::float8 from observations where series_id=%s "
                            "order by random() limit 1", (dado,))
                linha = cur.fetchone()
                if not linha:
                    print(f"::warning::{aba}: {dado} sem dados no banco")
                    continue
                ref, valor_banco = linha
                base, _, sub = dado.partition("@")
                codigo = base.split(":", 1)[1]
                s = catalogo[base.split(":")[0]]
                try:
                    obs = ADAPTERS[s.kind](codigo, ref - timedelta(days=7))
                except AdapterError as e:
                    print(f"::warning::{aba}: {dado} {ref}: fonte indisponível ({e})")
                    continue
                fonte = {o[0]: o[1] for o in obs if (o[2] if len(o) > 2 else "") == sub}
                total += 1
                v = fonte.get(ref)
                if v is not None and abs(v - valor_banco) <= TOLERANCIA:
                    ok += 1
                    print(f"::notice::OK {aba}: {dado} em {ref} = {valor_banco} (fonte {v})")
                else:
                    print(f"::warning::DIFERENTE {aba}: {dado} em {ref}: banco {valor_banco}, fonte {v}")
    print(f"::notice::Conferência: {ok} de {total} valores sorteados iguais à fonte oficial (semente {args.semente})")


if __name__ == "__main__":
    main()
