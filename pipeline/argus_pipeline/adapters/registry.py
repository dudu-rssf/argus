"""Adapters disponíveis por forma de acesso (campo 'acesso' do catálogo)."""
from argus_pipeline.adapters import focus, fred, sgs, sidra

ADAPTERS = {
    "sgs": sgs.fetch,
    "focus": focus.fetch,
    "sidra": sidra.fetch,
    "fred": fred.fetch,
}
