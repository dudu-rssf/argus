"use client";

/**
 * Protótipo B — Sinais: uma tabela única, como num terminal. Clique numa linha para abrir
 * o gráfico da medida.
 */
import { Fragment, useState } from "react";
import { PainelGrafico } from "@/components/grafico/painel-grafico";
import { Info } from "@/components/info";
import { Minicurva } from "@/components/minicurva";
import { fmtData, fmtNumero } from "@/lib/formato";
import { painelDe } from "@/lib/painel-de";
import type { Medida } from "@/lib/prototipos";
import type { Ponto } from "@/lib/transform";

const sinal = (v: number | null) => (v === null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${fmtNumero(Math.abs(v))}`);
const cor = (v: number | null) => (v === null || v === 0 ? "text-texto-3" : v > 0 ? "text-alta" : "text-baixa");

function Percentil({ p }: { p: number | null }) {
  if (p === null) return <span className="text-texto-3">—</span>;
  return (
    <span className="flex items-center justify-end gap-2" title={`Acima de ${p}% das observações dos últimos 10 anos`}>
      <span className="relative h-1.5 w-16 rounded-full bg-linha">
        <span className="absolute inset-y-0 left-0 rounded-full bg-ouro" style={{ width: `${p}%`, opacity: 0.35 + (p / 100) * 0.65 }} />
      </span>
      <span className="w-8 text-right">{p}</span>
    </span>
  );
}

export function ModeloSinais({ medidas, dados }: { medidas: Medida[]; dados: Record<string, Ponto[]> }) {
  const [aberta, setAberta] = useState<string | null>(null);
  const comD3 = medidas.filter((m) => m.fatos?.d3 != null);
  const caiu = comD3.filter((m) => m.fatos!.d3! < 0).length;
  const subiu = comD3.filter((m) => m.fatos!.d3! > 0).length;
  const grupos = [...new Set(medidas.map((m) => m.grupo))];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-x-8 gap-y-2 rounded-painel border border-linha bg-painel px-4 py-3">
        <p className="num text-sm text-texto-2">
          Em 3 meses: <span className="text-baixa">▼ {caiu} caíram</span> · <span className="text-alta">▲ {subiu} subiram</span> · de {comD3.length} medidas
        </p>
        <p className="num text-sm text-texto-2">
          Acima da meta: {medidas.filter((m) => (m.fatos?.vsMeta ?? -1) > 0).length} de {medidas.filter((m) => m.fatos?.vsMeta != null).length}
        </p>
      </div>
      <div className="overflow-x-auto rounded-painel border border-linha bg-painel">
        <table className="num w-full whitespace-nowrap text-xs">
          <thead className="text-left text-texto-3">
            <tr className="border-b border-linha">
              <th className="px-3 py-2 font-sans font-normal">Medida</th>
              <th className="px-3 py-2 text-right font-normal">Último</th>
              <th className="px-3 py-2 text-right font-normal">Δ 1m</th>
              <th className="px-3 py-2 text-right font-normal">Δ 3m</th>
              <th className="px-3 py-2 text-right font-normal">Δ 12m</th>
              <th className="px-3 py-2 text-right font-normal">Percentil 10 anos</th>
              <th className="px-3 py-2 text-right font-normal">vs meta</th>
              <th className="px-3 py-2 text-right font-normal">Sequência</th>
              <th className="w-32 px-3 py-2 font-normal">24 meses</th>
            </tr>
          </thead>
          <tbody>
            {grupos.map((g) => (
              <Fragment key={g}>
                <tr><td colSpan={9} className="bg-fundo/60 px-3 pb-1 pt-3 font-sans text-[11px] text-texto-3">{g}</td></tr>
                {medidas.filter((m) => m.grupo === g).map((m) => {
                  const f = m.fatos;
                  const ab = aberta === m.id;
                  const corte = f ? `${Number(f.ultimo.data.slice(0, 4)) - 2}${f.ultimo.data.slice(4)}` : "";
                  return (
                    <Fragment key={m.id}>
                      <tr onClick={() => setAberta(ab ? null : m.id)} className={`cursor-pointer border-t border-linha hover:bg-realce ${ab ? "bg-realce" : ""}`}>
                        <td className="px-3 py-2 font-sans">
                          <button type="button" aria-expanded={ab} className="flex items-center gap-2 text-left">
                            <span aria-hidden className={`inline-block w-2 text-texto-3 transition-transform ${ab ? "rotate-90 text-ouro" : ""}`}>›</span>
                            <span className="text-sm text-texto">{m.rotulo}</span>
                          </button>
                        </td>
                        <td className="px-3 py-2 text-right text-sm text-texto">
                          {f ? fmtNumero(f.ultimo.valor) : "—"}
                          {f && <span className="ml-2 font-sans text-[11px] text-texto-3">{fmtData(f.ultimo.data, m.serieDoPainel.frequencia)}</span>}
                        </td>
                        <td className={`px-3 py-2 text-right ${cor(f?.d1 ?? null)}`}>{sinal(f?.d1 ?? null)}</td>
                        <td className={`px-3 py-2 text-right ${cor(f?.d3 ?? null)}`}>{sinal(f?.d3 ?? null)}</td>
                        <td className={`px-3 py-2 text-right ${cor(f?.d12 ?? null)}`}>{sinal(f?.d12 ?? null)}</td>
                        <td className="px-3 py-2 text-right text-texto-2"><Percentil p={f?.percentil ?? null} /></td>
                        <td className="px-3 py-2 text-right text-texto-2">{f?.vsMeta == null ? "—" : sinal(f.vsMeta)}</td>
                        <td className="px-3 py-2 text-right text-texto-2">
                          {f?.sequencia ? <span className={f.sequencia.direcao === "subiu" ? "text-alta" : "text-baixa"}>{f.sequencia.direcao === "subiu" ? "▲" : "▼"} {f.sequencia.periodos}</span> : "—"}
                        </td>
                        <td className="px-3 py-1"><Minicurva pontos={m.serie.filter((p) => p.data > corte)} /></td>
                      </tr>
                      {ab && (
                        <tr className="border-t border-linha">
                          <td colSpan={9} className="whitespace-normal bg-fundo/40 p-3">
                            {m.frase && <p className="mb-3 font-sans text-sm text-texto">{m.frase}</p>}
                            <PainelGrafico painel={painelDe(m.rotulo, [m])} dados={{ [m.serieDoPainel.dado]: dados[m.serieDoPainel.dado] ?? [] }} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <p className="flex items-center gap-2 text-xs text-texto-3">
        Como ler <Info titulo="Como ler a tabela">Δ em pontos percentuais contra 1, 3 e 12 meses antes. Percentil: posição do último valor
          entre os dos últimos 10 anos (100 = o maior). vs meta: diferença para a meta do CMN do ano. Sequência: meses seguidos subindo (▲)
          ou caindo (▼). Clique numa linha para ver a frase e o gráfico.</Info>
      </p>
    </div>
  );
}
