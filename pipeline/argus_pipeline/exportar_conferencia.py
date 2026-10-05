"""Exporta séries oficiais do banco para os testes do site (conferência das transformações).

Uso: uv run python -m argus_pipeline.exportar_conferencia   (com DATABASE_URL)
Grava web/tests/fixtures/oficiais.json. São dados públicos das fontes oficiais.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

from argus_pipeline import db

DESTINO = Path(__file__).resolve().parents[2] / "web" / "tests" / "fixtures" / "oficiais.json"
DESDE = "2015-01-01"

SERIES = {
    "ipca_mensal": "BR-025:433",
    "ipca_12m_oficial": "BR-026:13522",
    "pim_indice_nsa": "BR-007:t8888/v12606,12607/c544=129314,129315,129316@12606.129314",
    "pim_yoy_oficial": "BR-007:t8888/v11602,11604/c544=129314@11602",
    "pim_12m_oficial": "BR-007:t8888/v11602,11604/c544=129314@11604",
    "pmc_indice_sa": "BR-008:t8880/v7169,7170/c11046=56733,56734@7170.56734",
    "pmc_mom_sa_oficial": "BR-008:t8880/v11708/c11046=56734",
    "pib_indice_sa": "BR-001:t1621/v584/c11255=90707",
    "pib_qoq_oficial": "BR-002:t5932/v6561,6562,6564/c11255=90707@6564",
    "selic_meta": "BR-050:432",
}


def main() -> None:
    saida = {}
    with db.connect(os.environ["DATABASE_URL"]) as conn, conn.cursor() as cur:
        for nome, sid in SERIES.items():
            cur.execute("select ref_date, value::float8 from observations where series_id=%s and ref_date >= %s "
                        "order by ref_date", (sid, DESDE))
            linhas = cur.fetchall()
            if not linhas:
                raise SystemExit(f"::error::{nome} ({sid}) sem dados no banco")
            saida[nome] = {"series_id": sid, "obs": [[d.isoformat(), v] for d, v in linhas]}
            print(f"::notice::{nome}: {len(linhas)} observações")
        cur.execute("""select id, to_char(data_ref, 'YYYY-MM-DD'), titulo, texto from events
                       where tipo = 'copom_comunicado' order by data_ref""")
        comunicados = [{"id": i, "data_ref": d, "titulo": t, "texto": x} for i, d, t, x in cur.fetchall()]
        print(f"::notice::comunicados do Copom: {len(comunicados)}")
    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    DESTINO.write_text(json.dumps(saida, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (DESTINO.parent / "copom_comunicados_todos.json").write_text(
        json.dumps(comunicados, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


if __name__ == "__main__":
    main()
