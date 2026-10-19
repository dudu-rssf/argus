"use client";

/**
 * Decomposição por prazo (Fase 6f), versão genérica do cabo de guerra: seletor de 3, 6, 9
 * ou 12 meses; barras para a esquerda e para a direita; "?" com o que pode estar por trás
 * de cada item; à direita, o nível atual de cada item.
 */
import { useState } from "react";
import { RodapeFormula } from "@/components/formula";
import { Gaveta, PainelVerMais } from "@/components/gaveta";
import { Info } from "@/components/info";
import { fmtData, fmtNumero } from "@/lib/formato";
import type { Decomposicao, Prazo } from "@/lib/geral/motor";

const sinal = (v: number, c = 2) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${fmtNumero(Math.abs(v), c)}`;
const cor = (v: number) => (v > 0 ? "text-alta" : v < 0 ? "text-baixa" : "text-texto-3");
const PRAZOS: Prazo[] = [3, 6, 9, 12];

export function DecomposicaoInterativa({ d }: { d: Decomposicao }) {
  const [prazo, setPrazo] = useState<Prazo>(3);
  const { itens, antes } = d.porPrazo[prazo];
  const max = Math.max(0.01, ...itens.map((i) => Math.abs(i.delta)));
  const total = itens.reduce((s, i) => s + i.delta, 0);
  const atuais = itens.filter((i) => i.atual !== null);
  const maxAtual = Math.max(0.01, ...atuais.map((i) => Math.abs(i.atual!)));
  const u = d.unidade === "p.p." ? "p.p." : d.unidade;
  return (
    <article className="flex flex-col rounded-painel border border-linha bg-painel">
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold tracking-tight">{d.titulo}</h2>
          <Info titulo={d.titulo}>{d.explica}</Info>
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
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <div>
              <p className="text-xs text-texto-3">
                Mudança em {prazo} meses{antes ? ` (de ${fmtData(antes)} a ${d.data ? fmtData(d.data) : "—"})` : ""}, em {u}
                {d.aditiva && <> · {d.rotuloTotal.toLowerCase()}: <span className={cor(total)}>{sinal(total)} {u}</span></>}
              </p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {itens.map((i) => (
                  <li key={i.id} className="grid grid-cols-[20px_minmax(110px,190px)_minmax(0,1fr)_minmax(0,1fr)_60px] items-center gap-2 text-xs">
                    {d.porTras[i.id]?.length ? (
                      <Gaveta alvo="ver-mais-decomposicao" variante="icone" rotulo="O que pode estar por trás" titulo={`${i.nome}: o que pode estar por trás`}
                        subtitulo={`Prazo de ${prazo} meses · dados até ${d.data ? fmtData(d.data) : "—"}`}>
                        <p className="text-sm leading-relaxed text-texto-2">
                          No prazo de {prazo} meses, <b className="text-texto">{i.nome}</b> mudou <span className={`num ${cor(i.delta)}`}>{sinal(i.delta)} {u}</span>.
                        </p>
                        <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-texto-3">Influências típicas</h3>
                        <p className="mb-2 text-xs text-texto-3">Canais conhecidos que costumam mexer neste item. São possíveis explicações, não a causa comprovada do movimento.</p>
                        <ul className="flex flex-col gap-2">
                          {d.porTras[i.id].map((t) => <li key={t} className="rounded-controle border border-linha bg-fundo/40 px-3 py-2 text-sm leading-relaxed text-texto-2">{t}</li>)}
                        </ul>
                      </Gaveta>
                    ) : <span />}
                    <span className="truncate text-texto-2" title={i.nome}>{i.nome}</span>
                    <span className="flex justify-end">
                      {i.delta < 0 && <span className="h-3 rounded-l-sm bg-baixa/80" style={{ width: `${(Math.abs(i.delta) / max) * 100}%` }} />}
                    </span>
                    <span className="flex border-l border-linha-forte">
                      {i.delta > 0 && <span className="h-3 rounded-r-sm bg-alta/80" style={{ width: `${(i.delta / max) * 100}%` }} />}
                    </span>
                    <span className={`num text-right ${cor(i.delta)}`}>{sinal(i.delta)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 flex justify-between pl-7 text-[11px] text-texto-3"><span>{d.setas?.baixo ?? "← caiu"}</span><span>{d.setas?.cima ?? "subiu →"}</span></p>
              {!d.aditiva && <p className="mt-1 pl-7 text-[11px] text-texto-3">Os itens não somam um total: cada barra é lida sozinha.</p>}
            </div>
            {atuais.length > 0 && (
              <div>
                <p className="text-xs text-texto-3">{d.rotuloAtual ?? "Nível atual"}{d.data ? ` · ${fmtData(d.data)}` : ""}</p>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {[...atuais].sort((a, b) => b.atual! - a.atual!).map((i) => (
                    <li key={i.id} className="grid grid-cols-[minmax(110px,170px)_minmax(0,1fr)_56px] items-center gap-2 text-xs">
                      <span className="truncate text-texto-2" title={i.nome}>{i.nome}</span>
                      <span className="flex">
                        <span className={`h-3 rounded-sm ${i.atual! >= 0 ? "bg-ouro/70" : "bg-texto-3/60"}`} style={{ width: `${(Math.abs(i.atual!) / maxAtual) * 100}%` }} />
                      </span>
                      <span className="num text-right text-texto">{fmtNumero(i.atual!)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : <p className="text-sm text-texto-3">Sem dados suficientes para este prazo.</p>}
      </div>
      <PainelVerMais id="ver-mais-decomposicao" className="mx-5 mb-4" />
      <RodapeFormula formulas={[d.formula]} />
    </article>
  );
}
