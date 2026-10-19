"use client";

/**
 * "O que está mexendo no IPCA": cabo de guerra com seletor de prazo (3, 6, 9, 12 meses)
 * e, em cada grupo, um "?" que abre os subitens que mais mexeram (fato medido) e as
 * influências típicas do grupo (canais possíveis, não causa comprovada).
 */
import { useState } from "react";
import { RodapeFormula } from "@/components/formula";
import { Gaveta, PainelVerMais } from "@/components/gaveta";
import { Info } from "@/components/info";
import { fmtData, fmtNumero } from "@/lib/formato";
import type { Formula } from "@/lib/formulas";
import type { Movimento } from "@/lib/geral/composicao";
import type { GeralInflacao, Prazo } from "@/lib/geral/inflacao";

const sinal = (v: number, c = 2) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${fmtNumero(Math.abs(v), c)}`;
const cor = (v: number) => (v > 0 ? "text-alta" : v < 0 ? "text-baixa" : "text-texto-3");
const PRAZOS: Prazo[] = [3, 6, 9, 12];

function PorTras({ nome, delta, prazo, movimentos, influencias, desde }: {
  nome: string; delta: number; prazo: Prazo; movimentos: Movimento[]; influencias: string[]; desde: string | null;
}) {
  const direcao = delta > 0.005 ? "subiu" : delta < -0.005 ? "caiu" : "ficou praticamente estável";
  return (
    <>
      <p className="text-sm leading-relaxed text-texto-2">
        A contribuição de <b className="text-texto">{nome}</b> para o IPCA de 12 meses {direcao}
        {Math.abs(delta) > 0.005 && <> <span className={`num ${cor(delta)}`}>{sinal(delta)} p.p.</span></>} nos últimos {prazo} meses
        {desde && <> (desde {fmtData(desde)})</>}.
      </p>
      <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-texto-3">O que os dados mostram</h3>
      {movimentos.length ? (
        <>
          <p className="mb-2 text-sm text-texto-2">Subitens que mais mudaram a contribuição do grupo no período:</p>
          <table className="num w-full text-xs">
            <thead className="text-left text-texto-3"><tr><th className="py-1 font-sans font-normal">Subitem</th><th className="py-1 text-right font-normal">Mudança na contribuição</th><th className="py-1 text-right font-normal">Alta em 12m</th></tr></thead>
            <tbody>
              {movimentos.map((m) => (
                <tr key={m.id} className="border-t border-linha">
                  <td className="py-1.5 font-sans text-texto">{m.nome}</td>
                  <td className={`py-1.5 text-right ${cor(m.delta)}`}>{sinal(m.delta, 3)} p.p.</td>
                  <td className="py-1.5 text-right text-texto-2">{m.var12 === null ? "—" : `${fmtNumero(m.var12, 1)}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : <p className="text-sm text-texto-3">Sem subitens suficientes no banco para este prazo.</p>}
      <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-texto-3">Influências típicas deste grupo</h3>
      <p className="mb-2 text-xs text-texto-3">Canais conhecidos de formação de preço. São possíveis explicações para conferir nos subitens acima, não a causa comprovada do movimento.</p>
      <ul className="flex flex-col gap-2">
        {influencias.map((t) => <li key={t} className="rounded-controle border border-linha bg-fundo/40 px-3 py-2 text-sm leading-relaxed text-texto-2">{t}</li>)}
      </ul>
    </>
  );
}

