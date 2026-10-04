"""Configuração do acesso do site: endereço e permissões, no Postgres de teste."""
import os

import pytest

from argus_pipeline import configurar_site as cs
from argus_pipeline import db

URL = os.environ.get("TEST_DATABASE_URL")


def test_url_troca_so_usuario_e_senha():
    dono = "postgresql://neondb_owner:segredo@ep-x-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"
    assert cs.url_do_site(dono, "Abc123") == (
        "postgresql://argus_site:Abc123@ep-x-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require")


def test_cria_usuario_que_le_e_nao_escreve():
    if not URL:
        pytest.skip("TEST_DATABASE_URL não definida")
    with db.connect(URL) as c:
        with c.cursor() as cur:
            cur.execute("drop schema public cascade; create schema public;")
        c.commit()
        db.apply_migrations(c)
    cs.criar_usuario(URL, "SenhaDeTeste123")
    cs.criar_usuario(URL, "SenhaDeTeste456")  # segunda vez troca a senha, sem erro
    url_site = cs.url_do_site(URL, "SenhaDeTeste456")
    cs.conferir_so_leitura(url_site)
