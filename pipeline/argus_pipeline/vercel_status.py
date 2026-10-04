"""Mostra as últimas publicações do site na Vercel e, se a mais recente falhou, o erro do build.

Uso: uv run python -m argus_pipeline.vercel_status   (com VERCEL_TOKEN)
"""
from __future__ import annotations

import os

import httpx

from argus_pipeline.configurar_site import API, achar_projeto, vercel


def main() -> None:
    with httpx.Client(timeout=60, headers={"Authorization": f"Bearer {os.environ['VERCEL_TOKEN']}"}) as c:
        projeto, escopo = achar_projeto(c)
        deps = vercel(c, "GET", "/v6/deployments", params={**escopo, "projectId": projeto["id"], "limit": 3})["deployments"]
        for d in deps:
            sha = (d.get("meta") or {}).get("githubCommitSha", "")[:7]
            print(f"::notice::{d.get('target') or 'preview'} {d['state']} commit {sha or '—'} {d['url']}")
        if deps and deps[0]["state"] == "ERROR":
            eventos = c.get(f"{API}/v3/deployments/{deps[0]['uid']}/events", params={**escopo, "limit": 200}).json()
            linhas = [e.get("payload", {}).get("text") or e.get("text", "") for e in eventos if isinstance(e, dict)]
            for l in [x for x in linhas if x and ("rror" in x or "failed" in x.lower())][-15:]:
                print(f"::warning::{l[:300]}")


if __name__ == "__main__":
    main()
