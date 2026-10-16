import { describe, expect, it } from "vitest";
import ipca from "@/lib/gerado/ipca.json";
import { cestaMensal, classificar, dadosSubitens, datasSubitens, ID_SUBITEM, maioresMovimentos, type Classificacao } from "@/lib/geral/composicao";
import oficiais from "./fixtures/oficiais.json";
import subitens from "./fixtures/subitens.json";

type Chave = keyof typeof oficiais;
const p = (k: Chave) => (oficiais[k].obs as [string, number][]).map(([data, valor]) => ({ data, valor }));

/** Subitens exportados (desde 2023) no formato do banco. */
export function subitensReais() {
  const obs = subitens.obs as unknown as Record<string, [string, number][]>;
  return Object.fromEntries(Object.entries(obs).map(([k, v]) => {
    const [variavel, id] = k.split(".");
    return [ID_SUBITEM(Number(variavel) as 63 | 66, id), v.map(([data, valor]) => ({ data, valor }))];
  }));
}

const itens = classificar(ipca.subitens, ipca.classificacao as Classificacao);
const d = dadosSubitens(subitensReais(), itens);
const datas = datasSubitens(d);
const ids = (area: string) => itens.filter((s) => s.area === area).map((s) => s.id);

describe("classificação dos subitens reproduz as séries do BCB (desde 2023)", () => {
  const casos: [string, Chave, number][] = [
    ["servicos", "servicos_mensal", 0.02], ["alimentacao", "alimentos_mensal", 0.02],
    ["industriais", "industriais_mensal", 0.02], ["monitorados", "monitorados_mensal", 0.03],
  ];
  for (const [area, chave, tol] of casos) it(area, () => {
    const oficial = new Map(p(chave).map((x) => [x.data, x.valor]));
    const difs = cestaMensal(d, ids(area), datas).flatMap((c) => (oficial.has(c.data) ? [Math.abs(c.variacao - oficial.get(c.data)!)] : []));
    const media = difs.reduce((s, x) => s + x, 0) / difs.length;
    console.log(area, "meses", difs.length, "diferença média", media.toFixed(4), "máxima", Math.max(...difs).toFixed(4));
    expect(difs.length).toBeGreaterThan(30);
    expect(media).toBeLessThan(tol);
  });

  it("as 4 áreas somam o IPCA do mês (pesos ≈ 100%)", () => {
    const ipcaMes = new Map(p("ipca_mensal_todo").map((x) => [x.data, x.valor]));
    const total = cestaMensal(d, itens.map((s) => s.id), datas);
    for (const t of total) {
      expect(t.peso).toBeGreaterThan(99.9);
      if (ipcaMes.has(t.data)) expect(Math.abs(t.contribuicao - ipcaMes.get(t.data)!)).toBeLessThan(0.011);
    }
  });

  it("todo subitem tem grupo", () => {
    expect(itens.every((s) => /^7\d{3}$/.test(s.grupo))).toBe(true);
  });

  it("maiores movimentos em alimentação (3 meses)", () => {
    const m = maioresMovimentos(d, itens.filter((s) => s.grupo === "7170"), datas, datas.at(-1)!, 3);
    console.log(m.map((x) => `${x.nome} ${x.delta.toFixed(3)} (12m ${x.var12?.toFixed(1)}%)`).join(" | "));
    expect(m.length).toBeGreaterThan(3);
  });
});