export function CaboInterativo({ cabo, formula, explica }: { cabo: GeralInflacao["cabo"]; formula: Formula; explica: string }) {
  const [prazo, setPrazo] = useState<Prazo>(3);
  const { itens } = cabo.porPrazo[prazo];
  const desde = cabo.porPrazo[prazo].antes;
  const maxDelta = Math.max(0.01, ...itens.map((i) => Math.abs(i.delta)));
  const maxAtual = Math.max(0.01, ...itens.map((i) => Math.abs(i.atual)));
  const somaDelta = itens.reduce((s, i) => s + i.delta, 0);
  const titulo = "O que está mexendo no IPCA";

  return (
    <article className="flex flex-col rounded-painel border border-linha bg-painel">
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold tracking-tight">{titulo}</h2>
          <Info titulo={titulo}>{explica}</Info>
        </div>
        <div role="group" aria-label="Prazo da comparação" className="flex rounded-controle border border-linha p-0.5 text-xs">
          {PRAZOS.map((k) => (
            <button key={k} type="button" onClick={() => setPrazo(k)} aria-pressed={prazo === k}
              className={`num rounded-controle px-2.5 py-1 ${prazo === k ? "bg-ouro-tenue font-medium text-ouro" : "text-texto-2 hover:text-texto"}`}>
              {k}m
            </button>
          ))}
        </div>
      </header>
      <div className="flex-1 px-5 py-4">
        {itens.length ? (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div>
              <p className="text-xs text-texto-3">Mudança da contribuição em {prazo} meses{desde ? ` (desde ${fmtData(desde)})` : ""}, em p.p. · total <span className={cor(somaDelta)}>{sinal(somaDelta)} p.p.</span></p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {itens.map((i) => (
                  <li key={i.id} className="grid grid-cols-[20px_150px_minmax(0,1fr)_minmax(0,1fr)_52px] items-center gap-2 text-xs">
                    <Gaveta alvo="ver-mais-cabo" variante="icone" rotulo="Por que mexeu" titulo={`${i.nome}: o que pode estar por trás`}
                      subtitulo={`Prazo de ${prazo} meses · dados até ${cabo.data ? fmtData(cabo.data) : "—"}`}>
                      <PorTras nome={i.nome} delta={i.delta} prazo={prazo} desde={desde}
                        movimentos={cabo.movimentos[i.id]?.[prazo] ?? []} influencias={cabo.influencias[i.id] ?? []} />
                    </Gaveta>
                    <span className="truncate text-texto-2" title={i.nome}>{i.nome}</span>
                    <span className="flex justify-end">
                      {i.delta < 0 && <span className="h-3 rounded-l-sm bg-baixa/80" style={{ width: `${(Math.abs(i.delta) / maxDelta) * 100}%` }} />}
                    </span>
                    <span className="flex border-l border-linha-forte">
                      {i.delta > 0 && <span className="h-3 rounded-r-sm bg-alta/80" style={{ width: `${(i.delta / maxDelta) * 100}%` }} />}
                    </span>
                    <span className={`num text-right ${cor(i.delta)}`}>{sinal(i.delta)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 flex justify-between pl-7 text-[11px] text-texto-3"><span>← puxou para baixo</span><span>empurrou para cima →</span></p>
              <p className="mt-1 pl-7 text-[11px] text-texto-3">Clique no <span className="rounded-full border border-linha-forte px-1">?</span> de cada grupo para ver os subitens e as possíveis influências.</p>
            </div>
            <div>
              <p className="text-xs text-texto-3">
                De onde vem o IPCA de 12 meses ({cabo.data ? fmtData(cabo.data) : "—"}): soma {fmtNumero(cabo.total)}%
                {cabo.oficial && <> · oficial {fmtNumero(cabo.oficial.valor)}% (diferença de {fmtNumero(Math.abs(cabo.oficial.valor - cabo.total))} p.p. por ser soma, não composto)</>}
              </p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {[...itens].sort((a, b) => b.atual - a.atual).map((i) => (
                  <li key={i.id} className="grid grid-cols-[150px_minmax(0,1fr)_52px] items-center gap-2 text-xs">
                    <span className="truncate text-texto-2" title={i.nome}>{i.nome}</span>
                    <span className="h-3 rounded-sm bg-ouro/70" style={{ width: `${(Math.max(0, i.atual) / maxAtual) * 100}%` }} />
                    <span className="num text-right text-texto">{fmtNumero(i.atual)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : <p className="text-sm text-texto-3">Sem dados de grupos do IPCA no banco.</p>}
      </div>
      <PainelVerMais id="ver-mais-cabo" className="mx-5 mb-4" />
      <RodapeFormula formulas={[formula]} />
    </article>
  );
}
