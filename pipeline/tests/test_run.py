"""Testes do executor do validador, com verificações falsas (sem rede)."""
from datetime import date

from argus_pipeline.catalog import Series
from argus_pipeline.validate.checks import CheckResult
from argus_pipeline.validate.run import _md, validar

HOJE = date(2026, 10, 4)


def _s(id, fonte, codigo, freq="Mensal"):
    return Series(id=id, pais="BR", aba="A", bloco="B", indicador=f"Ind {id}", fonte=fonte,
                  codigo=codigo, frequencia=freq, unidade="%", tipo="Taxa", fase="MVP",
                  status="Confirmar")


def test_expande_codigos_e_usa_cache():
    chamadas = []

    def falso_sgs(c):
        chamadas.append(c)
        return CheckResult(codigo=c, titulo_oficial=f"T{c}", ultima_obs=date(2026, 9, 1))

    series = [_s("BR-1", "BCB SGS", "20539 / 20541"), _s("BR-2", "BCB SGS", "20539")]
    linhas = validar(series, {"sgs": falso_sgs}, HOJE)
    assert [l.codigo for l in linhas] == ["20539", "20541", "20539"]
    assert chamadas == ["20539", "20541"]  # 20539 consultado uma vez só
    assert all(l.situacao == "OK" for l in linhas)


def test_classifica_erro_desatualizada_e_manual():
    def falso_sgs(c):
        if c == "1":
            return CheckResult(codigo=c, erro="404")
        return CheckResult(codigo=c, titulo_oficial="T", ultima_obs=date(2025, 1, 1))

    series = [_s("BR-1", "BCB SGS", "1"), _s("BR-2", "BCB SGS", "2"), _s("BR-3", "FGV IBRE", "—")]
    sit = {l.id: l.situacao for l in validar(series, {"sgs": falso_sgs}, HOJE)}
    assert sit == {"BR-1": "Erro", "BR-2": "Desatualizada", "BR-3": "Não verificável"}


def test_relatorio_markdown_coloca_erros_primeiro():
    def falso_sgs(c):
        return CheckResult(codigo=c, erro="falhou") if c == "9" else \
            CheckResult(codigo=c, titulo_oficial="Título | com barra", ultima_obs=date(2026, 9, 1))

    linhas = validar([_s("BR-1", "BCB SGS", "1"), _s("BR-2", "BCB SGS", "9")], {"sgs": falso_sgs}, HOJE)
    md = _md(linhas, HOJE)
    corpo = md.split("| --- |")[-1]
    assert corpo.index("BR-2") < corpo.index("BR-1")
    assert "Título / com barra" in md
