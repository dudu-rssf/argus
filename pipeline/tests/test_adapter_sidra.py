"""Testes de contrato do adapter SIDRA, com respostas reais gravadas em 2026-10-04."""
from datetime import date
from pathlib import Path

import httpx
import pytest
import respx

from argus_pipeline.adapters import sidra
from argus_pipeline.adapters.base import AdapterError

REAL = Path(__file__).parent / "fixtures" / "real"


def _ler(nome):
    return (REAL / nome).read_text(encoding="utf-8")


# ---------- código do catálogo ----------

def test_parse_codigo_completo():
    spec = sidra.parse_codigo("t8888/v12606,12607/c544=129314,129315")
    assert spec.tabela == "8888"
    assert spec.variaveis == ["12606", "12607"]
    assert spec.classificacao == "544"
    assert spec.categorias == ["129314", "129315"]


def test_parse_codigo_sem_classificacao():
    spec = sidra.parse_codigo("t6390/v5933")
    assert (spec.tabela, spec.variaveis, spec.classificacao, spec.categorias) == ("6390", ["5933"], None, [])


@pytest.mark.parametrize("ruim", ["t1621", "6390/v5933", "t6390/v", "t1/v2/c3"])
def test_codigo_incompleto_vira_adapter_error(ruim):
    with pytest.raises(AdapterError, match="código SIDRA"):
        sidra.parse_codigo(ruim)


# ---------- períodos ----------

@pytest.mark.parametrize("periodo,freq,esperado", [
    (202608, "mensal", date(2026, 8, 1)),
    (202602, "trimestral", date(2026, 4, 1)),   # 2º trimestre
    (202604, "trimestral", date(2026, 10, 1)),
    (202608, "trimestral móvel", date(2026, 8, 1)),  # PNAD: mês final do trimestre móvel
    (2025, "anual", date(2025, 1, 1)),
])
def test_periodo_para_data(periodo, freq, esperado):
    assert sidra.periodo_para_data(periodo, freq) == esperado


@pytest.mark.parametrize("d,freq,esperado", [
    (date(2026, 8, 15), "mensal", 202608),
    (date(2026, 5, 1), "trimestral", 202602),
    (date(2026, 8, 1), "trimestral móvel", 202608),
    (date(2025, 6, 1), "anual", 2025),
])
def test_data_para_periodo(d, freq, esperado):
    assert sidra.data_para_periodo(d, freq) == esperado


def test_lista_periodos_trimestral_atravessa_o_ano():
    assert sidra.lista_periodos(202503, 202602, "trimestral") == [202503, 202504, 202601, 202602]


def test_lista_periodos_mensal():
    assert sidra.lista_periodos(202511, 202602, "mensal") == [202511, 202512, 202601, 202602]


# ---------- normalização das respostas reais ----------

def test_parse_pim_duas_variaveis_duas_categorias():
    spec = sidra.parse_codigo("t8888/v12606,12607/c544=129314,129315")
    obs = sidra.parse_valores(_ler("sidra_val_8888.json"), spec, "mensal")
    assert len(obs) == 12  # 2 variáveis x 2 categorias x 3 meses
    assert (date(2026, 1, 1), 95.20237, "12606.129314") in obs
    assert (date(2026, 3, 1), 118.1893, "12607.129315") in obs
    assert all(isinstance(v, float) for _, v, _ in obs)


def test_parse_pib_trimestral_uma_variavel():
    spec = sidra.parse_codigo("t1621/v584/c11255=90707,90687")
    obs = sidra.parse_valores(_ler("sidra_val_1621.json"), spec, "trimestral")
    assert (date(2025, 1, 1), 193.81, "90707") in obs
    assert (date(2025, 4, 1), 288.87, "90687") in obs


def test_parse_uma_categoria_vira_serie_simples():
    spec = sidra.parse_codigo("t1621/v584/c11255=90707")
    texto = _ler("sidra_val_1621.json")
    obs = [o for o in sidra.parse_valores(texto, spec, "trimestral") if len(o) == 2]
    assert (date(2025, 4, 1), 194.5) in obs


