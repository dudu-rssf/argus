"use client";

/**
 * Selic efetiva contra a faixa da regra de Taylor (mínimo a máximo das especificações)
 * e a mediana. A faixa é desenhada empilhando o mínimo (invisível) e a largura.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { DataZoomComponent, GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { RodapeFormula } from "@/components/formula";
import { fmtData, fmtNumero } from "@/lib/formato";
import type { Formula } from "@/lib/formulas";
import { css, eixoX, eixoY, etiquetaFinal, miraEixo, tooltipBase } from "@/lib/tema-grafico";

echarts.use([LineChart, GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, CanvasRenderer]);

export type PontoFaixa = { mes: string; selic: number | null; minimo: number | null; maximo: number | null; mediana: number | null };

const HORIZONTES = [{ id: "5A", anos: 5 }, { id: "10A", anos: 10 }, { id: "Máx", anos: 0 }] as const;

export function GraficoFaixa({ titulo, pontos, formula }: { titulo: string; pontos: PontoFaixa[]; formula: Formula }) {
  const ref = useRef<HTMLDivElement>(null);
  const [horizonte, setHorizonte] = useState<(typeof HORIZONTES)[number]["id"]>("Máx");
  const visiveis = useMemo(() => {
    const anos = HORIZONTES.find((h) => h.id === horizonte)!.anos;
    if (!anos || !pontos.length) return pontos;
    const fim = pontos.at(-1)!.mes;
    const inicio = `${Number(fim.slice(0, 4)) - anos}${fim.slice(4)}`;
    return pontos.filter((p) => p.mes >= inicio);
  }, [pontos, horizonte]);

  useEffect(() => {
    if (!ref.current) return;
    const g = echarts.init(ref.current);
    const t2 = css("--cor-texto-2");
    const datas = visiveis.map((p) => `${p.mes}-01`);
    g.setOption({
      animation: false,
      grid: { left: 4, right: 4, top: 36, bottom: 24, containLabel: true },
      legend: { top: 0, left: 0, textStyle: { color: t2 }, data: ["Selic efetiva", "Mediana da regra", "Faixa da regra"] },
      tooltip: {
        ...tooltipBase(), trigger: "axis", axisPointer: miraEixo(),
        formatter: (ps: { dataIndex: number }[]) => {
          const p = visiveis[ps[0].dataIndex];
          const f = (v: number | null) => (v === null ? "—" : `${fmtNumero(v)}%`);
          return `${fmtData(`${p.mes}-01`)}<br/>Selic: ${f(p.selic)}<br/>Mediana da regra: ${f(p.mediana)}<br/>Faixa: ${f(p.minimo)} a ${f(p.maximo)}`;
        },
      },
      xAxis: eixoX({ type: "category", data: datas, boundaryGap: false,
        axisLabel: { ...eixoX().axisLabel, formatter: (v: string) => fmtData(v) },
        axisPointer: { label: { formatter: (p: { value: string }) => fmtData(p.value) } } }),
      yAxis: eixoY({ axisLabel: { ...eixoY().axisLabel, formatter: (v: number) => `${fmtNumero(v, 0)}%` },
        axisPointer: { label: { formatter: (p: { value: number }) => `${fmtNumero(p.value)}%` } } }),
      dataZoom: [{ type: "inside" }],
      series: [
        { name: "base", type: "line", stack: "faixa", data: visiveis.map((p) => p.minimo), lineStyle: { opacity: 0 },
          showSymbol: false, silent: true, tooltip: { show: false } },
        { name: "Faixa da regra", type: "line", stack: "faixa", showSymbol: false, lineStyle: { opacity: 0 },
          data: visiveis.map((p) => (p.minimo === null || p.maximo === null ? null : p.maximo - p.minimo)),
          areaStyle: { color: css("--cor-texto-3"), opacity: 0.28 }, itemStyle: { color: css("--cor-texto-3") } },
        { name: "Mediana da regra", type: "line", showSymbol: false, data: visiveis.map((p) => p.mediana),
          lineStyle: { width: 1.5, type: "dashed", color: css("--cor-texto-2") }, itemStyle: { color: css("--cor-texto-2") } },
        { name: "Selic efetiva", type: "line", showSymbol: false, step: "end", data: visiveis.map((p) => p.selic),
          lineStyle: { width: 2.25, color: css("--cor-ouro") }, itemStyle: { color: css("--cor-ouro") }, z: 10,
          endLabel: etiquetaFinal(css("--cor-ouro"), (v) => `${fmtNumero(v)}%`) },
      ],
    });
    const r = () => g.resize();
    window.addEventListener("resize", r);
    return () => { window.removeEventListener("resize", r); g.dispose(); };
  }, [visiveis]);

  return (
    <article className="rounded-painel border border-linha bg-painel">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-linha px-4 py-3">
        <div>
          <h3 className="font-medium text-texto">{titulo}</h3>
          <p className="text-xs text-texto-3">Faixa: menor e maior das 16 especificações em cada mês. Tracejado: mediana.</p>
        </div>
        <div className="flex gap-1" role="group" aria-label="Horizonte">
          {HORIZONTES.map((h) => (
            <button key={h.id} type="button" onClick={() => setHorizonte(h.id)} aria-pressed={horizonte === h.id}
              className={`h-8 rounded-controle px-2.5 text-sm ${horizonte === h.id ? "bg-ouro-tenue text-ouro" : "text-texto-2 hover:text-texto"}`}>
              {h.id}
            </button>
          ))}
        </div>
      </header>
      <div ref={ref} className="h-80 w-full px-2" role="img" aria-label={`Gráfico: ${titulo}`} />
      <RodapeFormula formulas={[formula]} />
    </article>
  );
}
