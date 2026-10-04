"""Adapters disponíveis por forma de acesso (campo 'acesso' do catálogo)."""
from argus_pipeline.adapters import b3, comexstat, focus, fred, sgs, sidra, tesouro

ADAPTERS = {
    "sgs": sgs.fetch,
    "focus": focus.fetch,
    "sidra": sidra.fetch,
    "fred": fred.fetch,
    "comexstat": comexstat.fetch,
    "tesouro": tesouro.fetch,
    "b3": b3.fetch,
}
