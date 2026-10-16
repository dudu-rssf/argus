"use client";

/**
 * Relógio do ciclo: o círculo tem quatro fases; o ponto dourado é hoje e a linha é o
 * caminho dos últimos 24 meses. Gira no sentido horário: reaquecendo → aquecendo →
 * esfriando → fria.
 */
import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { LineChart, ScatterChart } from "echarts/charts";
import { GraphicComponent, GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { fmtData, fmtNumero } from "@/lib/formato";
import { FASES, type Relogio } from "@/lib/geral/relogio";
import { comAlfa, css, tooltipBase } from "@/lib/tema-grafico";

echarts.use([LineChart, ScatterChart, GridComponent, TooltipComponent, GraphicComponent, CanvasRenderer]);

const NOME = Object.fromEntries(FASES.map((f) => [f.id, f.nome]));

export function RelogioCiclo({ relogio, rotulo, referencia }: { relogio: Relogio; rotulo: string; referencia: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const g = echarts.init(ref.current);
    const ouro = css("--cor-ouro"), t3 = css("--cor-texto-3"), linha = css("--cor-linha-forte");
    const R = Math.max(1.5, ...relogio.rastro.map((p) => Math.hypot(p.x, p.y) * 1.2));
    const circulo = Array.from({ length: 121 }, (_, i) => [R * Math.cos((i / 120) * 2 * Math.PI), R * Math.sin((i / 120) * 2 * Math.PI)]);
    const n = relogio.rastro.length;
    g.setOption({
      animation: false,
      grid: { left: 8, right: 8, top: 8, bottom: 8 },
      xAxis: { type: "value", min: -R * 1.05, max: R * 1.05, show: false },
      yAxis: { type: "value", min: -R * 1.05, max: R * 1.05, show: false },
      tooltip: {
        ...tooltipBase(), trigger: "item",
        formatter: (p: { data: { value: number[]; i: number } }) => {
          const ponto = relogio.rastro[p.data?.i ?? -1];
          if (!ponto) return "";
          return `<b>${fmtData(ponto.data)}</b><br/>${rotulo}: ${fmtNumero(ponto.valor)}%<br/>vs ${referencia}: ${ponto.nivel > 0 ? "+" : ""}${fmtNumero(ponto.nivel)} p.p.<br/>Δ 6 meses: ${ponto.direcao > 0 ? "+" : ""}${fmtNumero(ponto.direcao)} p.p.<br/>Fase: ${NOME[ponto.fase]}`;
        },
      },
      graphic: [
        { type: "text", left: "62%", top: "18%", style: { text: "Aquecendo", fill: t3, fontSize: 12 } },
        { type: "text", left: "62%", top: "76%", style: { text: "Esfriando", fill: t3, fontSize: 12 } },
        { type: "text", left: "16%", top: "76%", style: { text: "Fria", fill: t3, fontSize: 12 } },
        { type: "text", left: "13%", top: "18%", style: { text: "Reaquecendo", fill: t3, fontSize: 12 } },
        { type: "text", right: 10, top: "47%", style: { text: "acima →", fill: t3, fontSize: 10 } },
        { type: "text", left: 10, top: "47%", style: { text: "← abaixo", fill: t3, fontSize: 10 } },
        { type: "text", left: "45%", top: 6, style: { text: "↑ subindo", fill: t3, fontSize: 10 } },
        { type: "text", left: "45%", bottom: 6, style: { text: "↓ caindo", fill: t3, fontSize: 10 } },
      ],
      series: [
        { type: "line", data: circulo, showSymbol: false, silent: true, lineStyle: { color: linha, width: 1 } },
        { type: "line", data: [[-R, 0], [R, 0]], showSymbol: false, silent: true, lineStyle: { color: linha, width: 1, type: "dashed" } },
        { type: "line", data: [[0, -R], [0, R]], showSymbol: false, silent: true, lineStyle: { color: linha, width: 1, type: "dashed" } },
        {
          type: "line", smooth: 0.3, showSymbol: true, symbolSize: 5, z: 5,
          data: relogio.rastro.map((p, i) => ({ value: [p.x, p.y], i, itemStyle: { color: comAlfa(ouro, 0.15 + (0.75 * i) / n) } })),
          lineStyle: { color: comAlfa(ouro, 0.45), width: 1.5 },
        },
        {
          type: "scatter", z: 10, symbolSize: 16,
          data: [{ value: [relogio.atual.x, relogio.atual.y], i: n - 1 }],
          itemStyle: { color: ouro, borderColor: css("--cor-fundo"), borderWidth: 3, shadowBlur: 12, shadowColor: comAlfa(ouro, 0.6) },
        },
      ],
    });
    const r = () => g.resize();
    window.addEventListener("resize", r);
    return () => { window.removeEventListener("resize", r); g.dispose(); };
  }, [relogio, rotulo, referencia]);
  return <div ref={ref} className="aspect-square w-full max-w-[380px]" role="img" aria-label="Gráfico: Relógio do ciclo" />;
}