def test_parse_pnad_sem_classificacao():
    spec = sidra.parse_codigo("t6390/v5933,5929")
    obs = sidra.parse_valores(_ler("sidra_val_6390.json"), spec, "trimestral móvel")
    assert (date(2026, 8, 1), 3777.0, "5933") in obs
    assert (date(2026, 6, 1), 3738.0, "5929") in obs


def test_parse_ipca_subitens_confere_com_sgs():
    spec = sidra.parse_codigo("t7060/v63,66/c315=all")
    obs = sidra.parse_valores(_ler("sidra_val_7060.json"), spec, "mensal")
    assert (date(2026, 8, 1), -0.32, "63.7169") in obs  # igual à série 433 do SGS
    assert (date(2026, 8, 1), 0.5018, "66.7173") in obs  # peso do arroz


def test_marcadores_do_ibge():
    """Convenção do IBGE: '-' é zero absoluto; '...', '..' e 'X' são ausência de dado."""
    texto = _ler("sidra_val_6390.json").replace('"3747"', '"..."').replace('"3760"', '"-"')
    spec = sidra.parse_codigo("t6390/v5933,5929")
    obs = dict(((d, s), v) for d, v, s in sidra.parse_valores(texto, spec, "trimestral móvel"))
    assert (date(2026, 6, 1), "5933") not in obs  # ausente, nunca inventado
    assert obs[(date(2026, 7, 1), "5933")] == 0.0


def test_resposta_vazia_nao_e_erro():
    spec = sidra.parse_codigo("t5944/v4096")
    assert sidra.parse_valores(_ler("sidra_val_5944_vazio.json"), spec, "trimestral móvel") == []


def test_resposta_fora_do_formato_vira_adapter_error():
    spec = sidra.parse_codigo("t5944/v4096")
    with pytest.raises(AdapterError, match="SIDRA"):
        sidra.parse_valores(_ler("sidra_val_erro.json"), spec, "mensal")


# ---------- fetch (sem rede) ----------

@respx.mock
def test_fetch_pede_so_a_janela_e_monta_a_url():
    respx.get(url__regex=r".*/agregados/8888/metadados$").respond(text=_ler("sidra_meta_8888.json"))
    rota = respx.get(url__regex=r".*/agregados/8888/periodos/.*").respond(text=_ler("sidra_val_8888.json"))
    obs = sidra.fetch("t8888/v12606,12607/c544=129314,129315", date(2026, 1, 1))
    url = str(rota.calls.last.request.url)
    assert "/periodos/202601-202608/variaveis/12606%7C12607" in url or "/periodos/202601-202608/variaveis/12606|12607" in url
    assert "localidades=N1" in url and "544" in url and "129315" in url
    assert len(obs) == 12


@respx.mock
def test_fetch_sem_desde_comeca_no_inicio_da_tabela():
    respx.get(url__regex=r".*/agregados/1621/metadados$").respond(text=_ler("sidra_meta_1621.json"))
    rota = respx.get(url__regex=r".*/agregados/1621/periodos/.*").respond(text=_ler("sidra_val_1621.json"))
    sidra.fetch("t1621/v584/c11255=90707,90687", None)
    assert "/periodos/199601-202602/" in str(rota.calls.last.request.url)


@respx.mock
def test_fetch_divide_pedidos_grandes():
    """A API limita 100 mil valores por pedido; a IPCA por subitem (457 categorias) é dividida."""
    respx.get(url__regex=r".*/agregados/7060/metadados$").respond(text=_ler("sidra_meta_7060.json"))
    rota = respx.get(url__regex=r".*/agregados/7060/periodos/.*").respond(text=_ler("sidra_val_7060.json"))
    sidra.fetch("t7060/v63,66/c315=all", None)
    assert rota.call_count >= 2
    assert "315[all]" in str(rota.calls.last.request.url).replace("%5B", "[").replace("%5D", "]")


@respx.mock
def test_erro_http_vira_adapter_error():
    respx.get(url__regex=r".*/agregados/8888/metadados$").respond(text=_ler("sidra_meta_8888.json"))
    respx.get(url__regex=r".*/agregados/8888/periodos/.*").respond(500, text=_ler("sidra_val_erro.json"))
    with pytest.raises(AdapterError, match="500"):
        sidra.fetch("t8888/v12607", date(2026, 1, 1))


