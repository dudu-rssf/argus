"""Sondagem dos caminhos de acesso ao histórico do SGS a partir do GitHub Actions.

Diagnóstico pontual (decide o desenho do adapter da Fase 1). Imprime cada resultado
como anotação '::notice::' do GitHub Actions e grava amostras em tests/fixtures/real/.

Uso: uv run python -m argus_pipeline.probe_bcb
"""
from __future__ import annotations

import socket
import time
from pathlib import Path
from xml.etree import ElementTree

import httpx

from argus_pipeline.validate.checks import SGS_SOAP

FIX = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "real"
UA = {"User-Agent": "argus-sonda/0.1 (projeto pessoal; github.com/dudu-rssf/argus)"}

_ARRAY = (
    '<in0 xsi:type="soapenc:Array" soapenc:arrayType="xsd:long[1]">'
    '<item xsi:type="xsd:long">{code}</item></in0>'
)
_ENV = (
    '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" '
    'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
    'xmlns:xsd="http://www.w3.org/2001/XMLSchema" '
    'xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/" '
    'xmlns:pub="http://publico.ws.servico.sgs.bcb.gov.br">'
    "<soapenv:Body><pub:{op} soapenv:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\">"
    "{args}</pub:{op}></soapenv:Body></soapenv:Envelope>"
)


def notice(msg: str) -> None:
    print(f"::notice::{msg}", flush=True)


def dns(host: str) -> None:
    try:
        ips = sorted({a[4][0] for a in socket.getaddrinfo(host, 443)})
        notice(f"DNS {host}: {', '.join(ips[:3])}")
    except OSError as e:
        notice(f"DNS {host}: FALHOU ({e})")


def rest(client: httpx.Client, url: str, nome: str) -> None:
    t = time.time()
    try:
        r = client.get(url)
        n = len(r.json()) if r.headers.get("content-type", "").startswith("application/json") else "-"
        notice(f"{nome}: HTTP {r.status_code}, {n} obs, {time.time() - t:.1f}s")
    except (httpx.HTTPError, ValueError) as e:
        notice(f"{nome}: FALHOU ({type(e).__name__}: {str(e)[:80]})")


def soap(client: httpx.Client, op: str, args: str, arquivo: str) -> None:
    t = time.time()
    try:
        r = client.post(SGS_SOAP, content=_ENV.format(op=op, args=args),
                        headers={"Content-Type": "text/xml; charset=utf-8", "SOAPAction": ""})
        texto = r.text
        (FIX / arquivo).write_text(texto if "curto" in arquivo or "inexistente" in arquivo else texto[:30000], encoding="utf-8")
        # conta observações: getValoresSeriesXML devolve XML escapado com <ITEM>; VO devolve <item>
        n_item = texto.count("&lt;ITEM&gt;") + texto.count("<ITEM>")
        n_vo = texto.count("WSValorSerieVO")
        falha = "Fault" in texto
        notice(f"SOAP {op}: HTTP {r.status_code}, {len(texto)} bytes, ITEM={n_item}, VO={n_vo}, "
               f"fault={falha}, {time.time() - t:.1f}s")
    except httpx.HTTPError as e:
        notice(f"SOAP {op}: FALHOU ({type(e).__name__}: {str(e)[:80]})")


def main() -> None:
    FIX.mkdir(parents=True, exist_ok=True)
    for h in ["api.bcb.gov.br", "www3.bcb.gov.br", "olinda.bcb.gov.br"]:
        dns(h)
    with httpx.Client(headers=UA, timeout=120, follow_redirects=True) as client:
        rest(client, "https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json"
                     "&dataInicial=01/01/2016&dataFinal=01/10/2026", "REST api.bcb 433 (10 anos)")
        soap(client, "getValoresSeriesXML",
             _ARRAY.format(code=433)
             + '<in1 xsi:type="xsd:string">01/01/1980</in1><in2 xsi:type="xsd:string">01/10/2026</in2>',
             "sgs_soap_valoresxml_433.xml")
        soap(client, "getValoresSeriesVO",
             _ARRAY.format(code=433)
             + '<in1 xsi:type="xsd:string">01/01/1980</in1><in2 xsi:type="xsd:string">01/10/2026</in2>',
             "sgs_soap_valoresvo_433.xml")
        # amostras curtas e completas para testes de contrato (fixtures)
        for cod, ini, fim, arq in [
            (433, "01/01/2025", "01/10/2026", "sgs_xml_433_curto.xml"),
            (1, "01/09/2026", "03/10/2026", "sgs_xml_1_curto.xml"),
            (999999, "01/01/2026", "01/10/2026", "sgs_xml_inexistente.xml"),
        ]:
            soap(client, "getValoresSeriesXML",
                 _ARRAY.format(code=cod)
                 + f'<in1 xsi:type="xsd:string">{ini}</in1><in2 xsi:type="xsd:string">{fim}</in2>', arq)
        # série diária longa: Selic meta desde 1999
        soap(client, "getValoresSeriesXML",
             _ARRAY.format(code=432)
             + '<in1 xsi:type="xsd:string">01/01/1999</in1><in2 xsi:type="xsd:string">01/10/2026</in2>',
             "sgs_soap_valoresxml_432.xml")


if __name__ == "__main__":
    main()
