"""Grava respostas reais de fontes como fixtures de teste (CLAUDE.md, regra 2).

Uso: uv run python -m argus_pipeline.gravar_fixture "nome1.json=URL1" "nome2.json=URL2" ...
Só aceita URLs sem chave de API. Grava em tests/fixtures/real/.
"""
from __future__ import annotations

import sys
from pathlib import Path

import httpx

from argus_pipeline.validate.checks import redigir

DESTINO = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "real"
LIMITE = 200_000  # bytes por fixture


def main(pares: list[str]) -> None:
    DESTINO.mkdir(parents=True, exist_ok=True)
    with httpx.Client(timeout=90, follow_redirects=True,
                      headers={"User-Agent": "argus-fixtures/0.1 (github.com/dudu-rssf/argus)"}) as c:
        for par in pares:
            nome, url = par.split("=", 1)
            if redigir(url) != url:
                print(f"::error::{nome}: URL com chave recusada")
                continue
            try:
                r = c.get(url)
                texto = r.text[:LIMITE]
                (DESTINO / nome).write_text(texto, encoding="utf-8")
                print(f"::notice::{nome}: HTTP {r.status_code}, {len(r.text)} bytes{' (truncado)' if len(r.text) > LIMITE else ''}")
            except httpx.HTTPError as e:
                print(f"::warning::{nome}: falhou ({type(e).__name__})")


if __name__ == "__main__":
    main(sys.argv[1:])
