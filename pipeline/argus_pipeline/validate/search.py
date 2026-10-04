"""Busca de séries por palavra-chave para mapear códigos pendentes do catálogo.

Uso (a partir de pipeline/):
    uv run python -m argus_pipeline.validate.search --sgs "núcleo ex3; p55" --sidra "taxa de participação"

Grava docs/catalogo/busca.md com os candidatos (código + título oficial).
A escolha do código certo é revisão humana; a ferramenta só lista.
"""
from __future__ import annotations

import argparse
import re
import time
import unicodedata
from datetime import date
from pathlib import Path

import httpx

from argus_pipeline.validate.checks import BCB_PORTAL_BUSCA, PAUSA_S

SIDRA_AGREGADOS = "https://servicodados.ibge.gov.br/api/v3/agregados"
REPO = Path(__file__).resolve().parents[3]


def normalizar(texto: str) -> str:
    sem_acento = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", sem_acento.lower()).strip()


def contem_todos(texto: str, termos: str) -> bool:
    alvo = normalizar(texto)
    return all(t in alvo for t in normalizar(termos).split())


def candidatos_sgs(resultados: list[dict], termos: str) -> list[tuple[str, str]]:
    """Filtra resultados do portal do BCB: só séries SGS (nome começa com código) que contêm os termos."""
    out = []
    for item in resultados:
        codigo = item.get("name", "").split("-")[0]
        titulo = item.get("title", "")
        if codigo.isdigit() and contem_todos(titulo, termos):
            out.append((codigo, titulo))
    return out


def candidatos_sidra(pesquisas: list[dict], termos: str, pesquisa: str = "") -> list[tuple[str, str, str]]:
    """Filtra a lista de agregados do IBGE: (tabela, nome da tabela, pesquisa)."""
    out = []
    for p in pesquisas:
        if pesquisa and not contem_todos(p.get("nome", ""), pesquisa):
            continue
        for ag in p.get("agregados", []):
            if contem_todos(ag.get("nome", ""), termos):
                out.append((f"t{ag['id']}", ag["nome"], p.get("nome", "")))
    return out


def _buscar_sgs(client: httpx.Client, termos: str) -> list[tuple[str, str]]:
    for tentativa in range(3):
        resp = client.get(BCB_PORTAL_BUSCA, params={"q": termos, "rows": 100})
        time.sleep(PAUSA_S * (tentativa + 1))
        try:
            return candidatos_sgs(resp.json()["result"]["results"], termos)
        except ValueError:  # portal às vezes devolve HTML "Requisição Inválida"
            continue
    return []


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sgs", default="", help="buscas separadas por ';'")
    ap.add_argument("--sidra", default="", help="buscas separadas por ';'")
    ap.add_argument("--sidra-pesquisa", default="", help="filtra pela pesquisa (ex.: 'pnad continua')")
    args = ap.parse_args()

    linhas = [f"# Busca de séries — {date.today().isoformat()}", ""]
    headers = {"User-Agent": "argus-validador/0.1 (projeto pessoal; github.com/dudu-rssf/argus)"}
    with httpx.Client(headers=headers, follow_redirects=True, timeout=60) as client:
        for termos in [t.strip() for t in args.sgs.split(";") if t.strip()]:
            achados = _buscar_sgs(client, termos)
            linhas += [f"## SGS: `{termos}` — {len(achados)} candidatos", "", "| Código | Título oficial |", "| --- | --- |"]
            linhas += [f"| {c} | {t} |" for c, t in achados[:40]] + [""]
        buscas_sidra = [t.strip() for t in args.sidra.split(";") if t.strip()]
        if buscas_sidra:
            pesquisas = client.get(SIDRA_AGREGADOS).json()
            for termos in buscas_sidra:
                achados = candidatos_sidra(pesquisas, termos, args.sidra_pesquisa)
                linhas += [f"## SIDRA: `{termos}` — {len(achados)} candidatos", "",
                           "| Tabela | Nome | Pesquisa |", "| --- | --- | --- |"]
                linhas += [f"| {c} | {n} | {p} |" for c, n, p in achados[:40]] + [""]

    (REPO / "docs" / "catalogo" / "busca.md").write_text("\n".join(linhas) + "\n", encoding="utf-8")
    print("\n".join(linhas))


if __name__ == "__main__":
    main()
