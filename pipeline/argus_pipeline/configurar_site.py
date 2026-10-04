"""Configura o acesso do site ao banco, sem nenhuma senha passar por pessoas ou logs.

1. Cria (ou troca a senha de) `argus_site` no Neon, só com permissão de leitura.
2. Confere que ele conecta e que NÃO consegue escrever.
3. Grava DATABASE_URL na Vercel (produção) e publica o site de novo.

Roda no workflow "Configurar site" com os segredos DATABASE (dono do banco) e VERCEL_TOKEN.
A senha nova é gerada aqui e mascarada no log; só existe no Neon e na Vercel.
"""
from __future__ import annotations

import os
import secrets
import string
import sys
import time
from urllib.parse import urlsplit, urlunsplit

import httpx
import psycopg

from argus_pipeline import db

USUARIO = "argus_site"
PROJETO = "argus"
API = "https://api.vercel.com"


def mascarar(valor: str) -> None:
    print(f"::add-mask::{valor}")


def url_do_site(url_dono: str, senha: str) -> str:
    """Mesmo endereço do dono, trocando só usuário e senha."""
    p = urlsplit(url_dono)
    host = p.hostname + (f":{p.port}" if p.port else "")
    return urlunsplit((p.scheme, f"{USUARIO}:{senha}@{host}", p.path, p.query, p.fragment))


def criar_usuario(url_dono: str, senha: str) -> None:
    with db.connect(url_dono) as conn, conn.cursor() as cur:
        cur.execute("select 1 from pg_roles where rolname = %s", (USUARIO,))
        existe = cur.fetchone() is not None
        verbo = "alter" if existe else "create"
        # Identificador fixo; a senha vai como literal escapado pelo próprio Postgres.
        cur.execute(psycopg.sql.SQL("{} role {} with login password {}").format(
            psycopg.sql.SQL(verbo), psycopg.sql.Identifier(USUARIO), psycopg.sql.Literal(senha)))
        conn.commit()
        db.apply_migrations(conn)  # reaplica db/permissoes.sql: só SELECT
    print(f"::notice::usuário {USUARIO} {'atualizado' if existe else 'criado'} com permissão só de leitura")


def conferir_so_leitura(url_site: str) -> None:
    with psycopg.connect(url_site, connect_timeout=20) as conn, conn.cursor() as cur:
        cur.execute("select count(*) from observations")
        n = cur.fetchone()[0]
        try:
            cur.execute("delete from events where id = '__teste_permissao__'")
            raise SystemExit("::error::argus_site conseguiu escrever no banco; abortado")
        except psycopg.errors.InsufficientPrivilege:
            conn.rollback()
    print(f"::notice::argus_site conecta, lê {n} observações e não consegue escrever")


def vercel(cliente: httpx.Client, metodo: str, caminho: str, **kw) -> dict:
    r = cliente.request(metodo, API + caminho, **kw)
    if r.status_code >= 400:
        raise SystemExit(f"::error::Vercel {metodo} {caminho.split('?')[0]}: HTTP {r.status_code} {r.text[:300]}")
    return r.json() if r.content else {}


def achar_projeto(cliente: httpx.Client) -> tuple[dict, dict]:
    """Projeto 'argus' na conta pessoal ou em algum time; devolve (projeto, parâmetros de escopo)."""
    escopos = [{}] + [{"teamId": t["id"]} for t in vercel(cliente, "GET", "/v2/teams").get("teams", [])]
    for escopo in escopos:
        r = cliente.get(f"{API}/v9/projects/{PROJETO}", params=escopo)
        if r.status_code == 200:
            return r.json(), escopo
    raise SystemExit(f"::error::projeto '{PROJETO}' não encontrado na Vercel com esse token")


def gravar_env_e_publicar(url_site: str) -> None:
    token = os.environ["VERCEL_TOKEN"]
    with httpx.Client(timeout=60, headers={"Authorization": f"Bearer {token}"}) as c:
        projeto, escopo = achar_projeto(c)
        pid = projeto["id"]
        envs = vercel(c, "GET", f"/v10/projects/{pid}/env", params=escopo).get("envs", [])
        for e in envs:
            if e["key"] == "DATABASE_URL":
                vercel(c, "DELETE", f"/v9/projects/{pid}/env/{e['id']}", params=escopo)
        vercel(c, "POST", f"/v10/projects/{pid}/env", params=escopo, json={
            "key": "DATABASE_URL", "value": url_site, "type": "encrypted", "target": ["production", "preview"]})
        nomes = sorted({e["key"] for e in envs} | {"DATABASE_URL"})
        print(f"::notice::Vercel: DATABASE_URL gravada; variáveis do projeto: {', '.join(nomes)}")

        ultimos = vercel(c, "GET", "/v6/deployments",
                         params={**escopo, "projectId": pid, "target": "production", "limit": 1})["deployments"]
        if not ultimos:
            raise SystemExit("::error::nenhuma publicação anterior para refazer")
        novo = vercel(c, "POST", "/v13/deployments", params={**escopo, "forceNew": 1}, json={
            "name": projeto["name"], "deploymentId": ultimos[0]["uid"], "target": "production"})
        print("::notice::nova publicação iniciada")
        for _ in range(60):
            time.sleep(10)
            d = vercel(c, "GET", f"/v13/deployments/{novo['id']}", params=escopo)
            if d.get("readyState") in ("READY", "ERROR", "CANCELED"):
                break
        estado = d.get("readyState")
        if estado != "READY":
            raise SystemExit(f"::error::publicação terminou em {estado}")
        print(f"::notice::site publicado: https://{d.get('alias', [d.get('url')])[0] if d.get('alias') else d.get('url')}")


def main() -> None:
    url_dono = os.environ["DATABASE_URL"]
    alfabeto = string.ascii_letters + string.digits
    senha = "".join(secrets.choice(alfabeto) for _ in range(32))
    mascarar(senha)
    url_site = url_do_site(url_dono, senha)
    mascarar(url_site)
    criar_usuario(url_dono, senha)
    conferir_so_leitura(url_site)
    if "--sem-vercel" not in sys.argv:
        gravar_env_e_publicar(url_site)


if __name__ == "__main__":
    main()
