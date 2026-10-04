"""Sondagem das fontes ainda não validadas do MVP (Fase 0).

Cada teste imprime uma anotação '::notice::' do GitHub Actions. Nunca imprime URLs
com chave de API.

Uso: uv run python -m argus_pipeline.probe_fontes
"""
from __future__ import annotations

import json
import os
import time

import httpx

from argus_pipeline.validate.checks import BCB_PORTAL_BUSCA, redigir
from argus_pipeline.validate.search import normalizar

UA = {"User-Agent": "argus-sonda/0.1 (projeto pessoal; github.com/dudu-rssf/argus)"}


def notice(msg: str) -> None:
    print(f"::notice::{redigir(msg)[:900]}", flush=True)


def tentar(nome: str, fn) -> None:
    t = time.time()
    try:
        notice(f"{nome}: {fn()} ({time.time() - t:.1f}s)")
    except Exception as e:  # sondagem: qualquer falha vira relato, nunca exceção
        notice(f"{nome}: FALHOU {type(e).__name__}: {str(e)[:150]}")


def main() -> None:
    fmp = os.environ.get("FMP_API_KEY", "")
    with httpx.Client(headers=UA, timeout=60, follow_redirects=True) as c:

        # 0. Códigos candidatos no SGS (títulos via SOAP getUltimoValorVO)
        from argus_pipeline.validate.checks import _sgs_soap
        for cod in os.environ.get("SGS_CANDIDATOS", "").split():
            tentar(f"SGS {cod}", lambda cod=cod: "{} | última obs {}".format(*_sgs_soap(cod, c)))
        # URLs livres (sem chave) para testar
        for url in os.environ.get("URLS", "").split():
            tentar(f"URL {url[:70]}", lambda url=url: (lambda r: f"HTTP {r.status_code}, {len(r.text)} bytes, {r.headers.get('content-type','')[:30]}, inicio={r.text[:160]!r}")(c.get(url)))
        if os.environ.get("SO_SGS"):
            return

        # 1. Núcleos do IPCA no portal do BCB: lista todos os títulos com "núcleo"
        def nucleos():
            achados = set()
            for q in ["núcleo IPCA", "IPCA núcleo exclusão", "IPCA percentil", "núcleo P55", "núcleo EX3"]:
                for _ in range(3):
                    r = c.get(BCB_PORTAL_BUSCA, params={"q": q, "rows": 100})
                    try:
                        res = r.json()["result"]["results"]
                        break
                    except ValueError:
                        time.sleep(2)
                else:
                    continue
                for it in res:
                    cod = it.get("name", "").split("-")[0]
                    if cod.isdigit() and "nucleo" in normalizar(it.get("title", "")):
                        achados.add(f"{cod}={it['title'][-70:]}")
                time.sleep(1)
            return " | ".join(sorted(achados)) or "nenhum"
        tentar("SGS núcleos", nucleos)

        # 2. Comunicados e atas do Copom (API do site do BCB)
        def copom(tipo):
            def f():
                r = c.get(f"https://www.bcb.gov.br/api/servico/sitebcb/copom/{tipo}", params={"quantidade": 2})
                d = r.json()
                itens = d.get("conteudo", d) if isinstance(d, dict) else d
                prim = itens[0] if itens else {}
                return f"HTTP {r.status_code}, {len(itens)} itens, chaves={list(prim)[:8]}, ex={json.dumps(prim, ensure_ascii=False)[:200]}"
            return f
        tentar("BCB Copom comunicados", copom("comunicados"))
        tentar("BCB Copom atas", copom("atas"))
        tentar("BCB RSS notas", lambda: (lambda r: f"HTTP {r.status_code}, {r.text.count('<item')} itens, tipo={r.headers.get('content-type')}")(
            c.get("https://www.bcb.gov.br/api/feed/sitebcb/sitefeeds/notas")))

        # 3. Tesouro Transparente (CKAN): RTN
        def rtn():
            r = c.get("https://www.tesourotransparente.gov.br/ckan/api/3/action/package_search",
                      params={"q": "resultado do tesouro nacional", "rows": 5})
            res = r.json()["result"]["results"]
            out = []
            for p in res[:3]:
                recs = [(x.get("name", "")[:40], x.get("format"), (x.get("last_modified") or x.get("created") or "")[:10])
                        for x in p.get("resources", [])[:3]]
                out.append(f"{p['name']} -> {recs}")
            return f"HTTP {r.status_code}; " + " || ".join(out)
        tentar("Tesouro RTN (CKAN)", rtn)

        # 4. ComexStat (MDIC)
        tentar("ComexStat datas", lambda: (lambda r: f"HTTP {r.status_code}, {r.text[:200]}")(
            c.get("https://api-comexstat.mdic.gov.br/general/dates/updated")))

        def comex():
            corpo = {"flow": "export", "monthDetail": True,
                     "period": {"from": "2026-01", "to": "2026-12"}, "metrics": ["metricFOB"]}
            r = c.post("https://api-comexstat.mdic.gov.br/general", json=corpo)
            d = r.json()
            lista = d.get("data", {}).get("list", d.get("data", []))
            return f"HTTP {r.status_code}, {len(lista)} linhas, ult={json.dumps(lista[-1] if lista else {}, ensure_ascii=False)[:150]}"
        tentar("ComexStat exportações 2026", comex)

        # 5. Ibovespa no FMP (plano grátis)
        if not fmp:
            notice("FMP: sem FMP_API_KEY")
        for nome, url in [
            ("FMP stable ^BVSP", f"https://financialmodelingprep.com/stable/historical-price-eod/light?symbol=%5EBVSP&apikey={fmp}"),
            ("FMP v3 ^BVSP", f"https://financialmodelingprep.com/api/v3/historical-price-full/%5EBVSP?serietype=line&apikey={fmp}"),
            ("FMP stable EWZ", f"https://financialmodelingprep.com/stable/historical-price-eod/light?symbol=EWZ&apikey={fmp}"),
        ]:
            def fmp_f(url=url):
                r = c.get(url)
                txt = r.text
                try:
                    d = r.json()
                    hist = d if isinstance(d, list) else d.get("historical", d)
                    n = len(hist) if isinstance(hist, list) else "-"
                    prim = hist[0] if isinstance(hist, list) and hist else d
                    return f"HTTP {r.status_code}, {n} obs, primeiro={json.dumps(prim)[:140]}"
                except ValueError:
                    return f"HTTP {r.status_code}, {txt[:140]}"
            tentar(nome, fmp_f)
            time.sleep(1)


if __name__ == "__main__":
    main()
