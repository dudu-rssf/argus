"use client";

/**
 * Trajetórias dos períodos parecidos: o IPCA de 12 meses de cada período, do ano anterior
 * ao ano seguinte, alinhado no mês parecido (t = 0). Hoje em dourado até t = 0; os
 * períodos do passado em cinza, com o rótulo do mês na ponta. Passe o mouse para ver todos.
 */
import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, MarkLineComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { fmtNumero } from "@/lib/formato";
import { css, eixoX, eixoY, etiquetaFinal, miraEixo, tooltipBase } from "@/lib/tema-grafico";

echarts.use([LineChart, GridComponent, TooltipComponent, MarkLineComponent, CanvasRenderer]);

export type Trajetoria = { rotulo: string; pontos: { t: number; valor: number }[] };

export function GraficoTrajetorias({ hoje, passado, rotuloHoje }: { hoje: Trajetoria["pontos"]; passado: Trajetoria[]; rotuloHoje: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const g = echarts.init(ref.current);
    const ouro = css("--cor-ouro"), neutro = css("--cor-texto-2"), fraco = css("--cor-texto-3");
    const todas = [{ rotulo: rotuloHoje, pontos: hoje, destaque: true }, ...passado.map((p) => ({ ...p, destaque: false }))];
    g.setOption({
      animation: false,
      grid: { left: 8, right: 64, top: 24, bottom: 34, containLabel: true },
      tooltip: {
        ...tooltipBase(), trigger: "axis", axisPointer: miraEixo(), confine: true,
        formatter: (ps: { axisValue: number }[]) => {
          const t = Math.round(Number(ps[0]?.axisValue ?? 0));
          const linhas = todas.flatMap((s) => {
            const p = s.pontos.find((x) => x.t === t);
            return p ? [`<span style="color:${s.destaque ? ouro : neutro}">●</span> ${s.rotulo}: <b>${fmtNumero(p.valor)}%</b>`] : [];
          });
          const quando = t === 0 ? "mês parecido (hoje)" : t < 0 ? `${-t} ${t === -1 ? "mês" : "meses"} antes` : `${t} ${t === 1 ? "mês" : "meses"} depois`;
          return `IPCA 12 meses · ${quando}<br/>${linhas.join("<br/>")}`;
        },
      },
      xAxis: eixoX({ type: "value", min: -12, max: 12, interval: 3,
        axisLabel: { ...eixoX().axisLabel, formatter: (v: number) => (v === 0 ? "0" : v > 0 ? `+${v}` : `${v}`) },
        name: "meses em relação ao período parecido", nameLocation: "middle", nameGap: 24, nameTextStyle: { color: fraco, fontSize: 11 },
        axisPointer: { label: { formatter: (p: { value: number }) => `${Math.round(p.value)}` } } }),
      yAxis: eixoY({ axisLabel: { ...eixoY().axisLabel, formatter: (v: number) => `${fmtNumero(v, 0)}%` },
        axisPointer: { label: { formatter: (p: { value: number }) => `${fmtNumero(p.value)}%` } } }),
      series: todas.map((s, i) => ({
        name: s.rotulo, type: "line", showSymbol: false, z: s.destaque ? 10 : 2,
        data: s.pontos.map((p) => [p.t, p.valor]),
        lineStyle: { width: s.destaque ? 2.75 : 1.25, color: s.destaque ? ouro : neutro, opacity: s.destaque ? 1 : 0.6 },
        itemStyle: { color: s.destaque ? ouro : neutro },
        endLabel: s.destaque ? etiquetaFinal(ouro, (v) => `${fmtNumero(v)}%`) : { show: true, color: neutro, fontSize: 10, formatter: () => s.rotulo, distance: 4 },
        emphasis: { focus: "series", lineStyle: { width: 2.5, opacity: 1 } },
        labelLayout: { moveOverlap: "shiftY" },
        ...(i === 0 ? { markLine: { silent: true, symbol: "none", lineStyle: { color: fraco, type: "dashed", width: 1 },
          label: { color: fraco, fontSize: 10, formatter: "hoje / período parecido", position: "insideEndTop" }, data: [{ xAxis: 0 }] } } : {}),
      })),
    });
    const r = () => g.resize();
    window.addEventListener("resize", r);
    return () => { window.removeEventListener("resize", r); g.dispose(); };
  }, [hoje, passado, rotuloHoje]);
  return <div ref={ref} className="h-80 w-full" role="img" aria-label="Gráfico: trajetórias do IPCA nos períodos parecidos" />;
}
