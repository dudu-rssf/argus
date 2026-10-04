"""Adapter do BCB SGS (decisão 0009).

Via principal: SOAP getValoresSeriesXML (histórico completo em uma chamada).
Alternativa: API REST api.bcb.gov.br (janelas de até 10 anos).
"""
from __future__ import annotations

import html
import re
from datetime import date, datetime
from xml.etree import ElementTree

import httpx

from argus_pipeline.adapters.base import AdapterError, Observacao

SOAP_URL = "https://www3.bcb.gov.br/wssgs/services/FachadaWSSGS"
REST_URL = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.{code}/dados"
UA = {"User-Agent": "argus-coleta/0.1 (projeto pessoal; github.com/dudu-rssf/argus)"}
TIMEOUT = 120

_ENVELOPE = (
    '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" '
    'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
    'xmlns:xsd="http://www.w3.org/2001/XMLSchema" '
    'xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/" '
    'xmlns:pub="http://publico.ws.servico.sgs.bcb.gov.br">'
    '<soapenv:Body><pub:getValoresSeriesXML soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">'
    '<in0 xsi:type="soapenc:Array" soapenc:arrayType="xsd:long[1]"><item xsi:type="xsd:long">{code}</item></in0>'
    '<in1 xsi:type="xsd:string">{ini}</in1><in2 xsi:type="xsd:string">{fim}</in2>'
    "</pub:getValoresSeriesXML></soapenv:Body></soapenv:Envelope>"
)


def parse_data(texto: str) -> date:
    """'1/2025' (mês/ano), '1/9/2026' (dia/mês/ano) ou '2025' (ano)."""
    partes = [int(p) for p in texto.strip().split("/")]
    if len(partes) == 3:
        return date(partes[2], partes[1], partes[0])
    if len(partes) == 2:
        return date(partes[1], partes[0], 1)
    if len(partes) == 1:
        return date(partes[0], 1, 1)
    raise ValueError(f"data SGS inesperada: {texto!r}")


def parse_valores_xml(resposta: str) -> list[Observacao]:
    """Lê a resposta SOAP de getValoresSeriesXML. SOAP Fault vira AdapterError."""
    try:
        raiz = ElementTree.fromstring(resposta)
    except ElementTree.ParseError as e:
        raise AdapterError(f"SGS: resposta não é XML ({e})") from e
    for el in raiz.iter():
        if el.tag.split("}")[-1] == "faultstring":
            raise AdapterError(f"SGS: {el.text}")
    retorno = next((el.text for el in raiz.iter() if el.tag.split("}")[-1] == "getValoresSeriesXMLReturn"), None)
    if not retorno:
        raise AdapterError("SGS: resposta sem getValoresSeriesXMLReturn")
    interno = re.sub(r"^<\?xml[^>]*\?>", "", html.unescape(retorno).strip())
    try:
        series = ElementTree.fromstring(interno)
    except ElementTree.ParseError as e:
        raise AdapterError(f"SGS: XML interno inválido ({e})") from e
    obs = []
    for item in series.iter("ITEM"):
        data_txt, valor_txt = item.findtext("DATA"), item.findtext("VALOR")
        if not data_txt or valor_txt is None or not valor_txt.strip():
            continue  # sem valor publicado: não inventa
        obs.append((parse_data(data_txt), float(valor_txt)))
    obs.sort()
    return obs


def _via_soap(client: httpx.Client, code: str, ini: date) -> list[Observacao]:
    corpo = _ENVELOPE.format(code=int(code), ini=ini.strftime("%d/%m/%Y"),
                             fim=date.today().strftime("%d/%m/%Y"))
    r = client.post(SOAP_URL, content=corpo,
                    headers={"Content-Type": "text/xml; charset=utf-8", "SOAPAction": ""})
    if r.status_code >= 500 and "Fault" not in r.text:
        r.raise_for_status()
    return parse_valores_xml(r.text)


def _via_rest(client: httpx.Client, code: str, ini: date) -> list[Observacao]:
    obs: list[Observacao] = []
    fim_total = date.today()
    atual = ini
    while atual <= fim_total:  # janelas de até 10 anos (limite da API)
        fim = min(date(atual.year + 9, 12, 31), fim_total)
        r = client.get(REST_URL.format(code=code), params={
            "formato": "json", "dataInicial": atual.strftime("%d/%m/%Y"), "dataFinal": fim.strftime("%d/%m/%Y")})
        if r.status_code == 404:
            atual = date(fim.year + 1, 1, 1)
            continue
        r.raise_for_status()
        for linha in r.json():
            obs.append((datetime.strptime(linha["data"], "%d/%m/%Y").date(), float(linha["valor"])))
        atual = date(fim.year + 1, 1, 1)
    obs.sort()
    return obs


def fetch(code: str, desde: date | None) -> list[Observacao]:
    ini = desde or date(1900, 1, 1)
    with httpx.Client(headers=UA, timeout=TIMEOUT, follow_redirects=True) as client:
        try:
            return _via_soap(client, code, ini)
        except AdapterError:
            raise  # a fonte respondeu e disse que há problema (ex.: série inexistente)
        except httpx.HTTPError as e_soap:
            try:
                return _via_rest(client, code, max(ini, date(1980, 1, 1)))
            except (httpx.HTTPError, ValueError, KeyError) as e_rest:
                raise AdapterError(f"SGS {code}: soap ({type(e_soap).__name__}) e rest "
                                   f"({type(e_rest).__name__}) falharam") from e_rest
