"use client";

/**
 * Botão "Fórmula" e o painel que ele abre (decisão 0015). Uso:
 *   const [aberta, setAberta] = useState(false);
 *   <BotaoFormula aberta={aberta} alternar={() => setAberta(!aberta)} />
 *   {aberta && <PainelFormula formulas={[...]} />}
 * Ou, quando o botão pode ficar junto do painel, <Formulas formulas={[...]} />.
 */
import { useState } from "react";
import type { Formula } from "@/lib/formulas";

export function BotaoFormula({ aberta, alternar }: { aberta: boolean; alternar: () => void }) {
  return (
    <button type="button" onClick={alternar} aria-expanded={aberta} className={aberta ? "text-ouro" : "hover:text-texto"}>
      Fórmula
    </button>
  );
}

function Lista({ titulo, itens }: { titulo: string; itens?: string[] }) {
  if (!itens?.length) return null;
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-texto-3">{titulo}</p>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {itens.map((i) => <li key={i}>{i}</li>)}
      </ul>
    </div>
  );
}

export function PainelFormula({ formulas }: { formulas: Formula[] }) {
  return (
    <div className="flex flex-col gap-4 border-t border-linha bg-fundo/40 px-4 py-4 text-sm text-texto-2" role="region" aria-label="Fórmula e metodologia">
      {formulas.map((f) => (
        <section key={f.titulo} className="flex flex-col gap-3">
          <h4 className="font-medium text-texto">{f.titulo}</h4>
          <div className="flex flex-col gap-1 rounded-controle border border-linha bg-painel px-3 py-2">
            {f.formula.map((l) => <code key={l} className="num whitespace-pre-wrap text-texto">{l}</code>)}
          </div>
          <Lista titulo="Variáveis" itens={f.variaveis} />
          <Lista titulo="Metodologia" itens={f.metodologia} />
          <Lista titulo="Limitações" itens={f.limitacoes} />
        </section>
      ))}
    </div>
  );
}

/** Rodapé com o botão e o painel logo acima dele. */
export function RodapeFormula({ formulas, children }: { formulas: Formula[]; children?: React.ReactNode }) {
  const [aberta, setAberta] = useState(false);
  return (
    <>
      {aberta && <PainelFormula formulas={formulas} />}
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-linha px-4 py-2 text-xs text-texto-3">
        <span>{children}</span>
        <BotaoFormula aberta={aberta} alternar={() => setAberta(!aberta)} />
      </footer>
    </>
  );
}
