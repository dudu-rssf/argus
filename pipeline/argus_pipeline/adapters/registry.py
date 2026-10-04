"""Adapters disponíveis por forma de acesso (campo 'acesso' do catálogo)."""
from argus_pipeline.adapters import comexstat, focus, fred, sgs, sidra, tesouro

ADAPTERS = {
    "sgs": sgs.fetch,
    "focus": focus.fetch,
    "sidra": sidra.fetch,
    "fred": fred.fetch,
    "comexstat": comexstat.fetch,
    "tesouro": tesouro.fetch,
}
