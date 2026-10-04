"""Testes da busca de séries (funções puras, sem rede)."""
from argus_pipeline.validate.search import candidatos_sgs, candidatos_sidra, contem_todos


def test_contem_todos_ignora_acento_e_caixa():
    assert contem_todos("Núcleo por exclusão - EX3", "nucleo ex3")
    assert not contem_todos("Núcleo por exclusão - EX2", "nucleo ex3")


def test_candidatos_sgs_so_series_com_codigo():
    resultados = [
        {"name": "27838-indice-nucleo-ex3", "title": "IPCA - Núcleo por exclusão - EX3"},
        {"name": "estatisticas-meios-pagamentos", "title": "Núcleo EX3 em relatório"},
        {"name": "16121-sgs", "title": "IPCA - Núcleo por exclusão - ex2"},
    ]
    assert candidatos_sgs(resultados, "núcleo ex3") == [("27838", "IPCA - Núcleo por exclusão - EX3")]


def test_candidatos_sidra_filtra_por_pesquisa():
    pesquisas = [
        {"nome": "Pesquisa Nacional por Amostra de Domicílios Contínua mensal",
         "agregados": [{"id": 6461, "nome": "Taxa de participação na força de trabalho"},
                       {"id": 6381, "nome": "Taxa de desocupação"}]},
        {"nome": "Censo Demográfico",
         "agregados": [{"id": 9999, "nome": "Taxa de participação"}]},
    ]
    achados = candidatos_sidra(pesquisas, "taxa de participação", pesquisa="continua mensal")
    assert [a[0] for a in achados] == ["t6461"]
