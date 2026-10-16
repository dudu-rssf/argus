"use client";

/**
 * Protótipo D — Mapa: cada medida é um ponto. Horizontal: distância da meta; vertical:
 * variação em 3 meses. Rastro dos últimos 6 meses. Embaixo, a lista por quadrante.
 */
import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { LineChart, ScatterChart } from "echarts/charts";
import { GraphicComponent, GridComponent, MarkLineComponent, TooltipComponent } from "echarts/components";
import { LabelLayout } from "echarts/features";
import { CanvasRenderer } from "echarts/renderers";
import { RodapeFormula } from "@/components/formula";
import { PainelGrafico } from "@/components/grafico/painel-grafico";
import { Info } from "@/components/info";
import { fmtData, fmtNumero } from "@/lib/formato";
import { FORMULA_FATOS, FORMULAS_PROTOTIPOS } from "@/lib/formulas";
import { painelDe } from "@/lib/painel-de";
import type { Medida, PontoMapa, Quadrante } from "@/lib/prototipos";
import { css, eixoTexto, tooltipBase } from "@/lib/tema-grafico";
import type { Ponto } from "@/lib/transform";

echarts.use([LineChart, ScatterChart, GridComponent, TooltipComponent, MarkLineComponent, GraphicComponent, LabelLayout, CanvasRenderer]);

export type ItemMapa = { medida: Medida; rastro: PontoMapa[]; quadrante: Quadrante | null };

const NOME: Record<Quadrante, string> = {
  "acima-subindo": "Acima da meta e subindo", "acima-caindo": "Acima da meta e caindo",
  "abaixo-caindo": "Abaixo da meta e caindo", "abaixo-subindo": "Abaixo da meta e subindo",
};
const ORDEM: Quadrante[] = ["acima-subindo", "acima-caindo", "abaixo-subindo", "abaixo-caindo"];

