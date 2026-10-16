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
    # Análises, item 5 (hiato, Taylor, Phillips): histórico inteiro
    "selic_meta_todo": ("BR-050:432", "1999-01-01"),
    "ipca_12m_todo": ("BR-026:13522", "1999-01-01"),
    "focus_12m_todo": ("BR-047:ExpectativasMercadoInflacao12Meses · Indicador='IPCA'", "1999-01-01"),
    "neutro_focus_todo": ("BR-117:derivado", "1999-01-01"),
    "meta_inflacao_todo": ("BR-134:13521", "1999-01-01"),
    "desocupacao_todo": ("BR-015:24369", "2012-01-01"),
    "pib_indice_sa_todo": ("BR-001:t1621/v584/c11255=90707", "1996-01-01"),
    # Protótipos da Inflação (Fase 6c)
    "ipca_mensal_todo": ("BR-025:433", "2012-01-01"),
    "servicos_mensal": ("BR-037:10844", "2012-01-01"),
    "industriais_mensal": ("BR-038:27863", "2012-01-01"),
    "alimentos_mensal": ("BR-038:27864", "2012-01-01"),
    "livres_mensal": ("BR-035:11428", "2012-01-01"),
    "monitorados_mensal": ("BR-036:4449", "2012-01-01"),
    "nucleos_media_mensal": ("BR-127:derivado", "2012-01-01"),
    "nucleos_p50_mensal": ("BR-128:derivado", "2012-01-01"),
    "servicos_subjacentes_mensal": ("BR-042:29683", "2012-01-01"),
    "industriais_subjacentes_mensal": ("BR-129:29684", "2012-01-01"),
    "difusao": ("BR-040:21379", "2012-01-01"),
    "igpm_mensal": ("BR-043:189", "2012-01-01"),
    "ipca_grupo_7169_var": ("BR-041:t7060/v63,66/c315=all@63.7169", "2012-01-01"),
    "ipca_grupo_7169_peso": ("BR-041:t7060/v63,66/c315=all@66.7169", "2012-01-01"),
    "ipca_grupo_7170_var": ("BR-041:t7060/v63,66/c315=all@63.7170", "2012-01-01"),
    "ipca_grupo_7170_peso": ("BR-041:t7060/v63,66/c315=all@66.7170", "2012-01-01"),
    "ipca_grupo_7445_var": ("BR-041:t7060/v63,66/c315=all@63.7445", "2012-01-01"),
    "ipca_grupo_7445_peso": ("BR-041:t7060/v63,66/c315=all@66.7445", "2012-01-01"),
    "ipca_grupo_7486_var": ("BR-041:t7060/v63,66/c315=all@63.7486", "2012-01-01"),
    "ipca_grupo_7486_peso": ("BR-041:t7060/v63,66/c315=all@66.7486", "2012-01-01"),
    "ipca_grupo_7558_var": ("BR-041:t7060/v63,66/c315=all@63.7558", "2012-01-01"),
    "ipca_grupo_7558_peso": ("BR-041:t7060/v63,66/c315=all@66.7558", "2012-01-01"),
    "ipca_grupo_7625_var": ("BR-041:t7060/v63,66/c315=all@63.7625", "2012-01-01"),
    "ipca_grupo_7625_peso": ("BR-041:t7060/v63,66/c315=all@66.7625", "2012-01-01"),
    "ipca_grupo_7660_var": ("BR-041:t7060/v63,66/c315=all@63.7660", "2012-01-01"),
    "ipca_grupo_7660_peso": ("BR-041:t7060/v63,66/c315=all@66.7660", "2012-01-01"),
    "ipca_grupo_7712_var": ("BR-041:t7060/v63,66/c315=all@63.7712", "2012-01-01"),
    "ipca_grupo_7712_peso": ("BR-041:t7060/v63,66/c315=all@66.7712", "2012-01-01"),
    "ipca_grupo_7766_var": ("BR-041:t7060/v63,66/c315=all@63.7766", "2012-01-01"),
    "ipca_grupo_7766_peso": ("BR-041:t7060/v63,66/c315=all@66.7766", "2012-01-01"),
    "ipca_grupo_7786_var": ("BR-041:t7060/v63,66/c315=all@63.7786", "2012-01-01"),
    "ipca_grupo_7786_peso": ("BR-041:t7060/v63,66/c315=all@66.7786", "2012-01-01"),
    "nucleo_ex0_mensal": ("BR-031:11427", "2012-01-01"),
    "nucleo_ex3_mensal": ("BR-034:27839", "2012-01-01"),
    "nucleo_ms_mensal": ("BR-030:4466", "2012-01-01"),
    "nucleo_dp_mensal": ("BR-033:16122", "2012-01-01"),
    "nucleo_p55_mensal": ("BR-034:28750", "2012-01-01"),
    "comercializaveis_mensal": ("BR-135:4447", "2012-01-01"),
    "nao_comercializaveis_mensal": ("BR-136:4448", "2012-01-01"),
    "duraveis_mensal": ("BR-137:10843", "2012-01-01"),
    "semiduraveis_mensal": ("BR-138:10842", "2012-01-01"),
    "nao_duraveis_mensal": ("BR-139:10841", "2012-01-01"),
    "focus_ipca_2027": ("BR-046:ExpectativasMercadoAnuais · Indicador='IPCA'@2027", "2023-01-01"),
}


# Subitens do grupo 1 (Alimentação e bebidas), variação e peso, para o teste do detalhamento.
SUBITENS_GRUPO_1_DESDE = "2023-01-01"


def main() -> None:
    saida = {}
    with db.connect(os.environ["DATABASE_URL"]) as conn, conn.cursor() as cur:
        for nome, item in SERIES.items():
            sid, desde = item if isinstance(item, tuple) else (item, DESDE)
            cur.execute("select ref_date, value::float8 from observations where series_id=%s and ref_date >= %s "
                        "order by ref_date", (sid, desde))
            linhas = cur.fetchall()
            if not linhas:
                raise SystemExit(f"::error::{nome} ({sid}) sem dados no banco")
            saida[nome] = {"series_id": sid, "obs": [[d.isoformat(), v] for d, v in linhas]}
            print(f"::notice::{nome}: {len(linhas)} observações")
        cur.execute("""select split_part(series_id, '@', 2), ref_date, value::float8 from observations
                       where starts_with(series_id, 'BR-041:t7060/v63,66/c315=all@') and ref_date >= %s
                       order by 1, 2""", (SUBITENS_GRUPO_1_DESDE,))
        sub: dict[str, list] = {}
        for chave, d, v in cur.fetchall():
            sub.setdefault(chave, []).append([d.isoformat(), v])
        saida["subitens_desde_2023"] = {"series_id": "BR-041 (variável.categoria)", "obs": sub}
        print(f"::notice::subitens do IPCA: {len(sub)} sub-séries")
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
