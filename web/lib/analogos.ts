/**
 * Períodos históricos parecidos com hoje (Análises, item 3). Funções puras.
 *
 * Cada mês vira um vetor de indicadores padronizados (z-score sobre toda a amostra).
 * A semelhança é a distância euclidiana média entre o mês atual e cada mês do passado,
 * só com as variáveis escolhidas. Meses muito próximos de hoje ficam de fora, e os
 * análogos escolhidos ficam a pelo menos `separacao` meses um do outro.
 */
import { valorAte } from "./ciclos";
import type { Ponto } from "./transform";

export type Variavel = { id: string; rotulo: string; unidade: string };
export type LinhaMes = { mes: string; valores: Record<string, number | null> };
export type Analogo = { mes: string; distancia: number; valores: Record<string, number | null>; depois: Record<string, number | null> };

export const DESFECHOS: Variavel[] = [
  { id: "selic", rotulo: "Selic", unidade: "p.p." },
  { id: "ipca12", rotulo: "IPCA 12 meses", unidade: "p.p." },
  { id: "dolar", rotulo: "Dólar", unidade: "%" },
  { id: "ibov", rotulo: "Ibovespa", unidade: "%" },
  { id: "ibc", rotulo: "IBC-Br (var. anual)", unidade: "p.p." },
];

export function meses(inicio: string, fim: string): string[] {
  const out: string[] = [];
  let [a, m] = [Number(inicio.slice(0, 4)), Number(inicio.slice(5, 7))];
  const [af, mf] = [Number(fim.slice(0, 4)), Number(fim.slice(5, 7))];
  while (a < af || (a === af && m <= mf)) {
    out.push(`${a}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; a++; }
  }
  return out;
}

const fimDoMes = (mes: string) => {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
};
const somarMeses = (mes: string, k: number) => {
  const total = Number(mes.slice(0, 4)) * 12 + Number(mes.slice(5, 7)) - 1 + k;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
};

/**
 * Painel mensal: cada série vale o último dado até o fim do mês (diárias) ou o dado do
 * próprio mês de referência (mensais, tolerância de 40 dias).
 */
export function painelMensal(series: Record<string, { pontos: Ponto[]; toleranciaDias: number }>, inicio: string, fim: string): LinhaMes[] {
  return meses(inicio, fim).map((mes) => ({
    mes,
    valores: Object.fromEntries(Object.entries(series).map(([id, s]) => [id, valorAte(s.pontos, fimDoMes(mes), s.toleranciaDias)?.valor ?? null])),
  }));
}

/** Variação anual (em %) de uma variável do painel, para preços (dólar, Ibovespa). */
export function variacaoAnual(painel: LinhaMes[], id: string, novoId: string): LinhaMes[] {
  const mapa = new Map(painel.map((l) => [l.mes, l.valores[id]]));
  return painel.map((l) => {
    const antes = mapa.get(somarMeses(l.mes, -12));
    const agora = l.valores[id];
    return { ...l, valores: { ...l.valores, [novoId]: agora != null && antes ? (agora / antes - 1) * 100 : null } };
  });
}

/** Último mês com todas as variáveis escolhidas disponíveis. */
export function mesAtual(painel: LinhaMes[], vars: string[]): LinhaMes | null {
  for (let i = painel.length - 1; i >= 0; i--) if (vars.every((v) => painel[i].valores[v] != null)) return painel[i];
  return null;
}

export function encontrarAnalogos(
  painel: LinhaMes[], vars: string[], opcoes: { quantos?: number; excluirUltimos?: number; separacao?: number } = {},
): { atual: LinhaMes | null; analogos: Analogo[] } {
  const { quantos = 5, excluirUltimos = 24, separacao = 12 } = opcoes;
  const atual = mesAtual(painel, vars);
  if (!atual || !vars.length) return { atual, analogos: [] };

  const completos = painel.filter((l) => vars.every((v) => l.valores[v] != null));
  const escala = Object.fromEntries(vars.map((v) => {
    const xs = completos.map((l) => l.valores[v] as number);
    const media = xs.reduce((s, x) => s + x, 0) / xs.length;
    const dp = Math.sqrt(xs.reduce((s, x) => s + (x - media) ** 2, 0) / xs.length) || 1;
    return [v, { media, dp }];
  }));
  const z = (l: LinhaMes, v: string) => ((l.valores[v] as number) - escala[v].media) / escala[v].dp;
  const limite = somarMeses(atual.mes, -excluirUltimos);

  const candidatos = completos
    .filter((l) => l.mes <= limite)
    .map((l) => ({ l, d: Math.sqrt(vars.reduce((s, v) => s + (z(l, v) - z(atual, v)) ** 2, 0) / vars.length) }))
    .sort((a, b) => a.d - b.d);

  const porMes = new Map(painel.map((l) => [l.mes, l]));
  const escolhidos: Analogo[] = [];
  for (const { l, d } of candidatos) {
    const dist = (a: string, b: string) => Math.abs((Number(a.slice(0, 4)) - Number(b.slice(0, 4))) * 12 + Number(a.slice(5, 7)) - Number(b.slice(5, 7)));
    if (escolhidos.some((e) => dist(e.mes, l.mes) < separacao)) continue;
    const futuro = porMes.get(somarMeses(l.mes, 12));
    const depois: Record<string, number | null> = {};
    for (const { id, unidade } of DESFECHOS) {
      const a = l.valores[id], b = futuro?.valores[id];
      depois[id] = a == null || b == null ? null : unidade === "%" ? (a ? (b / a - 1) * 100 : null) : b - a;
    }
    escolhidos.push({ mes: l.mes, distancia: d, valores: l.valores, depois });
    if (escolhidos.length === quantos) break;
  }
  return { atual, analogos: escolhidos };
}
