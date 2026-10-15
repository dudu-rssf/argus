/**
 * Regra de Taylor como faixa de especificações (Análises, item 5). Funções puras.
 *
 *   Selic da regra = r* + π + a·(π − π*) + b·hiato
 *
 * - r*: juro neutro real implícito no Focus (BR-117), leitura de mercado, não estimativa estrutural;
 * - π: IPCA 12 meses (passado) ou expectativa Focus 12 meses à frente;
 * - π*: meta do CMN do ano do mês (SGS 13521; meta contínua de 3% desde 2025);
 * - hiato: HP (amostra inteira) ou Hamilton, do trimestre a que o mês pertence; nos meses
 *   depois do último PIB, vale o último hiato conhecido (marcado na página).
 * 2 inflações × 2 valores de a × 2 de b × 2 hiatos = 16 especificações. A página mostra
 * a faixa (mínimo a máximo), a mediana e a Selic efetiva. É referência, não previsão.
 */
import { valorAte } from "./ciclos";
import { meses } from "./analogos";
import type { Ponto } from "./transform";

export type Insumos = {
  selic: Ponto[]; ipca12: Ponto[]; focus12: Ponto[]; neutro: Ponto[]; meta: Ponto[];
  hiatoHP: Ponto[]; hiatoHamilton: Ponto[];
};

export type Especificacao = { inflacao: "ipca12" | "focus12"; a: number; b: number; hiato: "hiatoHP" | "hiatoHamilton" };

export const ESPECIFICACOES: Especificacao[] = (["ipca12", "focus12"] as const).flatMap((inflacao) =>
  [0.5, 1].flatMap((a) => [0.5, 1].flatMap((b) =>
    (["hiatoHP", "hiatoHamilton"] as const).map((hiato) => ({ inflacao, a, b, hiato })))));

export const rotuloEspecificacao = (e: Especificacao) =>
  `${e.inflacao === "ipca12" ? "IPCA 12m" : "Focus 12m"} · a = ${String(e.a).replace(".", ",")} · b = ${String(e.b).replace(".", ",")} · ${e.hiato === "hiatoHP" ? "HP" : "Hamilton"}`;

/** Tolerância (dias) entre o fim do mês e o último dado de cada insumo. */
const TOLERANCIA: Record<keyof Insumos, number> = {
  selic: 10, ipca12: 75, focus12: 10, neutro: 10, meta: 400, hiatoHP: 300, hiatoHamilton: 300,
};

export function selicDaRegra(e: Especificacao, v: { pi: number; meta: number; neutro: number; hiato: number }): number {
  return v.neutro + v.pi + e.a * (v.pi - v.meta) + e.b * v.hiato;
}

export type LinhaTaylor = {
  mes: string; selic: number | null;
  especificacoes: (number | null)[]; // na ordem de ESPECIFICACOES
  minimo: number | null; maximo: number | null; mediana: number | null;
  hiatoDe: string | null; // trimestre do hiato usado (HP)
};

const fimDoMes = (mes: string) => {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
};

export function mediana(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Meses de `inicio` ('AAAA-MM') até o mês de `hoje` ('AAAA-MM-DD'); no mês corrente, os dados até hoje. */
export function faixaTaylor(ins: Insumos, inicio: string, hoje: string): LinhaTaylor[] {
  return meses(inicio, hoje.slice(0, 7)).map((mes) => {
    const d = fimDoMes(mes) < hoje ? fimDoMes(mes) : hoje;
    const v = (k: keyof Insumos) => valorAte(ins[k], d, TOLERANCIA[k]);
    const meta = v("meta")?.valor, neutro = v("neutro")?.valor;
    const especificacoes = ESPECIFICACOES.map((e) => {
      const pi = v(e.inflacao)?.valor, hiato = v(e.hiato)?.valor;
      return pi == null || hiato == null || meta == null || neutro == null ? null : selicDaRegra(e, { pi, meta, neutro, hiato });
    });
    const validas = especificacoes.filter((x): x is number => x !== null);
    const completo = validas.length === ESPECIFICACOES.length;
    return {
      mes, selic: v("selic")?.valor ?? null, especificacoes,
      minimo: completo ? Math.min(...validas) : null,
      maximo: completo ? Math.max(...validas) : null,
      mediana: completo ? mediana(validas) : null,
      hiatoDe: v("hiatoHP")?.data ?? null,
    };
  });
}
