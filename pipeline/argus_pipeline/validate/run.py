"""Executa o validador sobre o catálogo e grava o relatório.

Uso (a partir de pipeline/):
    uv run python -m argus_pipeline.validate.run --fases MVP EUA

Saídas: docs/catalogo/validacao.md (leitura) e docs/catalogo/validacao.json (máquina).
O validador não altera o catálogo: a revisão dos títulos é humana (decisão 0006).
"""
from __future__ import annotations

import argparse
import json
import os
import re
from dataclasses import asdict, dataclass
from datetime import date
from pathlib import Path
from typing import Callable

import httpx

from argus_pipeline.catalog import Series, load_catalog, sgs_codes
from argus_pipeline.validate.checks import (
    CheckResult,
    check_focus,
    check_fred,
    check_sgs,
    check_sidra,
    fred_codes,
    is_stale,
    redigir,
)

REPO = Path(__file__).resolve().parents[3]


@dataclass
class Linha:
    id: str
    indicador: str
    acesso: str
    frequencia: str
    codigo: str
    titulo_oficial: str | None
    origem_titulo: str | None
    ultima_obs: str | None
    situacao: str  # OK | Desatualizada | Erro | Não verificável
    detalhe: str = ""


def _situacao(r: CheckResult, frequencia: str, hoje: date) -> str:
    if not r.ok:
        return "Erro"
    return "Desatualizada" if is_stale(frequencia, r.ultima_obs, hoje) else "OK"


def validar(
    series: list[Series],
    checkers: dict[str, Callable[[str], CheckResult]],
    hoje: date | None = None,
) -> list[Linha]:
    hoje = hoje or date.today()
    linhas: list[Linha] = []
    cache: dict[tuple[str, str], CheckResult] = {}
    for s in series:
        kind = s.kind
        if kind == "sgs":
            codigos = sgs_codes(s.codigo)
        elif kind == "sidra":
            codigos = re.findall(r"t\d+", s.codigo)
        elif kind == "fred":
            codigos = fred_codes(s.codigo)
        elif kind == "focus":
            codigos = [s.codigo]
        else:
            linhas.append(Linha(s.id, s.indicador, kind, s.frequencia, s.codigo, None, None, None,
                                "Não verificável", f"acesso '{kind}': revisão manual"))
            continue
        for cod in codigos:
            chave = (kind, cod)
            if chave not in cache:
                cache[chave] = checkers[kind](cod)
            r = cache[chave]
            linhas.append(Linha(
                s.id, s.indicador, kind, s.frequencia, cod, r.titulo_oficial, r.origem_titulo,
                r.ultima_obs.isoformat() if r.ultima_obs else None,
                _situacao(r, s.frequencia, hoje), redigir(r.erro or ""),
            ))
    return linhas


def _md(linhas: list[Linha], hoje: date) -> str:
    cont: dict[str, int] = {}
    for l in linhas:
        cont[l.situacao] = cont.get(l.situacao, 0) + 1
    resumo = " · ".join(f"{k}: {v}" for k, v in sorted(cont.items()))
    out = [
        "# Validação do catálogo",
        "",
        f"Gerado em {hoje.isoformat()} por `argus_pipeline.validate.run`. {resumo}.",
        "",
        "Confira se o **título oficial** corresponde ao **indicador do catálogo**. "
        "Só então mude o status da série para `Verificado` no catálogo.",
        "",
        "| ID | Indicador (catálogo) | Código | Título oficial | Última obs. | Situação | Detalhe |",
        "| --- | --- | --- | --- | --- | --- | --- |",
    ]
    ordem = {"Erro": 0, "Desatualizada": 1, "OK": 2, "Não verificável": 3}
    for l in sorted(linhas, key=lambda x: (ordem.get(x.situacao, 9), x.id)):
        cel = lambda v: (v or "—").replace("|", "/")
        out.append(f"| {l.id} | {cel(l.indicador)} | `{cel(l.codigo)}` | {cel(l.titulo_oficial)} | "
                   f"{cel(l.ultima_obs)} | {l.situacao} | {cel(l.detalhe)[:120]} |")
    return "\n".join(out) + "\n"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--fases", nargs="+", default=["MVP", "EUA"])
    args = ap.parse_args()

    series = [
        s
        for nome, pais in [("brasil", "BR"), ("eua", "US")]
        for s in load_catalog(REPO / "docs" / "catalogo" / f"{nome}.csv", pais=pais)
        if s.fase in args.fases
    ]
    fred_key = os.environ.get("FRED_API_KEY") or None
    hoje = date.today()
    headers = {"User-Agent": "argus-validador/0.1 (projeto pessoal; github.com/dudu-rssf/argus)"}
    with httpx.Client(headers=headers, follow_redirects=True) as client:
        checkers = {
            "sgs": lambda c: check_sgs(c, client),
            "sidra": lambda c: check_sidra(c, client),
            "focus": lambda c: check_focus(c, client),
            "fred": lambda c: check_fred(c, client, fred_key),
        }
        linhas = validar(series, checkers, hoje)

    destino = REPO / "docs" / "catalogo"
    (destino / "validacao.md").write_text(_md(linhas, hoje), encoding="utf-8")
    (destino / "validacao.json").write_text(
        json.dumps([asdict(l) for l in linhas], ensure_ascii=False, indent=1), encoding="utf-8"
    )
    print(f"{len(linhas)} verificações gravadas em docs/catalogo/validacao.md")


if __name__ == "__main__":
    main()
