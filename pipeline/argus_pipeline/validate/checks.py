"""Verificações por fonte: título oficial e data da última observação.

Cada função devolve um CheckResult. Falha nunca vira dado inventado: o resultado
traz ok=False e a mensagem de erro (CLAUDE.md, regra 4).
"""
from __future__ import annotations

import re
import time
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from urllib.parse import quote, urlencode
from xml.etree import ElementTree

import httpx

from argus_pipeline.adapters.sidra import periodo_para_data

PAUSA_S = 0.6  # intervalo entre chamadas para não estourar limite das fontes
TENTATIVAS = 3

SGS_ULTIMO = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.{code}/dados/ultimos/1?formato=json"
BCB_PORTAL_BUSCA = "https://dadosabertos.bcb.gov.br/api/3/action/package_search"
SGS_SOAP = "https://www3.bcb.gov.br/wssgs/services/FachadaWSSGS"
SIDRA_META = "https://servicodados.ibge.gov.br/api/v3/agregados/{tabela}/metadados"
FOCUS_BASE = "https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/{endpoint}"
FRED_SERIES = "https://api.stlouisfed.org/fred/series"

_SOAP_BODY = (
    '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" '
    'xmlns:pub="http://publico.ws.servico.sgs.bcb.gov.br">'
    "<soapenv:Body><pub:getUltimoValorVO><in0>{code}</in0></pub:getUltimoValorVO></soapenv:Body>"
    "</soapenv:Envelope>"
)

# Defasagem máxima aceitável da última observação, por frequência
_LIMITE_DIAS = {
    "diária": 10,
    "semanal": 21,
    "mensal": 110,  # IBGE divulga ~40 dias após o mês; data = início do mês
    "trimestral": 270,
    "semestral": 300,
    "anual": 730,
}


_SEGREDO_RE = re.compile(r"(api_key|apikey|token|key)=[^&\s'\"]+", re.IGNORECASE)


def redigir(texto: str) -> str:
    """Remove chaves de API de URLs em mensagens (o relatório é público)."""
    return _SEGREDO_RE.sub(r"\1=***", texto)


@dataclass
class CheckResult:
    codigo: str
    titulo_oficial: str | None = None
    origem_titulo: str | None = None
    ultima_obs: date | None = None
    erro: str | None = None

    @property
    def ok(self) -> bool:
        return self.erro is None and self.titulo_oficial is not None and self.ultima_obs is not None


def _get(client: httpx.Client, url: str, **kw) -> httpx.Response:
    """GET com retry e backoff exponencial em 429/5xx."""
    for tentativa in range(TENTATIVAS):
        resp = client.get(url, timeout=30, **kw)
        if resp.status_code not in (429, 500, 502, 503, 504):
            break
        time.sleep(PAUSA_S * 2 ** (tentativa + 1))
    time.sleep(PAUSA_S)
    resp.raise_for_status()
    return resp


def is_stale(frequencia: str, ultima: date, hoje: date | None = None) -> bool:
    hoje = hoje or date.today()
    chave = frequencia.lower().split()[0].rstrip(",")
    limite = next((d for k, d in _LIMITE_DIAS.items() if chave.startswith(k[:5])), 400)
    return (hoje - ultima) > timedelta(days=limite)


# ---------------------------------------------------------------- SGS

def _sgs_titulo_portal(code: str, client: httpx.Client) -> str | None:
    resp = _get(client, BCB_PORTAL_BUSCA, params={"q": code, "rows": 50})
    for item in resp.json().get("result", {}).get("results", []):
        if item.get("name", "").split("-")[0] == code:
            return item.get("title")
    return None


def parse_sgs_soap(xml: str) -> tuple[str | None, date | None]:
    """Lê a resposta SOAP-encoded do SGS (getUltimoValorVO).

    Os campos vêm como referências (<ano href="#id13"/>) a nós <multiRef id="id13">,
    então cada valor é resolvido pelo id.
    """
    raiz = ElementTree.fromstring(xml)
    por_id = {el.get("id"): el for el in raiz.iter() if el.get("id")}

    def local(el):
        return el.tag.split("}")[-1]

    def valor(el):
        ref = el.get("href")
        alvo = por_id.get(ref[1:]) if ref else el
        return alvo.text.strip() if alvo is not None and alvo.text else None

    serie = next((el for el in raiz.iter() if el.get("id") and any(local(c) == "nomeCompleto" for c in el)), None)
    if serie is None:
        return None, None
    campos = {local(c): c for c in serie}
    titulo = valor(campos["nomeCompleto"]) if "nomeCompleto" in campos else None
    data = None
    if "ultimoValor" in campos:
        uv = campos["ultimoValor"]
        uv = por_id.get(uv.get("href", "#")[1:], uv)
        partes = {local(c): valor(c) for c in uv}
        try:
            data = date(int(partes["ano"]), int(partes["mes"]), int(partes["dia"]))
        except (KeyError, TypeError, ValueError):
            data = None
    return titulo, data


