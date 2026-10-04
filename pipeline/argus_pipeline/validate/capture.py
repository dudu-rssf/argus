"""Grava respostas reais das fontes em tests/fixtures/real/ (uma amostra por fonte).

Serve para dois fins: (1) inspecionar o formato verdadeiro de cada resposta e
(2) usar como fixtures nos testes de contrato (CLAUDE.md, regra 2).

Uso: uv run python -m argus_pipeline.validate.capture
"""
from __future__ import annotations

from pathlib import Path

import httpx

from argus_pipeline.validate.checks import (
    BCB_PORTAL_BUSCA,
    FOCUS_BASE,
    SGS_SOAP,
    SGS_ULTIMO,
    SIDRA_META,
    _SOAP_BODY,
)

DESTINO = Path(__file__).resolve().parents[2] / "tests" / "fixtures" / "real"


def main() -> None:
    DESTINO.mkdir(parents=True, exist_ok=True)
    amostras = [
        ("sgs_rest_433.json", "GET", SGS_ULTIMO.format(code="433"), None),
        ("sgs_soap_433.xml", "POST", SGS_SOAP, _SOAP_BODY.format(code="433")),
        ("bcb_portal_busca_433.json", "GET", f"{BCB_PORTAL_BUSCA}?q=433&rows=50", None),
        ("sidra_metadados_1621.json", "GET", SIDRA_META.format(tabela="1621"), None),
        ("focus_selic_top1.json", "GET",
         FOCUS_BASE.format(endpoint="ExpectativasMercadoSelic") + "?$top=1&$format=json&$orderby=Data%20desc", None),
    ]
    headers = {"User-Agent": "argus-validador/0.1 (projeto pessoal; github.com/dudu-rssf/argus)"}
    with httpx.Client(headers=headers, follow_redirects=True, timeout=30) as client:
        for nome, metodo, url, corpo in amostras:
            try:
                if metodo == "POST":
                    resp = client.post(url, content=corpo,
                                       headers={"Content-Type": "text/xml; charset=utf-8", "SOAPAction": ""})
                else:
                    resp = client.get(url)
                texto = resp.text
                status = resp.status_code
            except httpx.HTTPError as e:
                texto, status = f"ERRO DE CONEXÃO: {e!r}", "—"
            (DESTINO / nome).write_text(texto[:20000], encoding="utf-8")
            print(f"{nome}: HTTP {status}, {len(texto)} caracteres")


if __name__ == "__main__":
    main()
