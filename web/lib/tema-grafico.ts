/**
 * Tema comum dos gráficos (Fase 6b, "mesa de operações"): sem grade de fundo, eixo de
 * valores à direita, mira tracejada, rótulos em fonte mono, etiqueta do último valor
 * na ponta da linha. Só roda no navegador (lê as variáveis CSS dos tokens).
 */
import * as echarts from "echarts/core";

export const css = (nome: string) => getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
const mono = () => `${css("--fonte-mono") || "'JetBrains Mono'"}, ui-monospace, SFMono-Regular, Menlo, monospace`;

export function eixoTexto() {
  return { color: css("--cor-texto-3"), fontFamily: mono(), fontSize: 11 };
}

export function tooltipBase() {
  return {
    backgroundColor: css("--cor-painel-alto"),
    borderColor: css("--cor-linha-forte"),
    borderWidth: 1,
    padding: [8, 10],
    textStyle: { color: css("--cor-texto"), fontSize: 12, fontFamily: mono() },
    extraCssText: "border-radius:3px;box-shadow:none;",
  };
}

export function miraEixo() {
  return {
    type: "cross" as const,
    lineStyle: { color: css("--cor-mira"), type: "dashed" as const, width: 1 },
    crossStyle: { color: css("--cor-mira"), type: "dashed" as const, width: 1 },
    label: { backgroundColor: css("--cor-painel-alto"), color: css("--cor-texto"), fontFamily: mono(), fontSize: 11,
      borderColor: css("--cor-linha-forte"), borderWidth: 1 },
  };
}

/** Eixo de categorias (datas) discreto: sem linha de grade, só a base. */
export function eixoX(extra: Record<string, unknown> = {}) {
  return {
    axisLabel: { ...eixoTexto(), hideOverlap: true, margin: 10 },
    axisLine: { lineStyle: { color: css("--cor-linha") } },
    axisTick: { show: false },
    splitLine: { show: false },
    ...extra,
  };
}

/** Eixo de valores à direita, sem grade (como nos terminais de mercado). */
export function eixoY(extra: Record<string, unknown> = {}) {
  return {
    type: "value" as const, position: "right" as const, scale: true,
    axisLabel: { ...eixoTexto(), margin: 8 },
    axisLine: { show: false }, axisTick: { show: false },
    splitLine: { show: false },
    ...extra,
  };
}

/** Área degradê sob a série principal. */
export function areaDegrade(cor: string) {
  return {
    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: comAlfa(cor, 0.22) },
      { offset: 1, color: comAlfa(cor, 0) },
    ]),
  };
}

/** Etiqueta com o último valor na ponta da linha, na cor da série. */
export function etiquetaFinal(cor: string, formatar: (v: number) => string) {
  return {
    show: true,
    formatter: (p: { value: unknown }) => {
      const v = Array.isArray(p.value) ? p.value[p.value.length - 1] : p.value;
      return typeof v === "number" ? formatar(v) : "";
    },
    backgroundColor: cor, color: css("--cor-fundo"), fontFamily: mono(), fontSize: 11, fontWeight: 600,
    padding: [2, 5], borderRadius: 2, distance: 6,
  };
}

export function comAlfa(hex: string, a: number): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${a})`;
}
