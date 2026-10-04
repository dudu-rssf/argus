from argus_pipeline.conferir_abas import dados_das_abas, resolver


def test_resolver_ano():
    assert resolver("BR-046:X@{ano}", 2026) == "BR-046:X@2026"
    assert resolver("BR-046:X@{ano+3}", 2026) == "BR-046:X@2029"


def test_abas_reais_listam_series_com_id_do_catalogo():
    usados = dados_das_abas(2026)
    assert "BR-025:433" in usados
    assert all(":" in d and d.startswith("BR-") for d in usados)
