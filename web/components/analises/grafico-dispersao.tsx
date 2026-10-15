"use client";

/**
 * Dispersão descritiva (curva de Phillips). Pontos agrupados por período, em ordem
 * cronológica; o ponto mais recente em dourado. Não há reta estimada.
 */
import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { ScatterChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { RodapeFormula } from "@/components/formula";
import { fmtData, fmtNumero } from "@/lib/formato";
import type { Formula } from "@/lib/formulas";

echarts.use([ScatterChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

export type PontoDispersao = { data: string; x: number; y: number };
export type Periodo = { rotulo: string; de: string; ate: string };

const css = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

export function GraficoDispersao({ titulo, subtitulo, pontos, periodos, eixoX, eixoY, frequencia, formula }: {
  titulo: string; subtitulo: string; pontos: PontoDispersao[]; periodos: Periodo[];
  eixoX: string; eixoY: string; frequencia: string; formula: Formula;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || !pontos.length) return;
    const g = echarts.init(ref.current);
    const t2 = css("--cor-texto-2");
    const ultimo = pontos.at(-1)!;
    const fmt = (p: PontoDispersao) => [p.x, p.y, p.data];
    const eixo = (nome: string) => ({
      type: "value", scale: true, name: nome, nameLocation: "middle", nameGap: 26, nameTextStyle: { color: t2 },
      axisLabel: { color: t2, formatter: (v: number) => fmtNumero(v, 0) },
      splitLine: { lineStyle: { color: css("--grade") } }, axisLine: { lineStyle: { color: css("--cor-linha") } },
    });
    g.setOption({
      animation: false,
      grid: { left: 24, right: 16, top: 64, bottom: 36, containLabel: true },
      legend: { top: 0, left: 0, textStyle: { color: t2 } },
      tooltip: {
        trigger: "item", backgroundColor: css("--cor-painel-alto"), borderColor: css("--cor-linha-forte"),
        textStyle: { color: css("--cor-texto"), fontSize: 12 },
        formatter: (p: { value: [number, number, string] }) =>
          `${fmtData(p.value[2], frequencia)}<br/>${eixoX}: ${fmtNumero(p.value[0])}<br/>${eixoY}: ${fmtNumero(p.value[1])}`,
      },
      xAxis: eixo(eixoX),
      yAxis: { ...eixo(eixoY), nameRotate: 90, nameGap: 36 },
      series: [
        ...periodos.map((per, i) => ({
          name: per.rotulo, type: "scatter", symbolSize: 7,
          data: pontos.filter((p) => p.data >= per.de && p.data <= per.ate && p !== ultimo).map(fmt),
          itemStyle: { color: css(`--serie-${(i % 4) + 2}`), opacity: 0.75 },
        })).filter((s) => s.data.length > 0),
        { name: `Último (${fmtData(ultimo.data, frequencia)})`, type: "scatter", symbolSize: 14, z: 10,
          data: [fmt(ultimo)], itemStyle: { color: css("--cor-ouro"), borderColor: css("--cor-texto"), borderWidth: 1 } },
      ],
    });
    const r = () => g.resize();
    window.addEventListener("resize", r);
    return () => { window.removeEventListener("resize", r); g.dispose(); };
  }, [pontos, periodos, eixoX, eixoY, frequencia]);

  return (
    <article className="rounded-painel border border-linha bg-painel">
      <header className="border-b border-linha px-4 py-3">
        <h3 className="font-medium text-texto">{titulo}</h3>
        <p className="text-xs text-texto-3">{subtitulo}</p>
      </header>
      {pontos.length
        ? <div ref={ref} className="h-80 w-full px-2" role="img" aria-label={`Gráfico: ${titulo}`} />
        : <p className="px-4 py-10 text-sm text-texto-3">Sem dados para esta combinação.</p>}
      <RodapeFormula formulas={[formula]} />
    </article>
  );
}
