import { describe, expect, it } from "vitest";
import {
  acumuladoEncadeado, acumuladoIndice, aplicar, anualizado, deltaPP, somaMovel,
  transformacoesValidas, variacaoPct, type Ponto,
} from "@/lib/transform";

const m = (ym: string, valor: number): Ponto => ({ data: `${ym}-01`, valor });

describe("variação percentual", () => {
  it("MoM e YoY com data exata em série mensal", () => {
    const s = [m("2025-01", 100), m("2025-02", 102), m("2026-01", 110)];
    expect(variacaoPct(s, 1)).toEqual([{ data: "2025-02-01", valor: expect.closeTo(2, 10) }]);
    expect(variacaoPct(s, 12)[0].valor).toBeCloseTo(10, 10);
  });
  it("mês faltando não gera ponto (nunca compara com o mês errado)", () => {
    expect(variacaoPct([m("2025-01", 100), m("2025-03", 110)], 1)).toEqual([]);
  });
  it("diária compara com o último valor até a data, até 7 dias antes", () => {
    const s = [{ data: "2025-06-13", valor: 10 }, { data: "2026-06-15", valor: 11 }];
    expect(variacaoPct(s, 12, "Diária")[0].valor).toBeCloseTo(10, 10); // 15/06/2025 foi domingo
    const longe = [{ data: "2025-05-01", valor: 10 }, { data: "2026-06-15", valor: 11 }];
    expect(variacaoPct(longe, 12, "Diária")).toEqual([]);
  });
});

describe("acumulados", () => {
  it("variação mensal é encadeada, não somada", () => {
    const s = [m("2026-01", 1), m("2026-02", 1), m("2026-03", 1)];
    expect(acumuladoEncadeado(s, 3)[0].valor).toBeCloseTo(3.0301, 10); // 1,01³ − 1
  });
  it("exige meses consecutivos", () => {
    expect(acumuladoEncadeado([m("2026-01", 1), m("2026-03", 1), m("2026-04", 1)], 3)).toEqual([]);
  });
  it("índice: soma dos n meses contra os mesmos meses do ano anterior", () => {
    const s = [m("2025-01", 100), m("2025-02", 100), m("2026-01", 104), m("2026-02", 106)];
    expect(acumuladoIndice(s, 2)).toEqual([{ data: "2026-02-01", valor: expect.closeTo(5, 10) }]);
  });
  it("trimestral: acumulado em 4 trimestres sai só nas datas de trimestre", () => {
    const s = [m("2025-01", 100), m("2025-04", 100), m("2025-07", 100), m("2025-10", 100),
      m("2026-01", 102), m("2026-04", 102), m("2026-07", 102), m("2026-10", 106)];
    const r = aplicar("acum12", s, "Índice", "Trimestral");
    expect(r.map((p) => p.data)).toEqual(["2026-10-01"]);
    expect(r[0].valor).toBeCloseTo(3, 10); // (102·3 + 106) / 400 − 1
  });
});

describe("anualizado, Δ p.p. e soma", () => {
  it("3 meses anualizado: índice e variação mensal", () => {
    const s = [m("2026-01", 100), m("2026-04", 101)];
    expect(anualizado(s, 3, "Índice")[0].valor).toBeCloseTo((1.01 ** 4 - 1) * 100, 10);
    const v = [m("2026-01", 0.5), m("2026-02", 0.5), m("2026-03", 0.5)];
    expect(anualizado(v, 3, "Var % mensal")[0].valor).toBeCloseTo((1.005 ** 12 - 1) * 100, 10);
  });
  it("Δ p.p. é diferença simples", () => {
    expect(deltaPP([m("2025-09", 15), m("2026-09", 13.75)], 12)[0].valor).toBeCloseTo(-1.25, 10);
  });
  it("soma móvel de fluxo", () => {
    expect(somaMovel([m("2026-01", 1), m("2026-02", 2), m("2026-03", 3)], 3)).toEqual([m("2026-03", 6)]);
  });
});

describe("transformações válidas por tipo", () => {
  it("taxa nunca oferece acumulado; variação mensal nunca oferece MoM", () => {
    expect(transformacoesValidas("Taxa", "Mensal")).not.toContain("acum12");
    expect(transformacoesValidas("Var % mensal", "Mensal")).not.toContain("mom");
  });
  it("índice trimestral oferece QoQ em vez de MoM", () => {
    const t = transformacoesValidas("Índice", "Trimestral");
    expect(t).toContain("qoq");
    expect(t).not.toContain("mom");
  });
});
