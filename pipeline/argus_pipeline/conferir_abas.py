"""Confere se cada série usada nas abas do site (config/abas/*.yaml) tem dados no banco.

Uso: uv run python -m argus_pipeline.conferir_abas   (com DATABASE_URL)
Roda junto com "Saúde do banco". Moldes de ano ({ano}, {ano+N}) usam o ano corrente.
"""
from __future__ import annotations

import os
import re
from datetime import date
from pathlib import Path

import yaml

from argus_pipeline import db

ABAS = Path(__file__).resolve().parents[2] / "config" / "abas"


def resolver(dado: str, ano: int) -> str:
    return re.sub(r"\{ano(?:\+(\d))?\}", lambda m: str(ano + int(m.group(1) or 0)), dado)


def dados_das_abas(ano: int) -> dict[str, list[str]]:
    """{dado resolvido: [aba / painel, ...]}"""
    out: dict[str, list[str]] = {}
    for arq in sorted(ABAS.glob("*.yaml")):
        aba = yaml.safe_load(arq.read_text(encoding="utf-8"))
        for p in aba.get("paineis", []):
            for s in p.get("series", []) or []:
                out.setdefault(resolver(s["dado"], ano), []).append(f"{aba['titulo']} / {p['titulo']}")
    return out


def main() -> None:
    usados = dados_das_abas(date.today().year)
    with db.connect(os.environ["DATABASE_URL"]) as conn, conn.cursor() as cur:
        cur.execute("""select series_id, count(*), max(ref_date) from observations
                       where series_id = any(%s) group by 1""", (list(usados),))
        achados = {sid: (n, ult) for sid, n, ult in cur.fetchall()}
    faltando = [d for d in usados if d not in achados]
    print(f"::notice::Abas do site: {len(usados)} séries, {len(usados) - len(faltando)} com dados")
    for d in faltando:
        print(f"::warning::sem dados no banco: {d} (usada em {'; '.join(usados[d])})")


if __name__ == "__main__":
    main()
