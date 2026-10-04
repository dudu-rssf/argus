/**
 * Ciclos de política monetária (docs/specs/fase-5-analises.md). Funções puras.
 *
 * Regra: um ciclo de corte (ou de alta) reúne movimentos na mesma direção separados
 * por menos de `pausaMeses`. Termina no último movimento antes de uma inversão ou de
 * uma pausa longa. Todo intervalo entre dois ciclos é "manutenção".
 */
import type { Ponto } from "./transform";

export type TipoEpisodio = "corte" | "alta" | "manutencao";

export type Decisao = { data: string; de: number; para: number };

export type Episodio = {
  tipo: TipoEpisodio;
  inicio: string;
  fim: string;
  emAndamento: boolean;
  selicInicial: number;
  selicFinal: number;
  bps: number;
  decisoes: Decisao[];
  maiorMovimentoBps: number;
  meses: number;
};

export const PAUSA_PADRAO_MESES = 6;

/** Diferença em meses (fracionária, base 30,4375 dias). */
export function mesesEntre(a: string, b: string): number {
  return (Date.parse(b) - Date.parse(a)) / (30.4375 * 86_400_000);
}

const bps = (de: number, para: number) => Math.round((para - de) * 100);

/** Mudanças de valor da meta Selic (cada uma é uma decisão do Copom, na data em que vale). */
export function decisoes(selic: Ponto[]): Decisao[] {
  const out: Decisao[] = [];
  for (let i = 1; i < selic.length; i++) {
    if (Math.abs(selic[i].valor - selic[i - 1].valor) > 1e-9)
      out.push({ data: selic[i].data, de: selic[i - 1].valor, para: selic[i].valor });
  }
  return out;
}

export function episodios(selic: Ponto[], hoje: string, pausaMeses = PAUSA_PADRAO_MESES): Episodio[] {
  const movs = decisoes(selic);
  const grupos: Decisao[][] = [];
  for (const m of movs) {
    const g = grupos.at(-1);
    const ultimo = g?.at(-1);
    const mesmaDirecao = ultimo && Math.sign(m.para - m.de) === Math.sign(ultimo.para - ultimo.de);
    if (g && ultimo && mesmaDirecao && mesesEntre(ultimo.data, m.data) < pausaMeses) g.push(m);
    else grupos.push([m]);
  }

  const out: Episodio[] = [];
  grupos.forEach((g, i) => {
    const primeiro = g[0];
    const ultimo = g[g.length - 1];
    const ehUltimo = i === grupos.length - 1;
    const emAndamento = ehUltimo && mesesEntre(ultimo.data, hoje) < pausaMeses;
    const fim = emAndamento ? hoje : ultimo.data;
    out.push({
      tipo: ultimo.para < primeiro.de ? "corte" : "alta",
      inicio: primeiro.data, fim, emAndamento,
      selicInicial: primeiro.de, selicFinal: ultimo.para,
      bps: bps(primeiro.de, ultimo.para),
      decisoes: g,
      maiorMovimentoBps: Math.max(...g.map((d) => Math.abs(bps(d.de, d.para)))),
      meses: mesesEntre(primeiro.data, fim),
    });
    const proximo = grupos[i + 1]?.[0];
    const fimManutencao = proximo ? proximo.data : emAndamento ? null : hoje;
    if (fimManutencao) {
      out.push({
        tipo: "manutencao", inicio: ultimo.data, fim: fimManutencao, emAndamento: !proximo,
        selicInicial: ultimo.para, selicFinal: ultimo.para, bps: 0, decisoes: [],
        maiorMovimentoBps: 0, meses: mesesEntre(ultimo.data, fimManutencao),
      });
    }
  });
  return out;
}

// ---------------------------------------------------------------- métricas do episódio

/** Último valor até a data, se não estiver mais velho que `toleranciaDias`. */
export function valorAte(serie: Ponto[], data: string, toleranciaDias: number): Ponto | null {
  let lo = 0, hi = serie.length - 1, achado = -1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    if (serie[m].data <= data) { achado = m; lo = m + 1; } else hi = m - 1;
  }
  if (achado < 0) return null;
  const p = serie[achado];
  return (Date.parse(data) - Date.parse(p.data)) / 86_400_000 <= toleranciaDias ? p : null;
}

export type Variacao = "pp" | "pct";
export type DefMetrica = { id: string; rotulo: string; variacao: Variacao; toleranciaDias: number; unidade: string };
export type ValorMetrica = { inicio: Ponto | null; fim: Ponto | null; delta: number | null };

export function medir(serie: Ponto[], def: DefMetrica, inicio: string, fim: string): ValorMetrica {
  const a = valorAte(serie, inicio, def.toleranciaDias);
  const b = valorAte(serie, fim, def.toleranciaDias);
  let delta: number | null = null;
  if (a && b) delta = def.variacao === "pp" ? b.valor - a.valor : a.valor !== 0 ? (b.valor / a.valor - 1) * 100 : null;
  return { inicio: a, fim: b, delta };
}

/** Variação % de um preço entre o fim do episódio e `meses` depois (só se essa data já passou). */
export function depois(serie: Ponto[], fim: string, meses: number, hoje: string, toleranciaDias: number): number | null {
  const alvo = new Date(Date.parse(fim) + meses * 30.4375 * 86_400_000).toISOString().slice(0, 10);
  if (alvo > hoje) return null;
  const a = valorAte(serie, fim, toleranciaDias);
  const b = valorAte(serie, alvo, toleranciaDias);
  return a && b && a.valor !== 0 ? (b.valor / a.valor - 1) * 100 : null;
}

/** Trajetória da Selic desde o início do episódio, em meses (para o gráfico alinhado em t = 0). */
export function trajetoria(selic: Ponto[], ep: Episodio, mesesMax = 36): { t: number; valor: number }[] {
  const out: { t: number; valor: number }[] = [];
  const limite = Math.min(mesesMax, Math.ceil(ep.meses) + 1);
  for (let k = 0; k <= limite; k++) {
    const data = new Date(Date.parse(ep.inicio) + k * 30.4375 * 86_400_000).toISOString().slice(0, 10);
    if (data > ep.fim && k > 0) break;
    const p = valorAte(selic, data, 10);
    if (p) out.push({ t: k, valor: k === 0 ? ep.selicInicial : p.valor });
  }
  // Fecha no fim do episódio (a última decisão costuma cair entre dois meses cheios).
  if (ep.meses <= mesesMax && out.at(-1)?.t !== ep.meses) {
    const p = valorAte(selic, ep.fim, 10);
    if (p) out.push({ t: Math.round(ep.meses * 10) / 10, valor: p.valor });
  }
  return out;
}
