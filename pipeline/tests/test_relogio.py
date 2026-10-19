"""Relógio (decisão 0018): horários da coleta e regra de disparo, sem rede."""
from datetime import datetime, timedelta, timezone

from argus_pipeline import relogio as r

BRT = timezone(timedelta(hours=-3))


def test_horarios_so_em_dia_util():
    seg = datetime(2026, 10, 19, 10, 0, tzinfo=BRT)
    sab = datetime(2026, 10, 17, 10, 0, tzinfo=BRT)
    assert [h.strftime("%H:%M") for h in r.horarios_do_dia(seg)] == ["08:45", "09:30", "12:30", "15:30", "19:30"]
    assert r.horarios_do_dia(sab) == []


def test_ultimo_horario_vencido():
    agora = datetime(2026, 10, 19, 13, 0, tzinfo=BRT)
    assert r.ultimo_horario(agora).strftime("%H:%M") == "12:30"
    assert r.ultimo_horario(datetime(2026, 10, 19, 8, 0, tzinfo=BRT)) is None
    # fim de semana: nenhum
    assert r.ultimo_horario(datetime(2026, 10, 18, 13, 0, tzinfo=BRT)) is None


def test_dispara_so_se_nenhuma_coleta_comecou_depois_do_horario():
    agora = datetime(2026, 10, 19, 13, 0, tzinfo=BRT)
    antes = (datetime(2026, 10, 19, 9, 31, tzinfo=BRT)).astimezone(timezone.utc)
    depois = (datetime(2026, 10, 19, 12, 31, tzinfo=BRT)).astimezone(timezone.utc)
    assert r.precisa_coletar(agora, [antes]) is True
    assert r.precisa_coletar(agora, [antes, depois]) is False
    assert r.precisa_coletar(agora, []) is True


def test_horario_muito_atrasado_nao_dispara():
    # passou mais de 3 h do horário (ex.: o relógio esteve parado): espera o próximo
    agora = datetime(2026, 10, 19, 15, 40, tzinfo=BRT)  # 15:30 venceu há 10 min → dispara
    assert r.precisa_coletar(agora, []) is True
    tarde = datetime(2026, 10, 19, 23, 0, tzinfo=BRT)  # 19:30 venceu há 3h30
    assert r.precisa_coletar(tarde, []) is False
