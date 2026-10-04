"""Fórmulas das séries derivadas contra valores conhecidos (calculados à mão)."""
from datetime import date

import pytest

from argus_pipeline.derive import formulas as f


def D(m, d=1, y=2026):
    return date(y, m, d)


def test_media_so_nas_datas_comuns():
    a = [(D(1), 0.30), (D(2), 0.40), (D(3), 0.50)]
    b = [(D(2), 0.20), (D(3), 0.10)]
    c = [(D(2), 0.30), (D(3), 0.30)]
    assert f.media([a, b, c]) == [(D(2), pytest.approx(0.30)), (D(3), pytest.approx(0.30))]


def test_media_dos_5_nucleos_ago_2026():
    """Exemplo com 5 núcleos: (0,20 + 0,25 + 0,18 + 0,22 + 0,15) / 5 = 0,20."""
    vals = [0.20, 0.25, 0.18, 0.22, 0.15]
    assert f.media([[(D(8), v)] for v in vals]) == [(D(8), pytest.approx(0.20))]


def test_variacao_mensal_so_entre_meses_consecutivos():
    estoque = [(D(1), 100.0), (D(2), 130.0), (D(4), 120.0), (D(5), 110.0)]
    assert f.variacao_mensal(estoque) == [(D(2), 30.0), (D(5), -10.0)]  # mar falta: abr fica sem saldo


def test_variacao_vira_o_ano():
    assert f.variacao_mensal([(date(2025, 12, 1), 10.0), (date(2026, 1, 1), 7.0)]) == [(date(2026, 1, 1), -3.0)]


def test_fisher():
    # Selic 13,75% e inflação esperada 4,5%: (1,1375/1,045 − 1) = 8,8517%
    assert f.fisher(13.75, 4.5) == pytest.approx(8.851674, abs=1e-6)


def test_juro_real_usa_selic_vigente_na_data_do_focus():
    selic = [(D(8, 5), 14.0), (D(9, 17), 13.75)]
    focus = [(D(8, 4), 4.6), (D(9, 10), 4.5), (D(9, 18), 4.4)]
    out = f.juro_real_ex_ante(selic, focus)
    assert [d for d, _ in out] == [D(9, 10), D(9, 18)]  # 4/ago: sem Selic conhecida antes
    assert out[0][1] == pytest.approx(f.fisher(14.0, 4.5))
    assert out[1][1] == pytest.approx(f.fisher(13.75, 4.4))


def test_neutro_usa_o_ano_t_mais_3():
    selic = {"2029": [(D(9, 25), 10.5)], "2028": [(D(9, 25), 11.0)]}
    ipca = {"2029": [(D(9, 25), 3.5)], "2028": [(D(9, 25), 3.6)]}
    assert f.neutro_focus(selic, ipca) == [(D(9, 25), pytest.approx(f.fisher(10.5, 3.5)))]


def test_neutro_sem_par_completo_fica_de_fora():
    assert f.neutro_focus({"2029": [(D(9, 25), 10.5)]}, {"2029": [(D(9, 18), 3.5)]}) == []


def test_diferenca_asof():
    assert f.diferenca_asof([(D(9, 26), 8.0)], [(D(9, 25), 5.0)]) == [(D(9, 26), 3.0)]


def test_percentil_ponderado_primeiro_item_que_atinge():
    # ordenado: -0,5 (20%), 0,1 (30%) -> acumulado 50%, 0,4 (25%), 1,2 (25%)
    itens = [(0.4, 25), (1.2, 25), (-0.5, 20), (0.1, 30)]
    assert f.percentil_ponderado(itens, 0.50) == 0.1
    assert f.percentil_ponderado(itens, 0.55) == 0.4
    assert f.percentil_ponderado(itens, 0.20) == -0.5


def test_percentil_ignora_peso_zero_e_exige_itens():
    assert f.percentil_ponderado([(9.0, 0), (1.0, 1)], 0.5) == 1.0
    with pytest.raises(ValueError):
        f.percentil_ponderado([(1.0, 0)], 0.5)


def test_percentil_mensal_casa_variacao_e_peso_do_mesmo_mes():
    var = {"a": [(D(1), 0.1), (D(2), 0.9)], "b": [(D(1), 0.5), (D(2), 0.2)]}
    pes = {"a": [(D(1), 60.0), (D(2), 40.0)], "b": [(D(1), 40.0), (D(2), 60.0)]}
    assert f.percentil_mensal(var, pes, 0.5) == [(D(1), 0.1), (D(2), 0.2)]
