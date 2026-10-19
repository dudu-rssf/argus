"""Relógio da coleta (decisão 0018).

O agendamento do GitHub atrasa horas e pula horários. Este processo fica rodando dentro
de um workflow (até ~5h50) e, a cada minuto:
  1. dispara a Coleta quando um horário oficial venceu e nenhuma coleta começou depois dele;
  2. dispara a Coleta quando o site registrou um pedido do botão "Atualizar"
     (tabela pedidos_atualizacao), e marca o pedido como atendido.
Ao terminar, dispara a si mesmo (continuação), de modo que sempre há um relógio rodando.
O cron do próprio workflow só serve para religar se a corrente se romper.

Uso (no workflow "Relógio"): uv run python -m argus_pipeline.relogio [--continuacao]
Precisa de DATABASE_URL, GITHUB_TOKEN (permissão actions: write) e GITHUB_REPOSITORY.
"""
from __future__ import annotations

import argparse
import os
import time
from datetime import datetime, timedelta, timezone

import httpx

from argus_pipeline import db

BRT = timezone(timedelta(hours=-3))
HORARIOS = ["08:45", "09:30", "12:30", "15:30", "19:30"]  # decisão 0008
ATRASO_MAXIMO = timedelta(hours=3)
DURACAO = timedelta(hours=5, minutes=45)
INTERVALO = 60  # segundos
API = "https://api.github.com"


def horarios_do_dia(agora: datetime) -> list[datetime]:
    dia = agora.astimezone(BRT)
    if dia.weekday() >= 5:
        return []
    return [dia.replace(hour=int(h[:2]), minute=int(h[3:]), second=0, microsecond=0) for h in HORARIOS]


def ultimo_horario(agora: datetime) -> datetime | None:
    vencidos = [h for h in horarios_do_dia(agora) if h <= agora]
    return vencidos[-1] if vencidos else None


def precisa_coletar(agora: datetime, inicios_coleta: list[datetime]) -> bool:
    """Horário vencido há menos de 3 h e nenhuma coleta iniciada depois dele."""
    h = ultimo_horario(agora)
    if h is None or agora - h > ATRASO_MAXIMO:
        return False
    return not any(i >= h for i in inicios_coleta)


class GitHub:
    def __init__(self, token: str, repo: str, cliente: httpx.Client | None = None):
        self.repo = repo
        self.c = cliente or httpx.Client(timeout=30, headers={
            "Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "argus-relogio"})

    def execucoes(self, workflow: str, n: int = 20) -> list[dict]:
        r = self.c.get(f"{API}/repos/{self.repo}/actions/workflows/{workflow}/runs", params={"per_page": n})
        r.raise_for_status()
        return r.json().get("workflow_runs", [])

    def disparar(self, workflow: str, inputs: dict | None = None) -> None:
        r = self.c.post(f"{API}/repos/{self.repo}/actions/workflows/{workflow}/dispatches",
                        json={"ref": "main", "inputs": inputs or {}})
        if r.status_code != 204:
            raise RuntimeError(f"GitHub recusou o disparo de {workflow}: HTTP {r.status_code} {r.text[:200]}")


def _quando(run: dict) -> datetime:
    return datetime.fromisoformat(run["created_at"].replace("Z", "+00:00"))


def outro_relogio_ativo(gh: GitHub, meu_id: int) -> bool:
    return any(x["id"] != meu_id and x["status"] in ("queued", "in_progress", "waiting", "requested", "pending")
               for x in gh.execucoes("relogio.yml", 10))


def atender_pedidos(conn, gh: GitHub) -> int:
    with conn.cursor() as cur:
        cur.execute("select id from pedidos_atualizacao where atendido_em is null order by id")
        ids = [r[0] for r in cur.fetchall()]
        if not ids:
            return 0
        gh.disparar("coleta.yml", {"gatilho": "botao"})
        cur.execute("update pedidos_atualizacao set atendido_em = now() where id = any(%s)", (ids,))
    conn.commit()
    print(f"::notice::pedido do botão Atualizar atendido ({len(ids)})", flush=True)
    return len(ids)


def ciclo(conn, gh: GitHub, agora: datetime) -> None:
    inicios = [_quando(x) for x in gh.execucoes("coleta.yml", 10)]
    if precisa_coletar(agora, inicios):
        gh.disparar("coleta.yml", {"gatilho": "agenda"})
        print(f"::notice::coleta disparada para o horário {ultimo_horario(agora):%H:%M}", flush=True)
    atender_pedidos(conn, gh)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--continuacao", action="store_true", help="disparado pelo relógio anterior")
    args = ap.parse_args()
    gh = GitHub(os.environ["GITHUB_TOKEN"], os.environ["GITHUB_REPOSITORY"])
    meu_id = int(os.environ.get("GITHUB_RUN_ID", "0"))

    if args.continuacao:
        # espera o relógio anterior terminar (até 10 min)
        for _ in range(20):
            if not outro_relogio_ativo(gh, meu_id):
                break
            time.sleep(30)
    elif outro_relogio_ativo(gh, meu_id):
        print("::notice::já há um relógio rodando; este sai sem fazer nada")
        return

    fim = datetime.now(timezone.utc) + DURACAO
    with db.connect(os.environ["DATABASE_URL"]) as conn:
        db.apply_migrations(conn)
        while datetime.now(timezone.utc) < fim:
            try:
                ciclo(conn, gh, datetime.now(timezone.utc))
            except Exception as e:  # um erro passageiro não derruba o relógio; fica no log
                conn.rollback()
                print(f"::warning::ciclo do relógio falhou: {e}", flush=True)
            time.sleep(INTERVALO)
    gh.disparar("relogio.yml", {"continuacao": "true"})
    print("::notice::relógio encerrado; próximo disparado")


if __name__ == "__main__":
    main()
