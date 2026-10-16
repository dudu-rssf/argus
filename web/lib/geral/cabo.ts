/**
 * Cabo de guerra (Fase 6d): contribuição de cada grupo para o acumulado em 12 meses.
 * Contribuição do mês = peso do mês × variação do mês / 100 (IBGE, t7060 v66 e v63);
 * em 12 meses, a soma das 12 contribuições (aproximação aditiva do acumulado encadeado).
 */
import type { Ponto } from "../transform";

export type Grupo = { id: string; nome: string; variacao: Ponto[]; peso: Ponto[] };
export type ItemCabo = { id: string; nome: string; atual: number; antes: number; delta: number };

const mesAbs = (d: string) => Number(d.slice(0, 4)) * 12 + Number(d.slice(5, 7)) - 1;

/** Série da contribuição do grupo somada em 12 meses (só com 12 meses seguidos). */
export function contribuicoes12m(g: Grupo): Ponto[] {
  const pesos = new Map(g.peso.map((p) => [p.data, p.valor]));
  const mensal = g.variacao.flatMap((v) => (pesos.has(v.data) ? [{ data: v.data, valor: (v.valor * pesos.get(v.data)!) / 100 }] : []));
  const out: Ponto[] = [];
  for (let i = 11; i < mensal.length; i++) {
    const janela = mensal.slice(i - 11, i + 1);
    if (mesAbs(janela[11].data) - mesAbs(janela[0].data) !== 11) continue;
    out.push({ data: mensal[i].data, valor: janela.reduce((s, p) => s + p.valor, 0) });
  }
  return out;
}

/** Na última data comum a todos os grupos: contribuição atual, k meses antes e a diferença. */
export function caboDeGuerra(grupos: Grupo[], meses = 3): { data: string | null; itens: ItemCabo[]; total: number } {
  const series = grupos.map((g) => ({ g, s: new Map(contribuicoes12m(g).map((p) => [p.data, p.valor])) }));
  const comuns = [...series[0]?.s.keys() ?? []].filter((d) => series.every((x) => x.s.has(d))).sort();
  const data = comuns.at(-1) ?? null;
  if (!data) return { data: null, itens: [], total: 0 };
  const alvo = mesAbs(data) - meses;
  const antesData = comuns.find((d) => mesAbs(d) === alvo);
  const itens = series.map(({ g, s }) => {
    const atual = s.get(data)!, antes = antesData ? s.get(antesData)! : NaN;
    return { id: g.id, nome: g.nome, atual, antes, delta: atual - antes };
  }).filter((i) => Number.isFinite(i.delta)).sort((a, b) => b.delta - a.delta);
  return { data, itens, total: itens.reduce((s, i) => s + i.atual, 0) };
}
