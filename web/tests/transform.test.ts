import { describe, expect, it } from "vitest";
import {
  acumuladoEncadeado, acumuladoIndice, aplicar, anualizado, deltaPP, somaMovel,
  atalhos, transformacoesValidas, valoresNasDatas, variacaoPct, type Ponto,
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

describe("série anual num painel com séries mais frequentes", () => {
  const meta = [{ data: "2023-01-01", valor: 3.25 }, { data: "2024-01-01", valor: 3 }];
  it("vale o ano inteiro (degrau), sem interpolar entre anos", () => {
    const datas = ["2022-12-01", "2023-01-01", "2023-06-01", "2023-12-01", "2024-03-01", "2025-01-01"];
    expect(valoresNasDatas(meta, datas, "Anual")).toEqual([null, 3.25, 3.25, 3.25, 3, null]);
  });
  it("taxa trimestral não oferece Δ de 1 mês", () => {
    expect(transformacoesValidas("Taxa", "Trimestral")).toEqual(["nivel", "dpp3", "dpp12"]);
  });
  it("série anual só tem nível", () => {
    expect(transformacoesValidas("Taxa", "Anual")).toEqual(["nivel"]);
  });
  it("séries não anuais só aparecem na própria data", () => {
    const ipca = [{ data: "2023-01-01", valor: 5.77 }];
    expect(valoresNasDatas(ipca, ["2023-01-01", "2023-02-01"], "Mensal")).toEqual([5.77, null]);
  });
});

describe("MoM, ToT e YoY", () => {
  const idx = (vals: number[]) => vals.map((v, i) => ({ data: `2025-${String(i + 1).padStart(2, "0")}-01`, valor: v }));
  it("ToT de índice: média dos 3 últimos meses contra os 3 anteriores", () => {
    const [p] = aplicar("tot", idx([100, 101, 102, 104, 105, 106]), "Índice", "Mensal");
    expect(p.data).toBe("2025-06-01");
    expect(p.valor).toBeCloseTo((105 / 101 - 1) * 100, 10);
  });
  it("ToT de fluxo: soma contra soma", () => {
    const [p] = aplicar("tot", idx([1, 2, 3, 2, 2, 2]), "Fluxo", "Mensal");
    expect(p.valor).toBeCloseTo((6 / 6 - 1) * 100, 10);
  });
  it("ToT exige 6 meses seguidos", () => {
    const s = idx([100, 101, 102, 104, 105, 106]);
    s.splice(2, 1);
    expect(aplicar("tot", s, "Índice", "Mensal")).toEqual([]);
  });
  it("atalhos certos por tipo", () => {
    expect(atalhos("Índice", "Mensal")).toEqual({ mom: "mom", tot: "tot", yoy: "yoy" });
    expect(atalhos("Índice", "Trimestral")).toEqual({ mom: null, tot: "qoq", yoy: "yoy" });
    expect(atalhos("Var % mensal", "Mensal")).toEqual({ mom: "nivel", tot: "acum3", yoy: "acum12" });
    expect(atalhos("Taxa", "Mensal")).toEqual({ mom: "dpp1", tot: "dpp3", yoy: "dpp12" });
    expect(atalhos("Taxa", "Anual")).toEqual({ mom: null, tot: null, yoy: null });
  });
  it("todo atalho é uma transformação oferecida para o tipo", () => {
    for (const tipo of ["Índice", "Estoque", "Fluxo", "Var % mensal", "Taxa"] as const)
      for (const f of ["Mensal", "Trimestral", "Diária"])
        for (const t of Object.values(atalhos(tipo, f))) if (t) expect(transformacoesValidas(tipo, f), `${tipo} ${f} ${t}`).toContain(t);
  });
});
