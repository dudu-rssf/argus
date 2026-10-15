import { describe, expect, it } from "vitest";
import { hiatoHamilton, hiatoHP, hiatoHPTempoReal, hiatos, mqo, resolver, tendenciaHP } from "@/lib/hiato";
import ref from "./fixtures/hiato_referencia.json";

const pib = ref.pib.map(([data, valor]) => ({ data: data as string, valor: valor as number }));
const casa = (s: { data: string; valor: number }[], esperado: Record<string, number>) => {
  expect(s.length).toBe(Object.keys(esperado).length);
  for (const p of s) expect(p.valor).toBeCloseTo(esperado[p.data], 6);
};

describe("álgebra", () => {
  it("resolve sistema linear", () => {
    expect(resolver([[2, 1], [1, 3]], [3, 5]).map((x) => +x.toFixed(10))).toEqual([0.8, 1.4]);
  });
  it("mínimos quadrados recupera reta exata", () => {
    const X = [0, 1, 2, 3].map((x) => [1, x]);
    expect(mqo(X, [1, 3, 5, 7]).map((b) => +b.toFixed(10))).toEqual([1, 2]);
  });
  it("tendência HP de uma reta é a própria reta", () => {
    const y = Array.from({ length: 30 }, (_, i) => 2 + 0.5 * i);
    tendenciaHP(y).forEach((t, i) => expect(t).toBeCloseTo(y[i], 8));
  });
});

describe("hiato contra statsmodels, PIB real do IBGE 1996–2026", () => {
  it("HP com a amostra inteira", () => casa(hiatoHP(pib), ref.hp));
  it("HP em tempo real (janela crescente, mínimo 20 trimestres)", () => casa(hiatoHPTempoReal(pib), ref.hpTempoReal));
  it("Hamilton (h = 8, p = 4)", () => casa(hiatoHamilton(pib), ref.hamilton));
  it("tabela junta as três por trimestre", () => {
    const t = hiatos(pib);
    expect(t).toHaveLength(pib.length);
    expect(t[0]).toMatchObject({ data: "1996-01-01", hpTempoReal: null, hamilton: null });
    const ultimo = t.at(-1)!;
    expect(ultimo.hp).toBeCloseTo(ultimo.hpTempoReal!, 10); // no último ponto as duas versões coincidem
    expect(ultimo.hamilton).not.toBeNull();
  });
  it("2020-T2 (pandemia) é o maior hiato negativo nas três", () => {
    const t = hiatos(pib);
    for (const k of ["hp", "hpTempoReal", "hamilton"] as const) {
      const min = t.filter((l) => l[k] !== null).reduce((a, b) => (b[k]! < a[k]! ? b : a));
      expect(min.data).toBe("2020-04-01");
    }
  });
});
