"use client";

/**
 * Selic de cada ciclo alinhada no início (t = 0). Histórico em tom neutro; o ciclo atual
 * (ou o mais recente) em dourado. Pontos marcam cada decisão. Passando o mouse, o tooltip
 * lista a Selic de cada ciclo naquele mês, o total do ciclo e a decisão do mês.
 */
import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { RodapeFormula } from "@/components/formula";
import { fmtData, fmtNumero } from "@/lib/formato";
import type { Formula } from "@/lib/formulas";
import { css, eixoX, eixoY, etiquetaFinal, miraEixo, tooltipBase } from "@/lib/tema-grafico";

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

export type DecisaoAlinhada = { t: number; data: string; de: number; para: number };
export type CicloAlinhado = {
  rotulo: string; resumo: string; destaque: boolean;
  pontos: { t: number; valor: number }[]; decisoes: DecisaoAlinhada[];
};

/** Valor da Selic do ciclo no mês t (degrau: vale o último ponto até t). */
function valorEm(c: CicloAlinhado, t: number): number | null {
  let v: number | null = null;
  for (const p of c.pontos) if (p.t <= t + 1e-9) v = p.valor;
  return t > (c.pontos.at(-1)?.t ?? -1) + 0.5 ? null : v;
}

export function GraficoAlinhado({ titulo, ciclos, formula }: { titulo: string; ciclos: CicloAlinhado[]; formula: Formula }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const g = echarts.init(ref.current);
    const ouro = css("--cor-ouro"), neutro = css("--cor-texto-3");
    const ordenados = [...ciclos].sort((a, b) => Number(b.destaque) - Number(a.destaque));
    g.setOption({
      animation: false,
      grid: { left: 4, right: 4, top: 16, bottom: 30, containLabel: true },
      tooltip: {
        ...tooltipBase(), trigger: "axis", axisPointer: miraEixo(), confine: true,
        formatter: (ps: { axisValue: number }[]) => {
          const t = Math.round(Number(ps[0]?.axisValue ?? 0));
          const linhas = ordenados.flatMap((c) => {
            const v = valorEm(c, t);
            if (v === null) return [];
            const dec = c.decisoes.find((d) => Math.abs(d.t - t) < 0.5);
            const cor = c.destaque ? ouro : neutro;
            const decTxt = dec ? `<br/><span style="color:${cor}">&nbsp;&nbsp;decisão em ${fmtData(dec.data, "Diária")}: ${dec.para > dec.de ? "+" : "−"}${Math.round(Math.abs(dec.para - dec.de) * 100)} bps (${fmtNumero(dec.de)}% → ${fmtNumero(dec.para)}%)</span>` : "";
            return [`<span style="color:${cor}">●</span> <b>${c.rotulo}</b>: Selic ${fmtNumero(v)}%<br/><span style="opacity:.7">&nbsp;&nbsp;${c.resumo}</span>${decTxt}`];
          });
          return `<div style="max-width:420px;white-space:normal">Mês ${t} desde o início do ciclo<br/>${linhas.join("<br/>")}</div>`;
        },
      },
      xAxis: eixoX({ type: "value", min: 0, name: "meses desde o início", nameLocation: "middle", nameGap: 24,
        nameTextStyle: { color: neutro, fontSize: 11 }, axisLabel: { ...eixoX().axisLabel, formatter: (v: number) => fmtNumero(v, 0) },
        axisPointer: { label: { formatter: (p: { value: number }) => `mês ${fmtNumero(p.value, 0)}` } } }),
      yAxis: eixoY({ axisLabel: { ...eixoY().axisLabel, formatter: (v: number) => `${fmtNumero(v, 0)}%` },
        axisPointer: { label: { formatter: (p: { value: number }) => `${fmtNumero(p.value)}%` } } }),
      series: ordenados.map((c) => {
        const cor = c.destaque ? ouro : neutro;
        const marcas = new Set(c.decisoes.map((d) => Math.round(d.t)));
        return {
          name: c.rotulo, type: "line", step: "end",
          data: c.pontos.map((p) => ({ value: [p.t, p.valor], symbol: marcas.has(Math.round(p.t)) && p.t > 0 ? "circle" : "none" })),
          symbolSize: c.destaque ? 6 : 4, showSymbol: true,
          lineStyle: { width: c.destaque ? 2.25 : 1.1, color: cor, opacity: c.destaque ? 1 : 0.55 },
          itemStyle: { color: cor, opacity: c.destaque ? 1 : 0.55 },
          endLabel: c.destaque ? etiquetaFinal(ouro, (v) => `${fmtNumero(v)}%`) : undefined,
          z: c.destaque ? 10 : 1,
          emphasis: { focus: "series", lineStyle: { width: 2.5, opacity: 1 } },
        };
      }),
    });
    const r = () => g.resize();
    window.addEventListener("resize", r);
    return () => { window.removeEventListener("resize", r); g.dispose(); };
  }, [ciclos]);

  const destaque = ciclos.find((c) => c.destaque);
  return (
    <article className="rounded-painel border border-linha bg-painel">
      <header className="px-4 pt-3">
        <h3 className="text-[15px] font-semibold tracking-tight text-texto">{titulo}</h3>
        <p className="text-xs text-texto-3">
          {destaque ? <>Em dourado: <span className="text-ouro">{destaque.rotulo}</span> ({destaque.resumo}). </> : null}
          Em cinza: os outros {ciclos.length - (destaque ? 1 : 0)}. Pontos = decisões. Passe o mouse para ver cada ciclo e cada decisão.
        </p>
      </header>
      <div ref={ref} className="h-80 w-full px-1" role="img" aria-label={`Gráfico: ${titulo}`} />
      <RodapeFormula formulas={[formula]} />
    </article>
  );
}
