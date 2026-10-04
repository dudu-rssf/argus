"""Grava respostas reais de fontes como fixtures de teste (CLAUDE.md, regra 2).

Uso: uv run python -m argus_pipeline.gravar_fixture "nome1.json=URL1" "nome2.json=URL2" ...
Só aceita URLs sem chave de API. Para fontes com chave, a URL usa o marcador
{FRED_API_KEY}, trocado aqui pela variável de ambiente; a chave nunca vai para
a fixture (o arquivo é conferido antes de gravar). Grava em tests/fixtures/real/.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import httpx

from argus_pipeline.validate.checks import redigir

DESTINO = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "real"
LIMITE = 200_000  # bytes por fixture
CHAVES = ("FRED_API_KEY",)


def main(pares: list[str]) -> None:
    DESTINO.mkdir(parents=True, exist_ok=True)
    with httpx.Client(timeout=90, follow_redirects=True,
                      headers={"User-Agent": "argus-fixtures/0.1 (github.com/dudu-rssf/argus)"}) as c:
        for par in pares:
            nome, url = par.split("=", 1)
            sem_marcadores = url
            for k in CHAVES:
                sem_marcadores = sem_marcadores.replace("{" + k + "}", "")
            if redigir(sem_marcadores) != sem_marcadores:
                print(f"::error::{nome}: URL com chave recusada (use o marcador)")
                continue
            faltando = [k for k in CHAVES if "{" + k + "}" in url and not os.environ.get(k)]
            if faltando:
                print(f"::error::{nome}: {', '.join(faltando)} ausente")
                continue
            segredos = [os.environ[k] for k in CHAVES if "{" + k + "}" in url]
            for k in CHAVES:
                url = url.replace("{" + k + "}", os.environ.get(k, ""))
            try:
                r = c.get(url)
                texto = r.text[:LIMITE]
                if any(seg in texto for seg in segredos):
                    print(f"::error::{nome}: resposta contém a chave; não gravada")
                    continue
                (DESTINO / nome).write_text(texto, encoding="utf-8")
                print(f"::notice::{nome}: HTTP {r.status_code}, {len(r.text)} bytes{' (truncado)' if len(r.text) > LIMITE else ''}")
            except httpx.HTTPError as e:  # a mensagem não é impressa: pode conter a URL com chave
                print(f"::warning::{nome}: falhou ({type(e).__name__})")


if __name__ == "__main__":
    main(sys.argv[1:])
