/**
 * Relógio do ciclo (Fase 6d): onde a medida está num ciclo de quatro fases.
 * Nível = valor − referência (ex.: meta); direção = Δ em `mesesDirecao` meses. Os dois
 * eixos são divididos pelo desvio-padrão dos últimos 10 anos (padronizados). Fases, no
 * sentido em que o ciclo costuma girar: reaquecendo → aquecendo → esfriando → fria.
 */
import type { Ponto } from "../transform";

export type Fase = "reaquecendo" | "aquecendo" | "esfriando" | "fria";
export const FASES: { id: Fase; nome: string; descricao: string }[] = [
  { id: "reaquecendo", nome: "Reaquecendo", descricao: "abaixo da referência e subindo" },
  { id: "aquecendo", nome: "Aquecendo", descricao: "acima da referência e subindo" },
  { id: "esfriando", nome: "Esfriando", descricao: "acima da referência e caindo" },
  { id: "fria", nome: "Fria", descricao: "abaixo da referência e caindo" },
];

export type PontoRelogio = { data: string; valor: number; nivel: number; direcao: number; x: number; y: number; fase: Fase };
export type Relogio = { rastro: PontoRelogio[]; atual: PontoRelogio; mesesNaFase: number; dpNivel: number; dpDirecao: number };

export const faseDe = (nivel: number, direcao: number): Fase =>
  nivel >= 0 ? (direcao >= 0 ? "aquecendo" : "esfriando") : (direcao < 0 ? "fria" : "reaquecendo");

const dp = (xs: number[]) => {
  const m = xs.reduce((s, x) => s + x, 0) / xs.length;
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length);
};
const somarMeses = (data: string, k: number) => {
  const t = Number(data.slice(0, 4)) * 12 + Number(data.slice(5, 7)) - 1 + k;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}-01`;
};

export function relogio(
  serie: Ponto[], referencia: (data: string) => number | null,
  { mesesDirecao = 6, rastroMeses = 24 }: { mesesDirecao?: number; rastroMeses?: number },
): Relogio | null {
  const mapa = new Map(serie.map((p) => [p.data.slice(0, 7), p.valor]));
  const base: { data: string; valor: number; nivel: number; direcao: number }[] = [];
  for (const p of serie) {
    const ref = referencia(p.data);
    const antes = mapa.get(somarMeses(p.data, -mesesDirecao).slice(0, 7));
    if (ref === null || antes === undefined) continue;
    base.push({ data: p.data, valor: p.valor, nivel: p.valor - ref, direcao: p.valor - antes });
  }
  if (base.length < 24) return null;
  const ultimo = base[base.length - 1];
  const corte = `${Number(ultimo.data.slice(0, 4)) - 10}${ultimo.data.slice(4)}`;
  const janela = base.filter((b) => b.data > corte);
  const dpNivel = dp(janela.map((b) => b.nivel)) || 1, dpDirecao = dp(janela.map((b) => b.direcao)) || 1;
  const pontos = base.map((b) => ({ ...b, x: b.nivel / dpNivel, y: b.direcao / dpDirecao, fase: faseDe(b.nivel, b.direcao) }));
  const rastro = pontos.slice(-(rastroMeses + 1));
  const atual = rastro[rastro.length - 1];
  let mesesNaFase = 0;
  for (let i = pontos.length - 1; i >= 0 && pontos[i].fase === atual.fase; i--) mesesNaFase++;
  return { rastro, atual, mesesNaFase, dpNivel, dpDirecao };
}
