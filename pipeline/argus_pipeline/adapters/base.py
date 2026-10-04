"""Contrato comum dos adapters.

Um adapter é uma função `fetch(codigo, desde) -> list[(data, valor)]`:
- `codigo`: o código da fonte (ex.: '433', 't1621', 'PAYEMS');
- `desde`: primeira data desejada, ou None para o histórico completo;
- devolve datas `date` e valores `float`, já normalizados;
- opcionalmente uma 3ª posição (texto) identifica a sub-série (ex.: ano de
  referência do Focus); cada sub-série vira uma série de dados '<id>@<sub>';
- qualquer falha da fonte vira `AdapterError` (nunca valor inventado).
"""
from __future__ import annotations

from datetime import date
from typing import Callable

Observacao = tuple[date, float] | tuple[date, float, str]
Fetcher = Callable[[str, "date | None"], list[Observacao]]


class AdapterError(Exception):
    """Falha da fonte: indisponível, formato inesperado, série inexistente."""