@respx.mock
def test_variavel_fora_da_tabela_vira_adapter_error():
    respx.get(url__regex=r".*/agregados/8888/metadados$").respond(text=_ler("sidra_meta_8888.json"))
    with pytest.raises(AdapterError, match="99999"):
        sidra.fetch("t8888/v99999", date(2026, 1, 1))


@respx.mock
def test_metadados():
    respx.get(url__regex=r".*/agregados/7060/metadados$").respond(text=_ler("sidra_meta_7060.json"))
    meta = sidra.metadados("7060")
    assert meta["classificacoes"][0]["id"] == 315


# ---------- IBGE fora do ar: desistir rápido ----------

@pytest.fixture(autouse=True)
def _circuito_limpo():
    sidra.reiniciar_circuito()
    yield
    sidra.reiniciar_circuito()


def test_espera_de_conexao_e_curta():
    """Se o IBGE não aceita conexão, desistimos em segundos (a leitura de respostas grandes continua longa)."""
    assert sidra.TIMEOUT.connect <= 15
    assert sidra.TIMEOUT.read >= 120


@respx.mock
def test_depois_de_falhas_seguidas_de_conexao_nao_tenta_mais_nesta_rodada():
    rota = respx.get(url__regex=r".*/agregados/.*").mock(side_effect=httpx.ConnectTimeout("sem resposta"))
    respx.get(url__regex=r"https://apisidra.*").mock(side_effect=httpx.ConnectTimeout("sem resposta"))
    for _ in range(sidra.FALHAS_PARA_DESISTIR):
        with pytest.raises(AdapterError, match="indisponível"):
            sidra.fetch("t8888/v12607", date(2026, 1, 1))
    pedidos = rota.call_count
    with pytest.raises(AdapterError, match="não foi consultado nesta rodada"):
        sidra.fetch("t8888/v12607", date(2026, 1, 1))
    assert rota.call_count == pedidos


@respx.mock
def test_uma_resposta_boa_zera_a_contagem_de_falhas():
    respx.get(url__regex=r".*/agregados/9999/.*").mock(side_effect=httpx.ConnectError("recusado"))
    respx.get(url__regex=r"https://apisidra.*").respond(400, text="Parâmetro inexistente")
    respx.get(url__regex=r".*/agregados/8888/metadados$").respond(text=_ler("sidra_meta_8888.json"))
    respx.get(url__regex=r".*/agregados/8888/periodos/.*").respond(text=_ler("sidra_val_8888.json"))
    for _ in range(sidra.FALHAS_PARA_DESISTIR - 1):
        with pytest.raises(AdapterError):
            sidra.fetch("t9999/v1", date(2026, 1, 1))
    sidra.fetch("t8888/v12606,12607/c544=129314,129315", date(2026, 1, 1))
    for _ in range(sidra.FALHAS_PARA_DESISTIR - 1):
        with pytest.raises(AdapterError, match="indisponível"):
            sidra.fetch("t9999/v1", date(2026, 1, 1))


@respx.mock
def test_erro_http_nao_conta_como_fora_do_ar():
    """HTTP 500 é resposta do IBGE (o servidor está no ar); só falha de conexão abre o circuito."""
    respx.get(url__regex=r".*/agregados/8888/metadados$").respond(500, text="erro")
    for _ in range(sidra.FALHAS_PARA_DESISTIR + 1):
        with pytest.raises(AdapterError, match="500"):
            sidra.fetch("t8888/v12607", date(2026, 1, 1))


# ---------- endereço reserva do IBGE (apisidra), decisão 0014 ----------

@pytest.mark.parametrize("codigo, v3, reserva, freq", [
    ("t8888/v12606,12607/c544=129314,129315", "sidra_val_8888.json", "apisidra_8888.json", "mensal"),
    ("t1621/v584/c11255=90707,90687", "sidra_val_1621.json", "apisidra_1621.json", "trimestral"),
    ("t6390/v5933,5929", "sidra_val_6390.json", "apisidra_6390.json", "trimestral móvel"),
    ("t7060/v63,66/c315=7169,7170,7173", "sidra_val_7060.json", "apisidra_7060.json", "mensal"),
])
def test_reserva_devolve_exatamente_o_mesmo_que_o_principal(codigo, v3, reserva, freq):
    """Respostas reais dos dois endereços para os mesmos períodos: valores, datas e sub-séries idênticos."""
    spec = sidra.parse_codigo(codigo)
    obs_reserva, freq_reserva = sidra.parse_reserva(_ler(reserva), spec)
    assert freq_reserva == freq
    assert obs_reserva == sidra.parse_valores(_ler(v3), spec, freq)
    assert len(obs_reserva) >= 4


