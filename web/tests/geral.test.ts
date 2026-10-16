import { describe, expect, it } from "vitest";
import { relogio } from "@/lib/geral/relogio";
import { caboDeGuerra, contribuicoes12m } from "@/lib/geral/cabo";
import { mesesSeguidos } from "@/lib/geral/checklist";

const mensal = (vals: number[], inicio = 2016) =>
  vals.map((v, i) => ({ data: `${inicio + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}-01`, valor: v }));

describe("relógio do ciclo", () => {
  // senoide: passa pelas 4 fases
  const s = mensal(Array.from({ length: 120 }, (_, i) => 4 + 2 * Math.sin((2 * Math.PI * i) / 48)));
  const r = relogio(s, () => 4, { mesesDirecao: 6, rastroMeses: 24 })!;
  it("rastro de 24 meses e fase pelos sinais de nível e direção", () => {
    expect(r.rastro).toHaveLength(25);
    for (const p of r.rastro) {
      const esperado = p.nivel >= 0 ? (p.direcao >= 0 ? "aquecendo" : "esfriando") : (p.direcao < 0 ? "fria" : "reaquecendo");
      expect(p.fase).toBe(esperado);
    }
  });
  it("conta há quantos meses está na fase atual", () => {
    const n = r.mesesNaFase;
    const fases = r.rastro.map((p) => p.fase);
    expect(fases.slice(-n).every((f) => f === r.atual.fase)).toBe(true);
    expect(fases.at(-n - 1)).not.toBe(r.atual.fase);
  });
  it("eixos padronizados pelo desvio-padrão de 10 anos", () => {
    expect(Math.max(...r.rastro.map((p) => Math.abs(p.x)))).toBeLessThan(3);
  });
  it("sem referência ou histórico curto, não inventa", () => {
    expect(relogio(mensal([1, 2, 3]), () => 2, {})).toBeNull();
    expect(relogio(s, () => null, {})).toBeNull();
  });
});

describe("cabo de guerra", () => {
  const g = (id: string, nome: string, v: number[], p: number[]) => ({ id, nome, variacao: mensal(v), peso: mensal(p) });
  const a = g("a", "A", Array(15).fill(1), Array(15).fill(50));            // contribui 0,5 por mês
  const b = g("b", "B", [...Array(12).fill(0), 2, 2, 2], Array(15).fill(50)); // passa a contribuir 1,0 por mês
  it("contribuição em 12 meses = Σ peso × variação / 100", () => {
    const c = contribuicoes12m(a);
    expect(c.at(-1)!.valor).toBeCloseTo(6, 10);
    expect(contribuicoes12m(b).at(-1)!.valor).toBeCloseTo(3, 10);
  });
  it("ordena quem empurrou e quem puxou em 3 meses", () => {
    const r = caboDeGuerra([a, b], 3);
    expect(r.data).toBe("2017-03-01");
    expect(r.itens[0]).toMatchObject({ id: "b", delta: expect.closeTo(3, 10), atual: expect.closeTo(3, 10) });
    expect(r.itens[1].delta).toBeCloseTo(0, 10);
    expect(r.total).toBeCloseTo(9, 10);
  });
});

describe("checklist", () => {
  it("meses seguidos em que a condição vale, até o último", () => {
    expect(mesesSeguidos(mensal([5, 2, 4, 5, 6]), (p) => p.valor > 3)).toBe(3);
    expect(mesesSeguidos(mensal([5, 2]), (p) => p.valor > 3)).toBe(0);
  });
});
