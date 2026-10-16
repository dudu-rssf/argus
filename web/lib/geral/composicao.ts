/**
 * Composição do IPCA a partir dos subitens (IBGE SIDRA t7060, variação v63 e peso v66).
 * Funções puras. A classificação vem de config/derivadas/ipca_classificacao.yaml
 * (curadoria conferida contra as séries do BCB; ver tests/composicao-real.test.ts).
 *
 * Contribuição de uma cesta no mês = Σ peso_i × variação_i / 100 (p.p. do IPCA do mês).
 * Variação da cesta no mês = Σ peso_i × variação_i / Σ peso_i.
 */
import type { Ponto } from "../transform";

export type Subitem = { id: string; codigo: string; nome: string };
export type AreaId = "servicos" | "monitorados" | "alimentacao" | "industriais";
export type Classificacao = {
  grupos: Record<string, { id: string; nome: string; influencias: string[] }>;
  servicos: { nome: string; prefixos: string[] }[];
  monitorados: string[];
  alimentacao_domicilio: string[];
  areas: { id: AreaId; nome: string; influencia: string; serie: string; racional: string }[];
  lentes: { nome: string; influencia: string; serie: string }[];
};
export type SubitemClassificado = Subitem & { grupo: string; area: AreaId; servico: string | null };

export const ID_SUBITEM = (variavel: 63 | 66, id: string) => `BR-041:t7060/v63,66/c315=all@${variavel}.${id}`;

const casa = (codigo: string, prefixos: string[]) => prefixos.some((p) => codigo.startsWith(p));

export function classificar(subitens: Subitem[], c: Classificacao): SubitemClassificado[] {
  return subitens.map((s) => {
    const servico = c.servicos.find((g) => casa(s.codigo, g.prefixos))?.nome ?? null;
    const area: AreaId = servico ? "servicos"
      : casa(s.codigo, c.monitorados) ? "monitorados"
      : casa(s.codigo, c.alimentacao_domicilio) ? "alimentacao" : "industriais";
    return { ...s, grupo: c.grupos[s.codigo[0]]?.id ?? "", area, servico };
  });
}

/** Mapa data → valor de cada subitem (variação e peso), só para os que estão no banco. */
export type DadosSubitens = Map<string, { v: Map<string, number>; w: Map<string, number> }>;
export function dadosSubitens(dados: Record<string, Ponto[]>, itens: Subitem[]): DadosSubitens {
  const out: DadosSubitens = new Map();
  for (const s of itens) {
    const v = dados[ID_SUBITEM(63, s.id)] ?? [], w = dados[ID_SUBITEM(66, s.id)] ?? [];
    if (!v.length || !w.length) continue;
    out.set(s.id, { v: new Map(v.map((p) => [p.data, p.valor])), w: new Map(w.map((p) => [p.data, p.valor])) });
  }
  return out;
}

export function datasSubitens(d: DadosSubitens): string[] {
  const s = new Set<string>();
  for (const x of d.values()) for (const k of x.v.keys()) if (x.w.has(k)) s.add(k);
  return [...s].sort();
}

/** Cesta mensal: variação ponderada, peso total e contribuição (p.p. do IPCA). */
export function cestaMensal(d: DadosSubitens, ids: string[], datas: string[]): { data: string; variacao: number; peso: number; contribuicao: number }[] {
  return datas.flatMap((data) => {
    let num = 0, peso = 0;
    for (const id of ids) {
      const x = d.get(id);
      const v = x?.v.get(data), w = x?.w.get(data);
      if (v === undefined || w === undefined) continue;
      num += v * w; peso += w;
    }
    return peso > 0 ? [{ data, variacao: num / peso, peso, contribuicao: num / 100 }] : [];
  });
}

const mesAbs = (d: string) => Number(d.slice(0, 4)) * 12 + Number(d.slice(5, 7)) - 1;

/** Soma móvel de 12 meses seguidos de uma série mensal (contribuição em 12 meses). */
export function soma12(serie: Ponto[]): Ponto[] {
  const out: Ponto[] = [];
  for (let i = 11; i < serie.length; i++) {
    if (mesAbs(serie[i].data) - mesAbs(serie[i - 11].data) !== 11) continue;
    out.push({ data: serie[i].data, valor: serie.slice(i - 11, i + 1).reduce((s, p) => s + p.valor, 0) });
  }
  return out;
}

/** Variação encadeada em 12 meses de uma série de variações mensais. */
export function encadeado12(serie: Ponto[]): Ponto[] {
  const out: Ponto[] = [];
  for (let i = 11; i < serie.length; i++) {
    if (mesAbs(serie[i].data) - mesAbs(serie[i - 11].data) !== 11) continue;
    out.push({ data: serie[i].data, valor: (serie.slice(i - 11, i + 1).reduce((s, p) => s * (1 + p.valor / 100), 1) - 1) * 100 });
  }
  return out;
}

export type Movimento = { id: string; nome: string; contrib: number; delta: number; var12: number | null; servico: string | null };

/**
 * Subitens que mais mexeram na contribuição de 12 meses de um conjunto, entre `data` e
 * `k` meses antes. Ordena pelo tamanho da mudança (com sinal preservado).
 */
export function maioresMovimentos(d: DadosSubitens, itens: SubitemClassificado[], datas: string[], data: string, k: number, quantos = 6): Movimento[] {
  const antes = datas.find((x) => mesAbs(x) === mesAbs(data) - k);
  if (!antes) return [];
  const out: Movimento[] = [];
  for (const s of itens) {
    const x = d.get(s.id);
    if (!x) continue;
    const contrib = soma12(datas.flatMap((dt) => {
      const v = x.v.get(dt), w = x.w.get(dt);
      return v === undefined || w === undefined ? [] : [{ data: dt, valor: (v * w) / 100 }];
    }));
    const agora = contrib.find((p) => p.data === data), a = contrib.find((p) => p.data === antes);
    if (!agora || !a) continue;
    const var12 = encadeado12(datas.flatMap((dt) => { const v = x.v.get(dt); return v === undefined ? [] : [{ data: dt, valor: v }]; }))
      .find((p) => p.data === data)?.valor ?? null;
    out.push({ id: s.id, nome: s.nome, contrib: agora.valor, delta: agora.valor - a.valor, var12, servico: s.servico });
  }
  return out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, quantos);
}
