import { describe, expect, it } from "vitest";
import { ESPECIFICACOES, faixaTaylor, mediana, rotuloEspecificacao, selicDaRegra, type Insumos } from "@/lib/taylor";

const p = (data: string, valor: number) => ({ data, valor });

describe("regra de Taylor", () => {
  it("16 especificações distintas", () => {
    expect(ESPECIFICACOES).toHaveLength(16);
    expect(new Set(ESPECIFICACOES.map(rotuloEspecificacao)).size).toBe(16);
  });

  it("conta feita à mão: r* 5 + π 4,5 + 0,5·(4,5 − 3) + 1·(−1) = 9,25", () => {
    expect(selicDaRegra({ inflacao: "ipca12", a: 0.5, b: 1, hiato: "hiatoHP" }, { pi: 4.5, meta: 3, neutro: 5, hiato: -1 })).toBeCloseTo(9.25, 10);
  });

  it("mediana", () => {
    expect(mediana([3, 1, 2])).toBe(2);
    expect(mediana([4, 1, 3, 2])).toBe(2.5);
    expect(mediana([])).toBeNull();
  });

  const ins: Insumos = {
    selic: [p("2026-01-31", 15), p("2026-02-28", 14.5)],  // SGS 432 é diária
    ipca12: [p("2026-01-01", 4.5), p("2026-02-01", 4.5)],
    focus12: [p("2026-01-25", 4), p("2026-02-25", 4)],
    neutro: [p("2026-01-25", 5), p("2026-02-25", 5)],
    meta: [p("2026-01-01", 3)],
    hiatoHP: [p("2026-01-01", 1)],
    hiatoHamilton: [p("2026-01-01", -1)],
  };

  it("faixa mensal com mínimo, máximo e mediana das 16", () => {
    const [jan, fev] = faixaTaylor(ins, "2026-01", "2026-02");
    expect(jan.selic).toBe(15);
    // menor: Focus 4 + 0,5·1 − 1·1 (Hamilton, b = 1) = 5 + 4 + 0,5 − 1 = 8,5
    expect(jan.minimo).toBeCloseTo(8.5, 10);
    // maior: IPCA 4,5 + 1·1,5 + 1·1 (HP, b = 1) = 5 + 4,5 + 1,5 + 1 = 12
    expect(jan.maximo).toBeCloseTo(12, 10);
    expect(jan.especificacoes.every((x) => x !== null)).toBe(true);
    expect(jan.hiatoDe).toBe("2026-01-01");
    expect(fev.mediana).toBeCloseTo(jan.mediana!, 10);
  });

  it("sem algum insumo, o mês fica sem faixa (nunca preenche com zero)", () => {
    const [jan] = faixaTaylor({ ...ins, focus12: [] }, "2026-01", "2026-01");
    expect(jan.minimo).toBeNull();
    expect(jan.especificacoes.filter((x) => x === null)).toHaveLength(8);
  });

  it("hiato velho demais não é usado", () => {
    const [out] = faixaTaylor(ins, "2026-11", "2026-11");
    expect(out.hiatoDe).toBeNull();
    expect(out.mediana).toBeNull();
  });
});
