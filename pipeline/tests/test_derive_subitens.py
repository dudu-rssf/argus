"""Lista de subitens do IPCA a partir dos metadados reais da tabela 7060."""
import json
from pathlib import Path

from argus_pipeline.derive.subitens import gerar

META = Path(__file__).parent / "fixtures" / "real" / "sidra_meta_7060.json"


def test_subitens_reais():
    subitens = gerar(json.loads(META.read_text(encoding="utf-8")))
    assert len(subitens) == 377
    arroz = next(s for s in subitens if s["nome"] == "Arroz")
    assert arroz == {"id": "7173", "codigo": "1101002", "nome": "Arroz"}
    assert all(len(s["codigo"]) == 7 for s in subitens)
    assert not any(s["id"] == "7169" for s in subitens)  # índice geral não é subitem
