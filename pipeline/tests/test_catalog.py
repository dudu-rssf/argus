"""Testes do catálogo: o CSV vira configuração válida e sem ambiguidade."""
from pathlib import Path

import pytest
import yaml

from argus_pipeline.catalog import (
    Series,
    build_config,
    load_catalog,
    sgs_codes,
    source_kind,
)

REPO = Path(__file__).resolve().parents[2]
CATALOGO = REPO / "docs" / "catalogo"


@pytest.fixture(scope="module")
def brasil():
    return load_catalog(CATALOGO / "brasil.csv", pais="BR")


@pytest.fixture(scope="module")
def eua():
    return load_catalog(CATALOGO / "eua.csv", pais="US")


def test_carrega_todas_as_linhas(brasil, eua):
    assert len(brasil) == 131
    assert len(eua) == 96


def test_ids_unicos(brasil, eua):
    ids = [s.id for s in brasil + eua]
    assert len(ids) == len(set(ids))


def test_tipo_status_e_fase_validos(brasil, eua):
    # pydantic já valida os enums; aqui garantimos que nada caiu em branco
    for s in brasil + eua:
        assert s.tipo and s.status and s.fase


def test_tipo_invalido_e_rejeitado():
    with pytest.raises(ValueError):
        Series(
            id="X-1", pais="BR", aba="A", bloco="B", indicador="I", fonte="BCB SGS",
            codigo="433", frequencia="Mensal", unidade="%", tipo="Var %",
            fase="MVP", status="Confirmar", observacao="",
        )


@pytest.mark.parametrize(
    "fonte,codigo,esperado",
    [
        ("BCB SGS", "433", "sgs"),
        ("BCB SGS", "20539 / 20541 / 20540", "sgs"),
        ("BCB SGS / IBGE SIDRA", "24369 / t6381", "sgs"),
        ("IBGE SIDRA", "t1621", "sidra"),
        ("IBGE SIDRA", "t8880 / t8881", "sidra"),
        ("BCB Olinda (Focus)", "ExpectativasMercadoSelic", "focus"),
        ("FRED (BLS)", "PAYEMS", "fred"),
        ("FRED", "SAHMREALTIME", "fred"),
        ("ComexStat (MDIC)", "API ComexStat", "comexstat"),
        ("Tesouro Nacional (API RTN)", "rtn=10.04.1 ; rtn=10.08.1", "tesouro"),
        ("Tesouro / LDO", "Curado", "manual"),
        ("B3 (oficial) / Yahoo (alternativa)", "indice=IBOV · yahoo=^BVSP", "b3"),
        ("BCB site (API Copom)", "comunicados ; atas", "copom"),
        ("Argus", "f(432, Focus IPCA 12m)", "derivado"),
        ("BCB SGS", "A mapear", "pendente"),
        ("FGV IBRE", "—", "manual"),
    ],
)
def test_source_kind(fonte, codigo, esperado):
    assert source_kind(fonte, codigo) == esperado


@pytest.mark.parametrize(
    "codigo,esperado",
    [
        ("433", ["433"]),
        ("20539 / 20541 / 20540", ["20539", "20541", "20540"]),
        ("24369 / t6381", ["24369"]),
        ("5793 (a confirmar)", ["5793"]),
        ("27574–27577 (a confirmar)", ["27574", "27575", "27576", "27577"]),
        ("A mapear", []),
    ],
)
def test_sgs_codes(codigo, esperado):
    assert sgs_codes(codigo) == esperado


def test_build_config_gera_um_arquivo_por_aba(brasil, tmp_path):
    arquivos = build_config(brasil, tmp_path / "brasil")
    abas = {s.aba for s in brasil}
    assert len(arquivos) == len(abas)
    total = 0
    for arq in arquivos:
        dados = yaml.safe_load(arq.read_text(encoding="utf-8"))
        assert dados["pais"] == "BR"
        total += len(dados["series"])
    assert total == len(brasil)


def test_config_preserva_acentos(brasil, tmp_path):
    arquivos = build_config(brasil, tmp_path / "brasil")
    texto = "".join(a.read_text(encoding="utf-8") for a in arquivos)
    assert "Inflação" in texto
    assert "\\u" not in texto
