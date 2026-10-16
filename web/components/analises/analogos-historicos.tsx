"use client";

import { Info } from "@/components/info";
import { useMemo, useState } from "react";
import { RodapeFormula } from "@/components/formula";
import { FORMULAS_ANALISES } from "@/lib/formulas";
import { DESFECHOS, encontrarAnalogos, type LinhaMes, type Variavel } from "@/lib/analogos";
import { fmtData, fmtNumero } from "@/lib/formato";

type Props = { painel: LinhaMes[]; variaveis: (Variavel & { padrao: boolean })[] };

const fmt = (v: number | null | undefined, unidade = "") =>
  v == null ? "—" : `${fmtNumero(v, unidade === "p.p." || unidade === "%" ? 2 : 2)}`;
const sinal = (v: number | null) => (v == null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${fmtNumero(Math.abs(v), 1)}`);
const mediana = (xs: number[]) => {
  const a = [...xs].sort((x, y) => x - y);
  return a.length ? (a.length % 2 ? a[a.length >> 1] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2) : null;
};

/** Similaridade em 0–100% a partir da distância (0 = idêntico; 2 desvios-padrão ou mais = 0%). */
const similaridade = (d: number) => Math.max(0, Math.round((1 - d / 2) * 100));

export function AnalogosHistoricos({ painel, variaveis }: Props) {
  const [sel, setSel] = useState<string[]>(variaveis.filter((v) => v.padrao).map((v) => v.id));
  const { atual, analogos } = useMemo(() => encontrarAnalogos(painel, sel), [painel, sel]);
  const visiveis = variaveis.filter((v) => sel.includes(v.id));

  return (
    <div className="flex flex-col gap-4">
      <h2 id="analogos" className="flex scroll-mt-20 items-center gap-2 text-lg font-semibold tracking-tight">Períodos históricos parecidos com hoje<Info titulo="Períodos históricos parecidos com hoje">Procura no passado os meses em que as variáveis marcadas estavam mais parecidas com as de hoje e mostra o que aconteceu nos 12 meses seguintes. Marque ou desmarque variáveis para mudar a comparação. Semelhança de 100% é idêntico; 0% está a 2 desvios-padrão de distância. São 5 casos: é contexto, não previsão.</Info></h2>
      <fieldset className="flex flex-wrap gap-x-5 gap-y-2 rounded-painel border border-linha bg-painel px-4 py-3 text-sm">
        <legend className="px-1 text-xs text-texto-3">Comparar por</legend>
        {variaveis.map((v) => (
          <label key={v.id} className="flex items-center gap-2 text-texto-2">
            <input type="checkbox" checked={sel.includes(v.id)} className="accent-[var(--cor-ouro)]"
              onChange={(e) => setSel((s) => (e.target.checked ? [...s, v.id] : s.filter((x) => x !== v.id)))} />
            {v.rotulo}
          </label>
        ))}
      </fieldset>

      {!atual || !analogos.length ? (
        <p className="rounded-painel border border-linha px-4 py-8 text-center text-sm text-texto-2">
          Escolha ao menos uma variável com dados para comparar.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-painel border border-linha">
            <table className="w-full whitespace-nowrap text-sm">
              <thead className="bg-painel text-left text-texto-3">
                <tr>
                  <th className="px-3 py-2 font-normal">Mês</th>
                  <th className="px-3 py-2 text-right font-normal">Semelhança</th>
                  {visiveis.map((v) => <th key={v.id} className="px-3 py-2 text-right font-normal">{v.rotulo}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-linha bg-ouro-tenue">
                  <td className="px-3 py-2 text-ouro">Hoje ({fmtData(`${atual.mes}-01`)})</td>
                  <td className="px-3 py-2 text-right text-texto-3">—</td>
                  {visiveis.map((v) => <td key={v.id} className="num px-3 py-2 text-right">{fmt(atual.valores[v.id], v.unidade)}</td>)}
                </tr>
                {analogos.map((a) => (
                  <tr key={a.mes} className="border-t border-linha">
                    <td className="px-3 py-2">{fmtData(`${a.mes}-01`)}</td>
                    <td className="num px-3 py-2 text-right">{similaridade(a.distancia)}%</td>
                    {visiveis.map((v) => <td key={v.id} className="num px-3 py-2 text-right text-texto-2">{fmt(a.valores[v.id], v.unidade)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto rounded-painel border border-linha">
            <table className="w-full whitespace-nowrap text-sm">
              <caption className="bg-painel px-3 py-2 text-left text-sm text-texto">O que aconteceu nos 12 meses seguintes</caption>
              <thead className="bg-painel text-left text-texto-3">
                <tr>
                  <th className="px-3 py-2 font-normal">A partir de</th>
                  {DESFECHOS.map((d) => <th key={d.id} className="px-3 py-2 text-right font-normal">{d.rotulo} ({d.unidade})</th>)}
                </tr>
              </thead>
              <tbody>
                {analogos.map((a) => (
                  <tr key={a.mes} className="border-t border-linha">
                    <td className="px-3 py-2">{fmtData(`${a.mes}-01`)}</td>
                    {DESFECHOS.map((d) => <td key={d.id} className="num px-3 py-2 text-right">{sinal(a.depois[d.id])}</td>)}
                  </tr>
                ))}
                <tr className="border-t border-linha-forte">
                  <td className="px-3 py-2 text-texto-2">Mediana</td>
                  {DESFECHOS.map((d) => {
                    const xs = analogos.map((a) => a.depois[d.id]).filter((x): x is number => x != null);
                    return <td key={d.id} className="num px-3 py-2 text-right text-texto">{sinal(mediana(xs))}</td>;
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="rounded-painel border border-linha bg-painel">
        <RodapeFormula formulas={[FORMULAS_ANALISES.analogos]}>Como os períodos são comparados</RodapeFormula>
      </div>
    </div>
  );
}
