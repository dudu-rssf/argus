"use client";

/**
 * Motor de gráfico (plano.md): horizonte, transformação válida para o tipo da série,
 * combinado barras + linha (mesma unidade, um só eixo), tabela e exportação CSV.
 * As transformações rodam aqui, no navegador, a partir dos dados lidos do banco.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { BarChart, LineChart } from "echarts/charts";
import { DataZoomComponent, GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { Painel } from "@/lib/config";
import { fmtData, fmtNumero } from "@/lib/formato";
import { lerTrajetoria } from "@/lib/leitura";
import { FaixaLeitura } from "./faixa-leitura";
import { aplicar, rotulo, transformacoesValidas, type IdTransformacao, type Ponto } from "@/lib/transform";

echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, DataZoomComponent, CanvasRenderer]);

const HORIZONTES = [
  { id: "1A", anos: 1 }, { id: "3A", anos: 3 }, { id: "5A", anos: 5 }, { id: "10A", anos: 10 }, { id: "Máx", anos: 0 },
] as const;
type IdHorizonte = (typeof HORIZONTES)[number]["id"];

type Linha = { rotulo: string; cor: string; tipo: "line" | "bar"; pontos: Ponto[] };

function cssVar(nome: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
}

function inicioDoHorizonte(fim: string, anos: number): string {
  if (!anos) return "0000-01-01";
  return `${Number(fim.slice(0, 4)) - anos}${fim.slice(4)}`;
}

function casasDecimais(id: IdTransformacao, unidade: string): number {
  if (id !== "nivel") return 2;
  return /mil|postos|pessoas|R\$|US\$|pontos/i.test(unidade) ? 0 : 2;
}

export function PainelGrafico({ painel, dados }: { painel: Painel; dados: Record<string, Ponto[]> }) {
  const freq = painel.series[0].frequencia;
  const opcoes = useMemo(() => {
    const listas = painel.series.map((s) => transformacoesValidas(s.tipo, s.frequencia));
    return listas.reduce((acc, l) => acc.filter((t) => l.includes(t)));
  }, [painel]);

  const [transf, setTransf] = useState<IdTransformacao>(
    opcoes.includes(painel.transformacao) ? painel.transformacao : "nivel");
  const [horizonte, setHorizonte] = useState<IdHorizonte>("10A");
  const [tabela, setTabela] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const grafico = useRef<echarts.ECharts | null>(null);

  const linhas: Linha[] = useMemo(() => {
    const cores = [1, 2, 3, 4, 5].map((i) => `--serie-${i}`);
    if (painel.combinado) {
      const s = painel.series[0];
      const base = dados[s.dado] ?? [];
      return [
        { rotulo: `${s.rotulo}: ${rotulo(painel.combinado.barras, s.tipo).toLowerCase()}`, cor: cores[1], tipo: "bar",
          pontos: aplicar(painel.combinado.barras, base, s.tipo, s.frequencia) },
        { rotulo: `${s.rotulo}: ${rotulo(painel.combinado.linha, s.tipo).toLowerCase()}`, cor: cores[0], tipo: "line",
          pontos: aplicar(painel.combinado.linha, base, s.tipo, s.frequencia) },
      ];
    }
    return painel.series.map((s, i) => ({
      rotulo: s.rotulo, cor: cores[i % cores.length], tipo: "line",
      pontos: aplicar(transf, dados[s.dado] ?? [], s.tipo, s.frequencia),
    }));
  }, [painel, dados, transf]);

  const fim = linhas.flatMap((l) => l.pontos.map((p) => p.data)).sort().at(-1) ?? "";
  const inicio = inicioDoHorizonte(fim, HORIZONTES.find((h) => h.id === horizonte)!.anos);
  const visiveis = useMemo(
    () => linhas.map((l) => ({ ...l, pontos: l.pontos.filter((p) => p.data >= inicio) })), [linhas, inicio]);
  const casas = casasDecimais(painel.combinado ? "mom" : transf, painel.series[0].unidade);
  const vazio = visiveis.every((l) => l.pontos.length === 0);

  useEffect(() => {
    if (!ref.current || tabela || vazio) return;
    const g = grafico.current ?? echarts.init(ref.current, undefined, { renderer: "canvas" });
    grafico.current = g;
    const datas = [...new Set(visiveis.flatMap((l) => l.pontos.map((p) => p.data)))].sort();
    const texto2 = cssVar("--cor-texto-2");
    g.setOption({
      animation: false,
      grid: { left: 8, right: 16, top: 12, bottom: 28, containLabel: true },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "line", lineStyle: { color: cssVar("--cor-linha-forte") } },
        backgroundColor: cssVar("--cor-painel-alto"),
        borderColor: cssVar("--cor-linha-forte"),
        textStyle: { color: cssVar("--cor-texto"), fontSize: 12 },
        valueFormatter: (v: unknown) => (typeof v === "number" ? fmtNumero(v, casas) : "—"),
      },
      xAxis: {
        type: "category", data: datas, boundaryGap: visiveis.some((l) => l.tipo === "bar"),
        axisLabel: { color: texto2, formatter: (v: string) => fmtData(v, freq), hideOverlap: true },
        axisLine: { lineStyle: { color: cssVar("--cor-linha") } }, axisTick: { show: false },
      },
      yAxis: {
        type: "value", scale: true,
        axisLabel: { color: texto2, formatter: (v: number) => fmtNumero(v, casas === 0 ? 0 : 1) },
        splitLine: { lineStyle: { color: cssVar("--grade") } },
      },
      dataZoom: [{ type: "inside" }],
      series: visiveis.map((l) => {
        const mapa = new Map(l.pontos.map((p) => [p.data, p.valor]));
        return {
          name: l.rotulo, type: l.tipo, showSymbol: false, symbolSize: 8,
          data: datas.map((d) => mapa.get(d) ?? null),
          connectNulls: false,
          lineStyle: { width: 2, color: cssVar(l.cor) },
          itemStyle: { color: cssVar(l.cor), borderRadius: [2, 2, 0, 0] },
          barMaxWidth: 14,
        };
      }),
    }, { notMerge: true });
    const redimensionar = () => g.resize();
    window.addEventListener("resize", redimensionar);
    return () => window.removeEventListener("resize", redimensionar);
  }, [visiveis, tabela, vazio, casas, freq]);

  useEffect(() => () => { grafico.current?.dispose(); grafico.current = null; }, []);
  useEffect(() => { if (tabela) { grafico.current?.dispose(); grafico.current = null; } }, [tabela]);

  function baixarCsv() {
    const datas = [...new Set(linhas.flatMap((l) => l.pontos.map((p) => p.data)))].sort();
    const mapas = linhas.map((l) => new Map(l.pontos.map((p) => [p.data, p.valor])));
    const cab = ["data", ...linhas.map((l) => `"${l.rotulo.replace(/"/g, "'")}"`)].join(";");
    const corpo = datas.map((d) => [d, ...mapas.map((m) => (m.has(d) ? String(m.get(d)).replace(".", ",") : ""))].join(";"));
    const blob = new Blob(["﻿" + [cab, ...corpo].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob), download: `${painel.titulo.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}.csv`,
    });
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const ultimos = visiveis.map((l) => ({ ...l, ultimo: l.pontos.at(-1) }));

  // Trajetória sobre a série inteira (não só o horizonte visível) da medida mostrada.
  const leituras = useMemo(() => {
    const medida = painel.combinado ? painel.combinado.linha : transf;
    const s0 = painel.series[0];
    const emPontos = medida !== "nivel" || s0.tipo === "Taxa" || s0.tipo === "Var % mensal" || /%/.test(s0.unidade);
    const alvo = painel.combinado ? linhas.filter((l) => l.tipo === "line") : linhas;
    return alvo.map((l) => ({ rotulo: l.rotulo, leitura: lerTrajetoria(l.pontos, emPontos, freq) }))
      .filter((x) => x.leitura !== null);
  }, [linhas, painel, transf, freq]);

  return (
    <article className="flex flex-col rounded-painel border border-linha bg-painel">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-linha px-4 py-3">
        <div className="min-w-0">
          <h2 className="font-medium text-texto">{painel.titulo}</h2>
          {(painel.combinado || opcoes.length < 2) && (
            <p className="text-xs text-texto-3">
              {painel.combinado
                ? `${rotulo(painel.combinado.barras, painel.series[0].tipo)} e ${rotulo(painel.combinado.linha, painel.series[0].tipo).toLowerCase()}`
                : rotulo(transf, painel.series[0].tipo)}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!painel.combinado && opcoes.length > 1 && (
            <select
              aria-label="Transformação" value={transf} onChange={(e) => setTransf(e.target.value as IdTransformacao)}
              className="h-8 rounded-controle border border-linha-forte bg-fundo px-2 text-sm text-texto"
            >
              {opcoes.map((o) => <option key={o} value={o}>{rotulo(o, painel.series[0].tipo)}</option>)}
            </select>
          )}
          <div role="group" aria-label="Horizonte" className="flex rounded-controle border border-linha-forte">
            {HORIZONTES.map((h) => (
              <button
                key={h.id} type="button" onClick={() => setHorizonte(h.id)} aria-pressed={horizonte === h.id}
                className={`h-8 px-2 text-xs ${horizonte === h.id ? "bg-ouro-tenue text-ouro" : "text-texto-2 hover:text-texto"}`}
              >
                {h.id}
              </button>
            ))}
          </div>
        </div>
      </header>

      {visiveis.length > 1 && (
        <ul className="flex flex-wrap gap-x-5 gap-y-1 px-4 pt-3 text-sm">
          {ultimos.map((l) => (
            <li key={l.rotulo} className="flex items-center gap-2 text-texto-2">
              <span aria-hidden className="inline-block h-0.5 w-4 rounded" style={{ background: `var(${l.cor})`, height: l.tipo === "bar" ? 8 : 2 }} />
              {l.rotulo}
              {l.ultimo && <span className="num text-texto">{fmtNumero(l.ultimo.valor, casas)}</span>}
            </li>
          ))}
        </ul>
      )}
      {visiveis.length === 1 && ultimos[0].ultimo && (
        <p className="px-4 pt-3 text-sm text-texto-2">
          <span className="num text-2xl text-texto">{fmtNumero(ultimos[0].ultimo.valor, casas)}</span>
          <span className="ml-2">em {fmtData(ultimos[0].ultimo.data, freq)}</span>
        </p>
      )}

      {vazio ? (
        <p className="px-4 py-16 text-center text-sm text-texto-2">
          Sem dados para esta combinação. Confira a série na página Saúde dos dados.
        </p>
      ) : tabela ? (
        <div key="tabela" className="max-h-72 overflow-auto px-4 py-3">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-painel text-left text-texto-3">
              <tr><th className="py-1 font-normal">Data</th>{visiveis.map((l) => <th key={l.rotulo} className="py-1 text-right font-normal">{l.rotulo}</th>)}</tr>
            </thead>
            <tbody>
              {[...new Set(visiveis.flatMap((l) => l.pontos.map((p) => p.data)))].sort().reverse().map((d) => (
                <tr key={d} className="border-t border-linha">
                  <td className="py-1 text-texto-2">{fmtData(d, freq)}</td>
                  {visiveis.map((l) => {
                    const p = l.pontos.find((x) => x.data === d);
                    return <td key={l.rotulo} className="num py-1 text-right">{p ? fmtNumero(p.valor, casas) : "—"}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div key="grafico" ref={ref} className="h-72 w-full px-2" role="img" aria-label={`Gráfico: ${painel.titulo}`} />
      )}

      {leituras.length > 0 && (
        <section aria-label="Trajetória" className="divide-y divide-linha border-t border-linha">
          {leituras.map((x) => (
            <FaixaLeitura key={x.rotulo} rotulo={leituras.length > 1 ? x.rotulo : undefined}
              leitura={x.leitura!} freq={freq} casas={casas} />
          ))}
        </section>
      )}

      <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-linha px-4 py-2 text-xs text-texto-3">
        <span>
          Fonte: {[...new Set(painel.series.map((s) => s.fonte))].join(", ")}
          {" "}({painel.series.map((s) => s.serie).join(", ")})
        </span>
        <span className="flex gap-3">
          <button type="button" onClick={() => setTabela((t) => !t)} className="hover:text-texto">
            {tabela ? "Ver gráfico" : "Ver tabela"}
          </button>
          <button type="button" onClick={baixarCsv} className="hover:text-texto">Baixar CSV</button>
        </span>
      </footer>
    </article>
  );
}