export function ModeloMapa({ itens, dados }: { itens: ItemMapa[]; dados: Record<string, Ponto[]> }) {
  const ref = useRef<HTMLDivElement>(null);
  const [aberta, setAberta] = useState<string | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const g = echarts.init(ref.current);
    const cores = [2, 3, 4, 5, 1].map((i) => css(`--serie-${i}`));
    const t3 = css("--cor-texto-3");
    const comDados = itens.filter((i) => i.rastro.length);
    g.setOption({
      animation: false,
      grid: { left: 8, right: 24, top: 24, bottom: 36, containLabel: true },
      tooltip: {
        ...tooltipBase(), trigger: "item",
        formatter: (p: { seriesName: string; value: [number, number, string] }) =>
          `<b>${p.seriesName}</b> · ${fmtData(p.value[2])}<br/>vs meta: ${fmtNumero(p.value[0])} p.p.<br/>Δ 3 meses: ${fmtNumero(p.value[1])} p.p.`,
      },
      xAxis: { type: "value", name: "distância da meta (p.p.)", nameLocation: "middle", nameGap: 24, nameTextStyle: { color: t3, fontSize: 11 },
        axisLabel: { ...eixoTexto(), formatter: (v: number) => fmtNumero(v, 0) }, splitLine: { show: false },
        axisLine: { show: false }, axisTick: { show: false } },
      yAxis: { type: "value", name: "Δ em 3 meses (p.p.)", nameTextStyle: { color: t3, fontSize: 11 }, position: "right",
        axisLabel: { ...eixoTexto(), formatter: (v: number) => fmtNumero(v, 1) }, splitLine: { show: false },
        axisLine: { show: false }, axisTick: { show: false } },
      graphic: [
        { type: "text", right: 64, top: 28, style: { text: "acima da meta e subindo", fill: t3, fontSize: 11 } },
        { type: "text", right: 64, bottom: 48, style: { text: "acima da meta e caindo", fill: t3, fontSize: 11 } },
        { type: "text", left: 16, top: 28, style: { text: "abaixo da meta e subindo", fill: t3, fontSize: 11 } },
        { type: "text", left: 16, bottom: 48, style: { text: "abaixo da meta e caindo", fill: t3, fontSize: 11 } },
      ],
      series: comDados.flatMap((it, k) => {
        const cor = it.medida.id === "ipca12" ? css("--cor-ouro") : cores[k % cores.length];
        const dadosRastro = it.rastro.map((p) => [p.x, p.y, p.data]);
        const ultimo = dadosRastro.at(-1)!;
        return [
          { name: it.medida.rotulo, type: "line", data: dadosRastro, showSymbol: true, symbolSize: 4, smooth: false,
            lineStyle: { color: cor, width: 1, opacity: 0.35 }, itemStyle: { color: cor, opacity: 0.35 }, silent: true,
            markLine: k === 0 ? { silent: true, symbol: "none", lineStyle: { color: css("--cor-linha-forte"), type: "solid", width: 1 },
              label: { show: false }, data: [{ xAxis: 0 }, { yAxis: 0 }] } : undefined },
          { name: it.medida.rotulo, type: "scatter", data: [ultimo], symbolSize: it.medida.id === "ipca12" ? 14 : 10,
            itemStyle: { color: cor, borderColor: css("--cor-fundo"), borderWidth: 2 },
            label: { show: true, position: "right", formatter: it.medida.rotulo, color: css("--cor-texto-2"), fontSize: 11 },
            labelLayout: { hideOverlap: true }, z: it.medida.id === "ipca12" ? 10 : 2 },
        ];
      }),
    });
    const r = () => g.resize();
    window.addEventListener("resize", r);
    return () => { window.removeEventListener("resize", r); g.dispose(); };
  }, [itens]);

  return (
    <div className="flex flex-col gap-4">
      <article className="rounded-painel border border-linha bg-painel">
        <header className="flex items-center gap-2 px-4 pt-3">
          <h2 className="text-[15px] font-semibold tracking-tight">Mapa da inflação</h2>
          <Info titulo="Como ler o mapa">Cada ponto é uma medida de inflação em 12 meses. Mais à direita, mais acima da meta; mais para cima,
            mais subiu nos últimos 3 meses. A linha fina atrás de cada ponto é o caminho dos 6 meses anteriores. O IPCA cheio está em dourado.</Info>
        </header>
        <div ref={ref} className="h-[440px] w-full px-1" role="img" aria-label="Gráfico: Mapa da inflação" />
        <RodapeFormula formulas={[FORMULAS_PROTOTIPOS.mapa]} />
      </article>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {ORDEM.map((q) => {
          const doQ = itens.filter((i) => i.quadrante === q);
          return (
            <section key={q} aria-label={NOME[q]} className="rounded-painel border border-linha bg-painel">
              <h3 className="border-b border-linha px-4 py-2.5 text-sm font-semibold">{NOME[q]} <span className="num text-texto-3">({doQ.length})</span></h3>
              {doQ.length === 0 ? <p className="px-4 py-4 text-sm text-texto-3">Nenhuma medida.</p> : (
                <ul className="divide-y divide-linha">
                  {doQ.map(({ medida: m }) => (
                    <li key={m.id} className="px-4 py-2.5">
                      <button type="button" onClick={() => setAberta(aberta === m.id ? null : m.id)} aria-expanded={aberta === m.id}
                        className="w-full text-left text-sm leading-relaxed text-texto-2 hover:text-texto">
                        {m.frase}
                      </button>
                      {aberta === m.id && (
                        <div className="mt-3">
                          <PainelGrafico painel={painelDe(m.rotulo, [m])} dados={{ [m.serieDoPainel.dado]: dados[m.serieDoPainel.dado] ?? [] }} />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      <div className="rounded-painel border border-linha bg-painel">
        <RodapeFormula formulas={[FORMULA_FATOS]}>Clique numa frase para abrir o gráfico. As frases seguem a regra do botão Fórmula.</RodapeFormula>
      </div>
    </div>
  );
}
