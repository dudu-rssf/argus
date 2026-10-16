"use client";

/**
 * Motor de gráfico (plano.md): horizonte, transformação válida para o tipo da série
 * (com atalhos MoM/ToT/YoY), combinado barras + linha (mesma unidade, um só eixo),
 * tabela, CSV, fórmula, "i" com a origem do dado, tela cheia e escolhas lembradas.
 * As transformações rodam aqui, no navegador, a partir dos dados lidos do banco.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { BarChart, LineChart } from "echarts/charts";
import { DataZoomComponent, GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { HORIZONTES, lerSalvo, salvar, useEstadoAba, type IdHorizonte } from "@/components/aba/estado-aba";
import { BotaoFormula, PainelFormula } from "@/components/formula";
import { Info } from "@/components/info";
import type { Painel } from "@/lib/config";
import { fmtData, fmtNumero } from "@/lib/formato";
import { FORMULA_TRAJETORIA, FORMULAS_DERIVADAS, formulaTransformacao, type Formula } from "@/lib/formulas";
import { lerTrajetoria } from "@/lib/leitura";
import { areaDegrade, css, eixoX, eixoY, etiquetaFinal, miraEixo, tooltipBase } from "@/lib/tema-grafico";
import {
  aplicar, atalhos, ROTULO_ATALHO, rotulo, transformacoesValidas, valoresNasDatas,
  type Atalho, type IdTransformacao, type Ponto,
} from "@/lib/transform";
import { FaixaLeitura } from "./faixa-leitura";

echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, DataZoomComponent, CanvasRenderer]);

type Linha = { rotulo: string; cor: string; tipo: "line" | "bar"; pontos: Ponto[]; frequencia: string };

function inicioDoHorizonte(fim: string, anos: number): string {
  if (!anos) return "0000-01-01";
  return `${Number(fim.slice(0, 4)) - anos}${fim.slice(4)}`;
}

function casasDecimais(id: IdTransformacao, unidade: string): number {
  if (id !== "nivel") return 2;
  return /mil|postos|pessoas|R\$|US\$|pontos/i.test(unidade) ? 0 : 2;
}

const sinal = (v: number, casas: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${fmtNumero(Math.abs(v), casas)}`;

export function PainelGrafico({ painel, dados, formulasExtras = [], novo = null }: {
  painel: Painel; dados: Record<string, Ponto[]>; formulasExtras?: Formula[]; novo?: string | null;
}) {
  const aba = useEstadoAba();
  const s0 = painel.series[0];
  const freq = s0.frequencia;
  const chave = aba && painel.id ? `argus:${aba.abaId}:${painel.id}` : null;
  const opcoes = useMemo(() => {
    const listas = painel.series.map((s) => transformacoesValidas(s.tipo, s.frequencia));
    return listas.reduce((acc, l) => acc.filter((t) => l.includes(t)));
  }, [painel]);
  const rapidos = useMemo(() => {
    const a = atalhos(s0.tipo, s0.frequencia);
    return (Object.keys(a) as Atalho[]).filter((k) => a[k] && opcoes.includes(a[k]!)).map((k) => ({ id: k, transf: a[k]! }));
  }, [s0, opcoes]);

  const padrao = opcoes.includes(painel.transformacao) ? painel.transformacao : "nivel";
  const [transf, setTransf] = useState<IdTransformacao>(padrao);
  const [horizonte, setHorizonte] = useState<IdHorizonte>(aba?.horizonte ?? "10A");
  const [tabela, setTabela] = useState(false);
  const [formulaAberta, setFormulaAberta] = useState(false);
  const [cheio, setCheio] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const grafico = useRef<echarts.ECharts | null>(null);

  // Escolhas lembradas no navegador (por aba e painel).
  useEffect(() => {
    if (!chave) return;
    const s = lerSalvo<{ transf?: IdTransformacao; horizonte?: IdHorizonte }>(chave);
    if (s?.transf && opcoes.includes(s.transf)) setTransf(s.transf);
    if (s?.horizonte && HORIZONTES.some((h) => h.id === s.horizonte)) setHorizonte(s.horizonte);
  }, [chave, opcoes]);
  const escolher = (t: IdTransformacao | null, h: IdHorizonte | null) => {
    if (t) setTransf(t);
    if (h) setHorizonte(h);
    if (chave) salvar(chave, { transf: t ?? transf, horizonte: h ?? horizonte });
  };
  // Horizonte da aba inteira: quando muda, todos os gráficos seguem.
  const versao = aba?.versao ?? 0;
  useEffect(() => {
    if (versao > 0 && aba) { setHorizonte(aba.horizonte); if (chave) salvar(chave, { transf, horizonte: aba.horizonte }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versao]);

  useEffect(() => {
    if (!cheio) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setCheio(false); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [cheio]);

  const linhas: Linha[] = useMemo(() => {
    const cores = [1, 2, 3, 4, 5].map((i) => `--serie-${i}`);
    if (painel.combinado) {
      const base = dados[s0.dado] ?? [];
      return [
        { rotulo: `${s0.rotulo}: ${rotulo(painel.combinado.barras, s0.tipo).toLowerCase()}`, cor: cores[1], tipo: "bar", frequencia: s0.frequencia,
          pontos: aplicar(painel.combinado.barras, base, s0.tipo, s0.frequencia) },
        { rotulo: `${s0.rotulo}: ${rotulo(painel.combinado.linha, s0.tipo).toLowerCase()}`, cor: cores[0], tipo: "line", frequencia: s0.frequencia,
          pontos: aplicar(painel.combinado.linha, base, s0.tipo, s0.frequencia) },
      ];
    }
    return painel.series.map((s, i) => ({
      rotulo: s.rotulo, cor: cores[i % cores.length], tipo: "line", frequencia: s.frequencia,
      pontos: aplicar(transf, dados[s.dado] ?? [], s.tipo, s.frequencia),
    }));
  }, [painel, dados, transf, s0]);

  const fim = linhas.flatMap((l) => l.pontos.map((p) => p.data)).sort().at(-1) ?? "";
  const inicio = inicioDoHorizonte(fim, HORIZONTES.find((h) => h.id === horizonte)!.anos);
  const visiveis = useMemo(
    () => linhas.map((l) => ({
      ...l,
      // série anual: o ano em que o horizonte começa também entra (vale o ano todo)
      pontos: l.pontos.filter((p) => (/^anual/i.test(l.frequencia) ? p.data.slice(0, 4) >= inicio.slice(0, 4) : p.data >= inicio)),
    })), [linhas, inicio]);
  const casas = casasDecimais(painel.combinado ? "mom" : transf, s0.unidade);
  const vazio = visiveis.every((l) => l.pontos.length === 0);

  useEffect(() => {
    if (!ref.current || tabela || vazio) return;
    const g = grafico.current ?? echarts.init(ref.current, undefined, { renderer: "canvas" });
    grafico.current = g;
    // Eixo pelas séries não anuais (a anual vale o ano inteiro e só se encaixa nelas).
    const doEixo = visiveis.some((l) => !/^anual/i.test(l.frequencia)) ? visiveis.filter((l) => !/^anual/i.test(l.frequencia)) : visiveis;
    const datas = [...new Set(doEixo.flatMap((l) => l.pontos.map((p) => p.data)))].sort();
    const temBarra = visiveis.some((l) => l.tipo === "bar");
    const umaLinha = visiveis.filter((l) => l.tipo === "line").length === 1;
    g.setOption({
      animation: false,
      grid: { left: 4, right: 4, top: 16, bottom: 24, containLabel: true },
      tooltip: {
        ...tooltipBase(), trigger: "axis", axisPointer: miraEixo(),
        valueFormatter: (v: unknown) => (typeof v === "number" ? fmtNumero(v, casas) : "—"),
      },
      xAxis: eixoX({
        type: "category", data: datas, boundaryGap: temBarra,
        axisLabel: { ...eixoX().axisLabel, formatter: (v: string) => fmtData(v, freq) },
        axisPointer: { label: { formatter: (p: { value: string }) => fmtData(p.value, freq) } },
      }),
      yAxis: eixoY({
        axisLabel: { ...eixoY().axisLabel, formatter: (v: number) => fmtNumero(v, casas === 0 ? 0 : 1) },
        axisPointer: { label: { formatter: (p: { value: number }) => fmtNumero(p.value, casas) } },
      }),
      dataZoom: [{ type: "inside" }],
      series: visiveis.map((l, i) => {
        const cor = css(l.cor);
        return {
          name: l.rotulo, type: l.tipo, showSymbol: false, symbolSize: 6,
          data: valoresNasDatas(l.pontos, datas, l.frequencia),
          connectNulls: false, step: /^anual/i.test(l.frequencia) ? "end" : undefined,
          lineStyle: { width: 1.75, color: cor },
          itemStyle: { color: cor, borderRadius: [2, 2, 0, 0] },
          areaStyle: l.tipo === "line" && umaLinha && i === visiveis.findIndex((x) => x.tipo === "line") ? areaDegrade(cor) : undefined,
          endLabel: l.tipo === "line" ? etiquetaFinal(cor, (v) => fmtNumero(v, casas)) : undefined,
          emphasis: { disabled: true },
          barMaxWidth: 10, barCategoryGap: "35%",
        };
      }),
    }, { notMerge: true });
    g.resize();
    const redimensionar = () => g.resize();
    window.addEventListener("resize", redimensionar);
    return () => window.removeEventListener("resize", redimensionar);
  }, [visiveis, tabela, vazio, casas, freq, cheio]);

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

  // Toda conta mostrada tem fórmula (decisão 0015): a transformação escolhida e as séries derivadas.
  const formulas = useMemo(() => {
    const transfs = painel.combinado ? [painel.combinado.barras, painel.combinado.linha] : [transf];
    const deTransf = transfs.map((t) => formulaTransformacao(t, s0.tipo, s0.frequencia)).filter((f): f is Formula => f !== null);
    // Com fórmula própria da análise, ela já explica as séries derivadas.
    const derivadas = formulasExtras.length ? [] : [...new Set(painel.series.filter((s) => s.dado.endsWith(":derivado")).map((s) => s.serie))]
      .map((id) => FORMULAS_DERIVADAS[id]).filter(Boolean);
    return [...formulasExtras, ...derivadas, ...deTransf];
  }, [painel, transf, formulasExtras, s0]);

  const ultimos = visiveis.map((l) => ({ ...l, ultimo: l.pontos.at(-1), anterior: l.pontos.at(-2) }));

  // Trajetória sobre a série inteira (não só o horizonte visível) da medida mostrada.
  const emPontos = (painel.combinado ? painel.combinado.linha : transf) !== "nivel" || s0.tipo === "Taxa" || s0.tipo === "Var % mensal" || /%/.test(s0.unidade);
  const leituras = useMemo(() => {
    const alvo = painel.combinado ? linhas.filter((l) => l.tipo === "line") : linhas;
    return alvo.filter((l) => !/^anual/i.test(l.frequencia)).map((l) => ({ rotulo: l.rotulo, leitura: lerTrajetoria(l.pontos, emPontos, freq) }))
      .filter((x) => x.leitura !== null);
  }, [linhas, painel, emPontos, freq]);

  const medida = painel.combinado
    ? `${rotulo(painel.combinado.barras, s0.tipo)} e ${rotulo(painel.combinado.linha, s0.tipo).toLowerCase()}`
    : rotulo(transf, s0.tipo);

  return (
    <>
      {cheio && <div aria-hidden className="fixed inset-0 z-40 bg-fundo/85 backdrop-blur-sm" onClick={() => setCheio(false)} />}
      <article
        id={painel.id}
        className={`flex scroll-mt-20 flex-col rounded-painel border border-linha bg-painel ${cheio ? "fixed inset-3 z-50 overflow-auto md:inset-8" : ""}`}
      >
        <header className="flex flex-col gap-2 px-4 pt-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold tracking-tight text-texto">{painel.titulo}</h2>
              <Info titulo={painel.titulo}>
                {painel.descricao && <span className="mb-2 block text-texto">{painel.descricao}</span>}
                {painel.series.map((s) => (
                  <span key={s.dado} className="mb-2 block">
                    <span className="block text-texto">{s.rotulo}{s.indicador && s.indicador !== s.rotulo ? `: ${s.indicador}` : ""}</span>
                    <span className="block">Fonte: {s.fonte} · código {s.codigo === "derivado" ? "calculado pelo Argus (ver Fórmula)" : s.codigo}</span>
                    <span className="block">{s.frequencia} · {s.unidade}</span>
                    {s.observacao && <span className="block">{s.observacao}</span>}
                  </span>
                ))}
                <span className="block">Mostrando: {medida.toLowerCase()}.</span>
              </Info>
              {novo && (
                <span title={`Dado novo em ${fmtData(novo.slice(0, 10), "Diária")}`}
                  className="rounded-controle bg-ouro-tenue px-1.5 py-0.5 text-[10px] font-semibold text-ouro">novo</span>
              )}
            </div>
            <p className="text-xs text-texto-3">{medida}</p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
            {!painel.combinado && rapidos.length > 0 && (
              <div role="group" aria-label="Comparação" className="flex rounded-controle border border-linha">
                {rapidos.map((r) => (
                  <button key={r.id} type="button" onClick={() => escolher(r.transf, null)} aria-pressed={transf === r.transf}
                    title={rotulo(r.transf, s0.tipo)}
                    className={`num h-7 px-2 text-[11px] font-medium ${transf === r.transf ? "bg-ouro-tenue text-ouro" : "text-texto-2 hover:text-texto"}`}>
                    {ROTULO_ATALHO[r.id]}
                  </button>
                ))}
              </div>
            )}
            {!painel.combinado && opcoes.length > 1 && (
              <select
                aria-label="Transformação" value={transf} onChange={(e) => escolher(e.target.value as IdTransformacao, null)}
                className="h-7 max-w-48 rounded-controle border border-linha bg-fundo px-2 text-xs text-texto-2"
              >
                {opcoes.map((o) => <option key={o} value={o}>{rotulo(o, s0.tipo)}</option>)}
              </select>
            )}
            </div>
            <div className="flex items-center gap-2">
            <div role="group" aria-label="Horizonte" className="flex rounded-controle border border-linha">
              {HORIZONTES.map((h) => (
                <button
                  key={h.id} type="button" onClick={() => escolher(null, h.id)} aria-pressed={horizonte === h.id}
                  className={`num h-7 px-2 text-[11px] ${horizonte === h.id ? "bg-ouro-tenue text-ouro" : "text-texto-2 hover:text-texto"}`}
                >
                  {h.id}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setCheio((c) => !c)} aria-label={cheio ? "Fechar tela cheia" : "Abrir em tela cheia"}
              title={cheio ? "Fechar (Esc)" : "Tela cheia"}
              className="flex h-7 w-7 items-center justify-center rounded-controle border border-linha text-texto-2 hover:text-texto">
              <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                {cheio ? <path d="M6 2v4H2M10 2v4h4M6 14v-4H2M10 14v-4h4" /> : <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" />}
              </svg>
            </button>
            </div>
          </div>
        </header>

        {!vazio && (
          <ul className="flex flex-wrap gap-x-6 gap-y-1 px-4 pt-3">
            {ultimos.map((l) => {
              const delta = l.ultimo && l.anterior ? l.ultimo.valor - l.anterior.valor : null;
              return (
                <li key={l.rotulo} className="flex items-baseline gap-2">
                  <span aria-hidden className="inline-block w-3 self-center rounded-sm" style={{ background: `var(${l.cor})`, height: l.tipo === "bar" ? 8 : 2 }} />
                  <span className="text-xs text-texto-2">{l.rotulo}</span>
                  {l.ultimo && <span className={`num ${visiveis.length === 1 ? "text-2xl" : "text-sm"} font-medium text-texto`}>{fmtNumero(l.ultimo.valor, casas)}</span>}
                  {delta !== null && (
                    <span className={`num text-xs ${delta > 0 ? "text-alta" : delta < 0 ? "text-baixa" : "text-texto-3"}`}>
                      {delta > 0 ? "▲" : delta < 0 ? "▼" : "■"} {sinal(delta, casas)}
                    </span>
                  )}
                  {l.ultimo && <span className="text-xs text-texto-3">{fmtData(l.ultimo.data, l.frequencia)}</span>}
                </li>
              );
            })}
          </ul>
        )}

        {vazio ? (
          <p className="px-4 py-16 text-center text-sm text-texto-2">
            Sem dados para esta combinação. Confira a série na página Saúde dos dados.
          </p>
        ) : tabela ? (
          <div key="tabela" className="max-h-72 overflow-auto px-4 py-3">
            <table className="num w-full text-xs">
              <thead className="sticky top-0 bg-painel text-left text-texto-3">
                <tr><th className="py-1 font-normal">Data</th>{visiveis.map((l) => <th key={l.rotulo} className="py-1 text-right font-normal">{l.rotulo}</th>)}</tr>
              </thead>
              <tbody>
                {[...new Set(visiveis.flatMap((l) => l.pontos.map((p) => p.data)))].sort().reverse().map((d) => (
                  <tr key={d} className="border-t border-linha">
                    <td className="py-1 text-texto-2">{fmtData(d, freq)}</td>
                    {visiveis.map((l) => {
                      const p = l.pontos.find((x) => x.data === d);
                      return <td key={l.rotulo} className="py-1 text-right text-texto">{p ? fmtNumero(p.valor, casas) : "—"}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div key="grafico" ref={ref} className={`${cheio ? "h-[60vh]" : "h-64"} w-full px-1`} role="img" aria-label={`Gráfico: ${painel.titulo}`} />
        )}

        {leituras.length > 0 && (
          <section aria-label="Trajetória" className="divide-y divide-linha border-t border-linha">
            {leituras.map((x) => (
              <FaixaLeitura key={x.rotulo} rotulo={leituras.length > 1 ? x.rotulo : undefined}
                leitura={x.leitura!} freq={freq} casas={casas} />
            ))}
          </section>
        )}

        {formulaAberta && <PainelFormula formulas={leituras.length ? [...formulas, FORMULA_TRAJETORIA] : formulas} />}

        <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-linha px-4 py-2 text-xs text-texto-3">
          <span className="truncate">
            {[...new Set(painel.series.map((s) => s.fonte))].join(", ")}
            {" "}({[...new Set(painel.series.map((s) => s.serie))].join(", ")})
          </span>
          <span className="flex gap-3">
            {(formulas.length > 0 || leituras.length > 0) && <BotaoFormula aberta={formulaAberta} alternar={() => setFormulaAberta((a) => !a)} />}
            <button type="button" onClick={() => setTabela((t) => !t)} className="hover:text-texto">
              {tabela ? "Ver gráfico" : "Ver tabela"}
            </button>
            <button type="button" onClick={baixarCsv} className="hover:text-texto">Baixar CSV</button>
          </span>
        </footer>
      </article>
    </>
  );
}
