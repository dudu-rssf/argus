import { describe, expect, it } from "vitest";
import { calcularFatos, frase } from "@/lib/fatos";

const mensal = (vals: number[], inicio = 2016) =>
  vals.map((v, i) => ({ data: `${inicio + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}-01`, valor: v }));

describe("fatos por regra", () => {
  // 10 anos subindo devagar, pico, e 4 meses de queda no fim
  const base = Array.from({ length: 116 }, (_, i) => 3 + 0.02 * i + (i % 3 === 0 ? 0.05 : 0));
  const serie = mensal([...base, 6, 5.8, 5.5, 5.3, 5.0]);

  it("Δ de 1, 3 e 12 meses na data exata", () => {
    const f = calcularFatos(serie, { emPontos: true, frequencia: "Mensal" })!;
    expect(f.ultimo.valor).toBe(5);
    expect(f.d1).toBeCloseTo(-0.3, 10);
    expect(f.d3).toBeCloseTo(5.0 - 5.8, 10);
    expect(f.d12).toBeCloseTo(5.0 - serie.at(-13)!.valor, 10);
  });

  it("meses seguidos na mesma direção", () => {
    const f = calcularFatos(serie, { emPontos: true, frequencia: "Mensal" })!;
    expect(f.sequencia).toEqual({ direcao: "caiu", periodos: 4 });
  });

  it("maior/menor desde: só quando passa de 12 meses", () => {
    const f = calcularFatos(serie, { emPontos: true, frequencia: "Mensal" })!;
    // 5,0 é o menor valor desde mar/2024 (quando estava em 4,96)
    expect(f.extremo).toEqual({ tipo: "menor", desde: "2024-03-01" });
    const subida = mensal([5, 4, 3, ...Array(20).fill(3.1), 6]);
    const g = calcularFatos(subida, { emPontos: true, frequencia: "Mensal" })!;
    expect(g.extremo).toEqual({ tipo: "maior", desde: null }); // maior de toda a série
    const h = calcularFatos(mensal([7, ...Array(20).fill(3.1), 6]), { emPontos: true, frequencia: "Mensal" })!;
    expect(h.extremo).toEqual({ tipo: "maior", desde: "2016-01-01" });
  });

  it("série parada não vira 'maior' nem 'menor' da série", () => {
    expect(calcularFatos(mensal(Array(30).fill(4.5)), { emPontos: true, frequencia: "Mensal" })!.extremo).toBeNull();
  });

  it("distância da meta do ano", () => {
    const meta = [{ data: "2025-01-01", valor: 3 }, { data: "2026-01-01", valor: 3 }];
    const f = calcularFatos(serie, { emPontos: true, frequencia: "Mensal", meta })!;
    expect(f.meta).toBe(3);
    expect(f.vsMeta).toBeCloseTo(2, 10);
  });

  it("frase só descreve, a partir dos fatos", () => {
    const meta = [{ data: "2025-01-01", valor: 3 }, { data: "2026-01-01", valor: 3 }];
    const f = calcularFatos(serie, { emPontos: true, frequencia: "Mensal", meta })!;
    expect(frase("IPCA 12 meses", f, { unidade: "%", frequencia: "Mensal" }))
      .toBe("IPCA 12 meses em 5,00%: caiu 0,80 p.p. em 3 meses, 4º mês seguido de queda; 2,00 p.p. acima da meta (3,00%); menor desde mar/2024.");
  });

  it("série curta ou vazia não inventa fatos", () => {
    expect(calcularFatos([], { emPontos: true, frequencia: "Mensal" })).toBeNull();
    const f = calcularFatos(mensal([1, 2]), { emPontos: true, frequencia: "Mensal" })!;
    expect(f.d3).toBeNull();
    expect(f.percentil).toBeNull();
  });

  it("nível usa variação em %", () => {
    const f = calcularFatos(mensal([100, 100, 100, 110]), { emPontos: false, frequencia: "Mensal" })!;
    expect(f.d3).toBeCloseTo(10, 10);
    expect(f.d1).toBeCloseTo(10, 10);
  });
});
