"""Catálogo de séries: leitura do CSV, validação de schema e geração da configuração YAML.

O CSV em docs/catalogo/ é a fonte editável; config/series/ é gerado a partir dele.
"""
from __future__ import annotations

import csv
import re
import unicodedata
from enum import Enum
from pathlib import Path

import yaml
from pydantic import BaseModel, ConfigDict


class Tipo(str, Enum):
    indice = "Índice"
    var_mensal = "Var % mensal"
    taxa = "Taxa"
    fluxo = "Fluxo"
    estoque = "Estoque"
    derivado = "Derivado"
    texto = "Texto"
    evento = "Evento"


class Fase(str, Enum):
    mvp = "MVP"
    eua = "EUA"
    v2 = "v2"
    v3 = "v3"


class Status(str, Enum):
    verificado = "Verificado"
    confirmar = "Confirmar"
    a_mapear = "A mapear"
    sem_api = "Sem API"
    pago = "Pago"
    derivado = "Derivado"
    curado = "Curado"


class Series(BaseModel):
    model_config = ConfigDict(frozen=True, use_enum_values=True)

    id: str
    pais: str
    aba: str
    bloco: str
    indicador: str
    fonte: str
    codigo: str
    frequencia: str
    unidade: str
    tipo: Tipo
    fase: Fase
    status: Status
    observacao: str = ""

    @property
    def kind(self) -> str:
        return source_kind(self.fonte, self.codigo)


# Colunas do CSV → campos do modelo
_COLUNAS = {
    "ID": "id",
    "Aba": "aba",
    "Bloco": "bloco",
    "Indicador": "indicador",
    "Fonte": "fonte",
    "Código / endpoint": "codigo",
    "Frequência": "frequencia",
    "Unidade": "unidade",
    "Tipo": "tipo",
    "Fase": "fase",
    "Status": "status",
    "Observação": "observacao",
}


def load_catalog(path: Path, pais: str) -> list[Series]:
    with open(path, encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    return [
        Series(pais=pais, **{campo: (row.get(col) or "").strip() for col, campo in _COLUNAS.items()})
        for row in rows
    ]


_SGS_RE = re.compile(r"(?<![A-Za-z\d])(\d{1,6})(?:\s*[–-]\s*(\d{1,6}))?(?![\d])")


def sgs_codes(codigo: str) -> list[str]:
    """Extrai códigos numéricos do SGS, expandindo intervalos ('27574–27577')."""
    out: list[str] = []
    for ini, fim in _SGS_RE.findall(codigo):
        if fim:
            out.extend(str(n) for n in range(int(ini), int(fim) + 1))
        else:
            out.append(ini)
    return out


def source_kind(fonte: str, codigo: str) -> str:
    """Classifica a série pela forma de acesso, para o validador e o pipeline."""
    if fonte.startswith("Argus"):
        return "derivado"
    if "mapear" in codigo.lower():
        return "pendente"
    if "BCB SGS" in fonte and sgs_codes(codigo):
        return "sgs"
    if "SIDRA" in fonte and re.search(r"\bt\d+", codigo):
        return "sidra"
    if "Focus" in fonte:
        return "focus"
    if fonte.startswith("FRED"):
        return "fred"
    if "ComexStat" in fonte:
        return "comexstat"
    return "manual"


def _slug(texto: str) -> str:
    sem_acento = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", sem_acento.lower()).strip("-")


def build_config(series: list[Series], out_dir: Path) -> list[Path]:
    """Gera um YAML por aba em out_dir. Retorna os arquivos escritos."""
    out_dir.mkdir(parents=True, exist_ok=True)
    por_aba: dict[str, list[Series]] = {}
    for s in series:
        por_aba.setdefault(s.aba, []).append(s)

    arquivos = []
    for aba, itens in por_aba.items():
        doc = {
            "pais": itens[0].pais,
            "aba": aba,
            "gerado_de": "docs/catalogo — não edite à mão; edite o catálogo e rode o gerador",
            "series": [
                {**s.model_dump(exclude={"pais", "aba"}), "acesso": s.kind} for s in itens
            ],
        }
        path = out_dir / f"{_slug(aba)}.yaml"
        path.write_text(
            yaml.safe_dump(doc, allow_unicode=True, sort_keys=False, width=120),
            encoding="utf-8",
        )
        arquivos.append(path)
    return arquivos


if __name__ == "__main__":
    repo = Path(__file__).resolve().parents[2]
    for nome, pais, pasta in [("brasil", "BR", "brasil"), ("eua", "US", "eua")]:
        series = load_catalog(repo / "docs" / "catalogo" / f"{nome}.csv", pais=pais)
        arqs = build_config(series, repo / "config" / "series" / pasta)
        print(f"{pasta}: {len(series)} séries em {len(arqs)} arquivos")