def test_reserva_uma_categoria_vira_serie_simples():
    spec = sidra.parse_codigo("t1621/v584/c11255=90707")
    obs, freq = sidra.parse_reserva(_ler("apisidra_1621_last.json"), spec)
    assert freq == "trimestral"
    assert all(len(o) == 2 for o in obs)
    assert (date(2025, 10, 1), 195.2) in obs


def test_reserva_url_e_periodos():
    spec = sidra.parse_codigo("t8888/v12606,12607/c544=129314,129315")
    assert sidra.url_reserva(spec, "all") == (
        "https://apisidra.ibge.gov.br/values/t/8888/n1/all/v/12606,12607/p/all/c544/129314,129315")
    assert sidra.url_reserva(sidra.parse_codigo("t6390/v5933"), "last 3").endswith("/v/5933/p/last 3")
    assert sidra.periodos_reserva(None, date(2026, 10, 15)) == "all"
    # janela desde ago/2026 em out/2026: 4 últimos períodos cobrem mensal e trimestral
    assert sidra.periodos_reserva(date(2026, 8, 1), date(2026, 10, 15)) == "last 4"


def test_reserva_resposta_estranha_vira_adapter_error():
    spec = sidra.parse_codigo("t8888/v12607")
    with pytest.raises(AdapterError, match="reserva"):
        sidra.parse_reserva(_ler("apisidra_erro.json"), spec)
    with pytest.raises(AdapterError, match="reserva"):
        sidra.parse_reserva("[]", spec)


@respx.mock
def test_principal_fora_do_ar_usa_a_reserva():
    respx.get(url__regex=r".*/agregados/.*").mock(side_effect=httpx.ConnectError("recusado"))
    rota = respx.get(url__regex=r"https://apisidra.*").respond(text=_ler("apisidra_8888.json"))
    obs = sidra.fetch("t8888/v12606,12607/c544=129314,129315", None)
    assert "/p/all/" in str(rota.calls.last.request.url)
    assert obs == sidra.parse_valores(_ler("sidra_val_8888.json"),
                                      sidra.parse_codigo("t8888/v12606,12607/c544=129314,129315"), "mensal")


@respx.mock
def test_reserva_respeita_a_janela_desde():
    respx.get(url__regex=r".*/agregados/.*").mock(side_effect=httpx.ConnectError("recusado"))
    respx.get(url__regex=r"https://apisidra.*").respond(text=_ler("apisidra_8888.json"))
    obs = sidra.fetch("t8888/v12606,12607/c544=129314,129315", date(2026, 2, 1))
    assert {o[0] for o in obs} == {date(2026, 2, 1), date(2026, 3, 1)}


@respx.mock
def test_principal_com_erro_http_nao_usa_a_reserva():
    """HTTP 500 é resposta do IBGE: o erro é registrado, sem trocar de endereço."""
    respx.get(url__regex=r".*/agregados/8888/metadados$").respond(500, text="erro")
    rota = respx.get(url__regex=r"https://apisidra.*").respond(text=_ler("apisidra_8888.json"))
    with pytest.raises(AdapterError, match="500"):
        sidra.fetch("t8888/v12607", None)
    assert rota.call_count == 0


@respx.mock
def test_os_dois_fora_do_ar_vira_um_erro_com_os_dois_motivos():
    respx.get(url__regex=r".*/agregados/.*").mock(side_effect=httpx.ConnectError("recusado"))
    respx.get(url__regex=r"https://apisidra.*").respond(400, text=_ler("apisidra_erro.json"))
    with pytest.raises(AdapterError, match=r"servicodados.*reserva.*99999"):
        sidra.fetch("t8888/v99999", None)
