"""Adapters disponíveis por forma de acesso (campo 'acesso' do catálogo)."""
from argus_pipeline.adapters import focus, sgs

ADAPTERS = {
    "sgs": sgs.fetch,
    "focus": focus.fetch,
}
