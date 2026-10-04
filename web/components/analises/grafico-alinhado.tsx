"use client";

/**
 * Selic de cada ciclo alinhada no início (t = 0). Histórico em tom neutro; o ciclo
 * atual (ou o mais recente) em dourado. A identidade de cada linha aparece no tooltip.
 */
import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { fmtNumero } from "@/lib/formato";

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

export type CicloAlinhado = { rotulo: string; destaque: boolean; pontos: { t: number; valor: number }[] };

const css = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

export function GraficoAlinhado({ titulo, ciclos }: { titulo: string; ciclos: CicloAlinhado[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const g = echarts.init(ref.current);
    const t2 = css("--cor-texto-2");
    g.setOption({
      animation: false,
      grid: { left: 8, right: 16, top: 16, bottom: 28, containLabel: true },
      tooltip: {
        trigger: "item", backgroundColor: css("--cor-painel-alto"), borderColor: css("--cor-linha-forte"),
        textStyle: { color: css("--cor-texto"), fontSize: 12 },
        formatter: (p: { seriesName: string; value: [number, number] }) =>
          `${p.seriesName}<br/>mês ${fmtNumero(p.value[0], 0)}: Selic ${fmtNumero(p.value[1])}%`,
      },
      xAxis: { type: "value", name: "meses desde o início", nameLocation: "middle", nameGap: 22,
        nameTextStyle: { color: t2 }, axisLabel: { color: t2 }, splitLine: { show: false },
        axisLine: { lineStyle: { color: css("--cor-linha") } } },
      yAxis: { type: "value", scale: true, axisLabel: { color: t2, formatter: (v: number) => `${fmtNumero(v, 0)}%` },
        splitLine: { lineStyle: { color: css("--grade") } } },
      series: ciclos.map((c) => ({
        name: c.rotulo, type: "line", showSymbol: false, step: "end",
        data: c.pontos.map((p) => [p.t, p.valor]),
        lineStyle: { width: c.destaque ? 2.5 : 1.5, color: c.destaque ? css("--cor-ouro") : css("--cor-texto-3") },
        itemStyle: { color: c.destaque ? css("--cor-ouro") : css("--cor-texto-3") },
        z: c.destaque ? 10 : 1,
        emphasis: { focus: "series", lineStyle: { width: 2.5 } },
      })),
    });
    const r = () => g.resize();
    window.addEventListener("resize", r);
    return () => { window.removeEventListener("resize", r); g.dispose(); };
  }, [ciclos]);

  const destaque = ciclos.find((c) => c.destaque);
  return (
    <article className="rounded-painel border border-linha bg-painel">
      <header className="border-b border-linha px-4 py-3">
        <h3 className="font-medium text-texto">{titulo}</h3>
        <p className="text-xs text-texto-3">
          {destaque ? <>Em dourado: <span className="text-ouro">{destaque.rotulo}</span>. </> : null}
          Em cinza: os demais ({ciclos.length - (destaque ? 1 : 0)}). Passe o mouse para identificar cada um.
        </p>
      </header>
      <div ref={ref} className="h-72 w-full px-2" role="img" aria-label={`Gráfico: ${titulo}`} />
    </article>
  );
}
