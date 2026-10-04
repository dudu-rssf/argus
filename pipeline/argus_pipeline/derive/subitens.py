"""Lista dos subitens do IPCA (tabela SIDRA 7060), gerada dos metadados oficiais.

Grava config/derivadas/ipca_subitens_t7060.yaml, que as derivadas por subitem leem.
Uso (rede necessária; roda no workflow "Gerar configuração do IPCA"):
    uv run python -m argus_pipeline.derive.subitens
"""
from __future__ import annotations

import re
from pathlib import Path

import yaml

TABELA = "7060"
CLASSIFICACAO = 315
NIVEL_SUBITEM = 4
DESTINO = Path(__file__).resolve().parents[3] / "config" / "derivadas" / "ipca_subitens_t7060.yaml"


def gerar(meta: dict) -> list[dict]:
    """Subitens (nível 4) com id da categoria SIDRA, código IBGE de 7 dígitos e nome."""
    cls = next(c for c in meta["classificacoes"] if c["id"] == CLASSIFICACAO)
    out = []
    for c in cls["categorias"]:
        if c["nivel"] != NIVEL_SUBITEM:
            continue
        m = re.match(r"^(\d{7})\.(.+)$", c["nome"])
        if not m:
            raise ValueError(f"subitem sem código de 7 dígitos: {c['nome']!r}")
        out.append({"id": str(c["id"]), "codigo": m.group(1), "nome": m.group(2).strip()})
    return sorted(out, key=lambda x: x["codigo"])


def carregar(caminho: Path = DESTINO) -> list[dict]:
    return yaml.safe_load(caminho.read_text(encoding="utf-8"))["subitens"]


def main() -> None:
    from argus_pipeline.adapters import sidra

    subitens = gerar(sidra.metadados(TABELA))
    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    cabecalho = ("# Gerado por argus_pipeline.derive.subitens a partir dos metadados oficiais da\n"
                 f"# tabela SIDRA {TABELA} (classificação {CLASSIFICACAO}, nível {NIVEL_SUBITEM}). Não editar à mão.\n")
    corpo = yaml.safe_dump({"tabela": TABELA, "subitens": subitens}, allow_unicode=True, sort_keys=False)
    DESTINO.write_text(cabecalho + corpo, encoding="utf-8")
    print(f"::notice::{len(subitens)} subitens gravados em {DESTINO.name}")


if __name__ == "__main__":
    main()
