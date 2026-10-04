"use client";

import { Fragment, useState } from "react";
import type { LinhaCiclo } from "@/lib/analises";
import { METRICAS } from "@/lib/analises";
import { duracao, fmtData, fmtNumero } from "@/lib/formato";

const NOME = { corte: "Corte", alta: "Alta", manutencao: "Manutenção" } as const;
type Filtro = "todos" | "corte" | "alta" | "manutencao";

const sinal = (v: number, casas = 2) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${fmtNumero(Math.abs(v), casas)}`;
const fmtDelta = (v: number | null, pct: boolean) => (v === null ? "—" : `${sinal(v)}${pct ? "%" : " p.p."}`);
const curto = (v: number | null) => (v === null ? "—" : sinal(v, 1));
const mediana = (xs: number[]) => {
  const a = [...xs].sort((x, y) => x - y);
  return a.length ? (a.length % 2 ? a[a.length >> 1] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2) : null;
};

function Resumo({ linhas, tipo }: { linhas: LinhaCiclo[]; tipo: "corte" | "alta" | "manutencao" }) {
  const fechados = linhas.filter((l) => l.tipo === tipo && !l.emAndamento);
  const dur = mediana(fechados.map((l) => l.meses));
  const bps = mediana(fechados.map((l) => l.bps));
  return (
    <div className="rounded-painel border border-linha bg-painel px-4 py-3">
      <div className="text-sm text-texto-2">{NOME[tipo]}{tipo === "manutencao" ? "" : "s"}</div>
      <div className="num mt-1 text-2xl text-texto">{fechados.length}</div>
      <div className="text-xs text-texto-3">episódios concluídos</div>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 text-xs">
        <dt className="text-texto-3">Duração mediana</dt><dd className="text-right text-texto-2">{dur === null ? "—" : duracao(dur)}</dd>
        {tipo !== "manutencao" && (<><dt className="text-texto-3">Movimento mediano</dt><dd className="num text-right text-texto-2">{bps === null ? "—" : `${sinal(bps, 0)} bps`}</dd></>)}
      </dl>
    </div>
  );
}

export function TabelaCiclos({ linhas }: { linhas: LinhaCiclo[] }) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [aberto, setAberto] = useState<string | null>(linhas.at(-1)?.inicio ?? null);
  const lista = [...linhas].reverse().filter((l) => filtro === "todos" || l.tipo === filtro);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Resumo linhas={linhas} tipo="corte" />
        <Resumo linhas={linhas} tipo="alta" />
        <Resumo linhas={linhas} tipo="manutencao" />
      </div>

      <div role="group" aria-label="Filtrar episódios" className="flex gap-1 text-sm">
        {(["todos", "corte", "alta", "manutencao"] as Filtro[]).map((f) => (
          <button key={f} type="button" onClick={() => setFiltro(f)} aria-pressed={filtro === f}
            className={`rounded-controle px-3 py-1 ${filtro === f ? "bg-ouro-tenue text-ouro" : "text-texto-2 hover:text-texto"}`}>
            {f === "todos" ? "Todos" : f === "manutencao" ? "Manutenções" : `${NOME[f]}s`}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-painel border border-linha">
        <table className="w-full whitespace-nowrap text-sm">
          <thead className="bg-painel text-left text-texto-3">
            <tr>
              <th className="px-3 py-2 font-normal">Episódio</th>
              <th className="px-3 py-2 font-normal">Período</th>
              <th className="px-3 py-2 font-normal">Duração</th>
              <th className="px-3 py-2 text-right font-normal">Decisões</th>
              <th className="px-3 py-2 text-right font-normal">Selic</th>
              <th className="px-3 py-2 text-right font-normal">bps</th>
              <th className="px-3 py-2 text-right font-normal">IPCA 12m (p.p.)</th>
              <th className="px-3 py-2 text-right font-normal">Desocupação (p.p.)</th>
              <th className="px-3 py-2 text-right font-normal">Dólar (%)</th>
              <th className="px-3 py-2 text-right font-normal">Ibovespa (%)</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((l) => {
              const id = l.inicio + l.tipo;
              const ab = aberto === id;
              const m = l.metricas;
              return (
                <Fragment key={id}>
                  <tr className={`cursor-pointer border-t border-linha hover:bg-painel ${ab ? "bg-painel" : ""}`}
                    onClick={() => setAberto(ab ? null : id)}>
                    <td className="px-3 py-2">
                      <button type="button" aria-expanded={ab} className="text-left">
                        <span className="text-texto">{NOME[l.tipo]}</span>
                        {l.emAndamento && <span className="ml-2 text-xs text-ouro">em andamento</span>}
                      </button>
                    </td>
                    <td className="num px-3 py-2 text-texto-2">{fmtData(l.inicio)} a {l.emAndamento ? "hoje" : fmtData(l.fim)}</td>
                    <td className="px-3 py-2 text-texto-2">{duracao(l.meses)}</td>
                    <td className="num px-3 py-2 text-right text-texto-2">{l.decisoes.length || "—"}</td>
                    <td className="num px-3 py-2 text-right">{fmtNumero(l.selicInicial)} → {fmtNumero(l.selicFinal)}</td>
                    <td className="num px-3 py-2 text-right">{l.bps ? sinal(l.bps, 0) : "0"}</td>
                    <td className="num px-3 py-2 text-right">{curto(m.ipca12.delta)}</td>
                    <td className="num px-3 py-2 text-right">{curto(m.desocupacao.delta)}</td>
                    <td className="num px-3 py-2 text-right">{curto(m.dolar.delta)}</td>
                    <td className="num px-3 py-2 text-right">{curto(m.ibov.delta)}</td>
                  </tr>
                  {ab && (
                    <tr className="border-t border-linha bg-painel">
                      <td colSpan={10} className="whitespace-normal px-4 py-4"><Detalhe l={l} /></td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Detalhe({ l }: { l: LinhaCiclo }) {
  const fmtV = (p: { data: string; valor: number } | null, casas: number) =>
    p ? <><span className="num text-texto">{fmtNumero(p.valor, casas)}</span> <span className="text-xs text-texto-3">({fmtData(p.data)})</span></> : <span className="text-texto-3">sem dado</span>;
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div>
        <h3 className="mb-2 text-sm font-medium text-texto">Do início ao {l.emAndamento ? "momento atual" : "fim"} do episódio</h3>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-texto-3">
            <tr><th className="py-1 font-normal">Indicador</th><th className="py-1 font-normal">Início</th><th className="py-1 font-normal">{l.emAndamento ? "Agora" : "Fim"}</th><th className="py-1 text-right font-normal">Variação</th></tr>
          </thead>
          <tbody>
            {METRICAS.map((d) => {
              const v = l.metricas[d.id];
              const casas = d.id === "ibov" ? 0 : 2;
              return (
                <tr key={d.id} className="border-t border-linha">
                  <td className="py-1.5 text-texto-2">{d.rotulo}</td>
                  <td className="py-1.5">{fmtV(v.inicio, casas)}</td>
                  <td className="py-1.5">{fmtV(v.fim, casas)}</td>
                  <td className="num py-1.5 text-right">{fmtDelta(v.delta, d.variacao === "pct")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-4">
        {l.decisoes.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium text-texto">Decisões ({l.decisoes.length})</h3>
            <ol className="max-h-48 overflow-auto text-sm">
              {l.decisoes.map((d) => (
                <li key={d.data} className="flex justify-between border-t border-linha py-1">
                  <span className="num text-texto-2">{fmtData(d.data, "Diária")}</span>
                  <span className="num">{sinal(Math.round((d.para - d.de) * 100), 0)} bps → {fmtNumero(d.para)}%</span>
                </li>
              ))}
            </ol>
          </div>
        )}
        <div>
          <h3 className="mb-2 text-sm font-medium text-texto">Depois do fim</h3>
          {l.emAndamento ? <p className="text-sm text-texto-3">Episódio ainda em andamento.</p> : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-texto-3"><tr><th className="py-1 font-normal"></th><th className="py-1 text-right font-normal">3 meses</th><th className="py-1 text-right font-normal">6 meses</th><th className="py-1 text-right font-normal">12 meses</th></tr></thead>
              <tbody>
                {(["dolar", "ibov"] as const).map((k) => (
                  <tr key={k} className="border-t border-linha">
                    <td className="py-1.5 text-texto-2">{k === "dolar" ? "Dólar" : "Ibovespa"}</td>
                    {l.depois[k].map((v, i) => <td key={i} className="num py-1.5 text-right">{fmtDelta(v, true)}</td>)}
                  </tr>
                ))}
                <tr className="border-t border-linha">
                  <td className="py-1.5 text-texto-2">IPCA 12m</td><td /><td />
                  <td className="num py-1.5 text-right">{fmtDelta(l.depois.ipca12, false)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