def _sgs_soap(code: str, client: httpx.Client) -> tuple[str | None, date | None]:
    """Serviço legado do SGS: devolve (nome completo, data do último valor)."""
    resp = client.post(
        SGS_SOAP,
        content=_SOAP_BODY.format(code=code),
        headers={"Content-Type": "text/xml; charset=utf-8", "SOAPAction": ""},
        timeout=30,
    )
    time.sleep(PAUSA_S)
    resp.raise_for_status()
    return parse_sgs_soap(resp.text)


def check_sgs(code: str, client: httpx.Client) -> CheckResult:
    """Título: portal de dados abertos, senão SOAP. Última obs.: API REST, senão SOAP."""
    r = CheckResult(codigo=code)
    erros = []
    try:
        r.titulo_oficial = _sgs_titulo_portal(code, client)
        r.origem_titulo = "portal" if r.titulo_oficial else None
    except (httpx.HTTPError, ValueError) as e:
        erros.append(f"portal: {e}")
    try:
        dados = _get(client, SGS_ULTIMO.format(code=code)).json()
        r.ultima_obs = datetime.strptime(dados[-1]["data"], "%d/%m/%Y").date()
    except (httpx.HTTPError, ValueError, KeyError, IndexError) as e:
        erros.append(f"api rest: {e}")
    if r.titulo_oficial is None or r.ultima_obs is None:
        try:
            titulo, data = _sgs_soap(code, client)
            if r.titulo_oficial is None and titulo:
                r.titulo_oficial, r.origem_titulo = titulo, "soap"
            r.ultima_obs = r.ultima_obs or data
        except (httpx.HTTPError, ElementTree.ParseError, ValueError) as e:
            erros.append(f"soap: {e}")
    if r.titulo_oficial is None:
        erros.append("título oficial não encontrado")
    if r.ultima_obs is None:
        erros.append("última observação não encontrada")
    # Falha de uma via que foi coberta pela outra não é erro
    if r.titulo_oficial is None or r.ultima_obs is None:
        r.erro = "; ".join(erros)
    return r


# ---------------------------------------------------------------- SIDRA

def check_sidra(codigo: str, client: httpx.Client) -> CheckResult:
    tabela = re.search(r"t(\d+)", codigo).group(1)
    r = CheckResult(codigo=f"t{tabela}")
    try:
        meta = _get(client, SIDRA_META.format(tabela=tabela)).json()
        r.titulo_oficial = meta.get("nome")
        r.origem_titulo = "sidra"
        per = meta.get("periodicidade", {})
        if per.get("fim"):
            r.ultima_obs = periodo_para_data(per["fim"], per.get("frequencia", "mensal"))
    except (httpx.HTTPError, ValueError, KeyError) as e:
        r.erro = f"sidra: {e}"
    if not r.erro and (r.titulo_oficial is None or r.ultima_obs is None):
        r.erro = "metadados incompletos"
    return r


# ---------------------------------------------------------------- Focus

def check_focus(codigo: str, client: httpx.Client) -> CheckResult:
    partes = [p.strip() for p in codigo.split("·")]
    endpoint = partes[0]
    r = CheckResult(codigo=codigo, titulo_oficial=endpoint, origem_titulo="olinda")
    params = {"$top": "1", "$format": "json", "$orderby": "Data desc"}
    if len(partes) > 1:
        m = re.match(r"(\w+)='(.+)'", partes[1])
        if m:
            params["$filter"] = f"{m.group(1)} eq '{m.group(2)}'"
    # OData do BCB: espaço como %20 e '$' literal; httpx usaria '+' e '%24'
    url = FOCUS_BASE.format(endpoint=endpoint) + "?" + urlencode(params, quote_via=quote, safe="$'")
    try:
        valores = _get(client, url).json()["value"]
        r.ultima_obs = date.fromisoformat(valores[0]["Data"][:10])
    except (httpx.HTTPError, ValueError, KeyError, IndexError) as e:
        r.erro = f"focus: {e}"
    return r


# ---------------------------------------------------------------- FRED

_FRED_RE = re.compile(r"(?<![\w])([A-Z][A-Z0-9_]{2,})(?![\w])")


def fred_codes(codigo: str) -> list[str]:
    return [c for c in _FRED_RE.findall(codigo.replace("…", " "))]


def check_fred(code: str, client: httpx.Client, api_key: str | None) -> CheckResult:
    r = CheckResult(codigo=code)
    if not api_key:
        r.erro = "sem FRED_API_KEY configurada"
        return r
    try:
        s = _get(client, FRED_SERIES, params={"series_id": code, "api_key": api_key, "file_type": "json"}).json()
        serie = s["seriess"][0]
        r.titulo_oficial = serie["title"]
        r.origem_titulo = "fred"
        r.ultima_obs = date.fromisoformat(serie["observation_end"])
    except httpx.HTTPStatusError as e:
        r.erro = f"fred: HTTP {e.response.status_code} (série inexistente ou inválida)"
    except (httpx.HTTPError, ValueError, KeyError, IndexError) as e:
        r.erro = redigir(f"fred: {e}")
    return r
