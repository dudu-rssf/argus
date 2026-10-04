"""Adapter do IBGE SIDRA (API de agregados v3).

Código no catálogo: `t<tabela>/v<var>[,<var>...][/c<classificação>=<cat>[,<cat>...]|all]`
(ex.: `t8888/v12606,12607/c544=129314,129315`). Vários códigos na mesma série
do catálogo são separados por ` ; `.

Sub-séries: quando o código pede mais de uma variável e/ou mais de uma categoria,
cada combinação vira uma sub-série `<variável>.<categoria>` (só a parte que varia).
Sempre Brasil (N1). Valores com marcador do IBGE ('...', '..', 'X') são ausência
de dado e ficam de fora; '-' é zero absoluto pela convenção do IBGE.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from datetime import date

import httpx

from argus_pipeline.adapters.base import AdapterError, Observacao

BASE = "https://servicodados.ibge.gov.br/api/v3/agregados"
UA = {"User-Agent": "argus-coleta/0.1 (projeto pessoal; github.com/dudu-rssf/argus)"}
MAX_VALORES = 40_000  # a API recusa pedidos acima de 100 mil valores; margem folgada

_CODIGO = re.compile(r"^t(\d+)/v(\d+(?:,\d+)*)(?:/c(\d+)=(all|\d+(?:,\d+)*))?$")
_AUSENTE = {"...", "..", "X", ""}


@dataclass
class Spec:
    tabela: str
    variaveis: list[str]
    classificacao: str | None = None
    categorias: list[str] = field(default_factory=list)  # ["all"] = todas

    @property
    def todas(self) -> bool:
        return self.categorias == ["all"]


def parse_codigo(codigo: str) -> Spec:
    m = _CODIGO.match(codigo.strip())
    if not m:
        raise AdapterError(f"código SIDRA incompleto no catálogo: {codigo!r} "
                           "(esperado t<tabela>/v<variável>[/c<classificação>=<categorias>])")
    tabela, vars_, cls, cats = m.groups()
    return Spec(tabela, vars_.split(","), cls, cats.split(",") if cats else [])


# ---------------------------------------------------------------- períodos

def _trimestral(freq: str) -> bool:
    f = freq.lower()
    return f.startswith("trimestr") and "móvel" not in f and "movel" not in f


def _anual(freq: str) -> bool:
    return freq.lower().startswith("anual")


def periodo_para_data(periodo: int, freq: str) -> date:
    """AAAA, AAAAMM ou AAAATT -> data de início do período (trimestre móvel: mês final)."""
    periodo = int(periodo)
    if periodo < 10000:
        return date(periodo, 1, 1)
    ano, resto = divmod(periodo, 100)
    if _trimestral(freq):
        return date(ano, 3 * (resto - 1) + 1, 1)
    return date(ano, resto, 1)


def data_para_periodo(d: date, freq: str) -> int:
    if _anual(freq):
        return d.year
    if _trimestral(freq):
        return d.year * 100 + (d.month - 1) // 3 + 1
    return d.year * 100 + d.month


def lista_periodos(inicio: int, fim: int, freq: str) -> list[int]:
    if _anual(freq):
        return list(range(int(inicio), int(fim) + 1))
    passo = 4 if _trimestral(freq) else 12
    ano, p = divmod(int(inicio), 100)
    out = []
    while ano * 100 + p <= int(fim):
        out.append(ano * 100 + p)
        p += 1
        if p > passo:
            ano, p = ano + 1, 1
    return out


# ---------------------------------------------------------------- respostas

def _numero(texto: str) -> float | None:
    t = texto.strip()
    if t in _AUSENTE:
        return None
    if t == "-":
        return 0.0
    return float(t)


def parse_valores(texto: str, spec: Spec, freq: str) -> list[Observacao]:
    try:
        variaveis = json.loads(texto)
        if not isinstance(variaveis, list):
            raise ValueError(f"esperava lista, veio {type(variaveis).__name__}")
        varia_var = len(spec.variaveis) > 1
        varia_cat = spec.todas or len(spec.categorias) > 1
        obs: list[Observacao] = []
        for var in variaveis:
            for res in var["resultados"]:
                cat = None
                if res["classificacoes"]:
                    cat = next(iter(res["classificacoes"][0]["categoria"]))
                partes = ([str(var["id"])] if varia_var else []) + ([cat] if varia_cat and cat else [])
                sub = ".".join(partes)
                for serie in res["series"]:
                    for periodo, bruto in serie["serie"].items():
                        valor = _numero(bruto)
                        if valor is None:
                            continue
                        d = periodo_para_data(int(periodo), freq)
                        obs.append((d, valor, sub) if sub else (d, valor))
    except (ValueError, KeyError, TypeError, StopIteration) as e:
        raise AdapterError(f"SIDRA t{spec.tabela}: resposta inesperada ({e})") from e
    return sorted(obs, key=lambda o: (o[0], o[2] if len(o) > 2 else ""))


# ---------------------------------------------------------------- busca

def _get(client: httpx.Client, url: str) -> str:
    try:
        r = client.get(url)
    except httpx.HTTPError as e:
        raise AdapterError(f"SIDRA indisponível ({type(e).__name__})") from e
    if r.status_code != 200:
        raise AdapterError(f"SIDRA HTTP {r.status_code}: {r.text[:200]}")
    return r.text


def _conferir_metadados(spec: Spec, meta: dict) -> int:
    """Confere variáveis e categorias contra a tabela; devolve o nº de categorias pedidas."""
    existentes = {str(v["id"]) for v in meta.get("variaveis", [])}
    faltando = [v for v in spec.variaveis if v not in existentes]
    if faltando:
        raise AdapterError(f"SIDRA t{spec.tabela}: variável {', '.join(faltando)} não existe na tabela")
    if not spec.classificacao:
        return 1
    cls = next((c for c in meta.get("classificacoes", []) if str(c["id"]) == spec.classificacao), None)
    if cls is None:
        raise AdapterError(f"SIDRA t{spec.tabela}: classificação {spec.classificacao} não existe na tabela")
    ids = {str(c["id"]) for c in cls["categorias"]}
    if spec.todas:
        return len(ids)
    faltando = [c for c in spec.categorias if c not in ids]
    if faltando:
        raise AdapterError(f"SIDRA t{spec.tabela}: categoria {', '.join(faltando)} não existe")
    return len(spec.categorias)


def fetch(codigo: str, desde: date | None) -> list[Observacao]:
    spec = parse_codigo(codigo)
    with httpx.Client(timeout=120, headers=UA, follow_redirects=True) as client:
        try:
            meta = json.loads(_get(client, f"{BASE}/{spec.tabela}/metadados"))
            per = meta["periodicidade"]
            freq, inicio, fim = per["frequencia"], int(per["inicio"]), int(per["fim"])
        except (ValueError, KeyError) as e:
            raise AdapterError(f"SIDRA t{spec.tabela}: metadados inesperados ({e})") from e
        n_cat = _conferir_metadados(spec, meta)
        if desde:
            inicio = max(inicio, data_para_periodo(desde, freq))
        periodos = lista_periodos(inicio, fim, freq)
        por_pedido = max(1, MAX_VALORES // (len(spec.variaveis) * n_cat))

        params = "localidades=N1[all]"
        if spec.classificacao:
            params += f"&classificacao={spec.classificacao}[{','.join(spec.categorias)}]"
        obs: list[Observacao] = []
        for i in range(0, len(periodos), por_pedido):
            bloco = periodos[i:i + por_pedido]
            url = (f"{BASE}/{spec.tabela}/periodos/{bloco[0]}-{bloco[-1]}"
                   f"/variaveis/{'|'.join(spec.variaveis)}?{params}")
            obs.extend(parse_valores(_get(client, url), spec, freq))
    return obs
