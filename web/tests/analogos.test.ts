import { describe, expect, it } from "vitest";
import { encontrarAnalogos, meses, painelMensal, variacaoAnual, type LinhaMes } from "@/lib/analogos";

const linha = (mes: string, x: number, y: number, extra: Record<string, number> = {}): LinhaMes =>
  ({ mes, valores: { x, y, ...extra } });

describe("análogos", () => {
  it("meses entre duas datas", () => {
    expect(meses("2025-11-01", "2026-02-15")).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });

  it("acha o mês mais parecido, ignora os recentes e separa os escolhidos", () => {
    const ms = meses("2000-01-01", "2026-08-01");
    const painel = ms.map((m, i) => linha(m, Math.sin(i / 7), Math.cos(i / 11)));
    const atualIdx = ms.length - 1;
    painel[100] = linha(ms[100], painel[atualIdx].valores.x!, painel[atualIdx].valores.y!); // gêmeo exato
    const { atual, analogos } = encontrarAnalogos(painel, ["x", "y"], { quantos: 3 });
    expect(atual!.mes).toBe("2026-08");
    expect(analogos[0].mes).toBe(ms[100]);
    expect(analogos[0].distancia).toBeCloseTo(0, 10);
    expect(analogos.every((a) => a.mes <= "2024-08")).toBe(true);
    const idx = analogos.map((a) => ms.indexOf(a.mes));
    for (let i = 0; i < idx.length; i++) for (let j = i + 1; j < idx.length; j++) expect(Math.abs(idx[i] - idx[j])).toBeGreaterThanOrEqual(12);
  });

  it("desfecho 12 meses depois: p.p. para taxas e % para preços", () => {
    const ms = meses("2000-01-01", "2026-08-01");
    const painel = ms.map((m, i) => linha(m, i, 0, { selic: 10, dolar: 2, ipca12: 4, ibov: 100, ibc: 1 }));
    painel[12] = { ...painel[12], valores: { ...painel[12].valores, selic: 12, dolar: 2.5, ibov: 80 } };
    painel.at(-1)!.valores.x = 0; // hoje parecido com o começo da amostra
    const { analogos } = encontrarAnalogos(painel, ["x"], { quantos: 1 });
    expect(analogos[0].mes).toBe("2000-01");
    expect(analogos[0].depois.selic).toBeCloseTo(2, 10);
    expect(analogos[0].depois.dolar).toBeCloseTo(25, 10);
    expect(analogos[0].depois.ibov).toBeCloseTo(-20, 10);
  });

  it("variável sem dado no mês atual faz o mês atual recuar ao último completo", () => {
    const painel = [linha("2026-07", 1, 1), { mes: "2026-08", valores: { x: 1, y: null } }];
    expect(encontrarAnalogos(painel as LinhaMes[], ["x", "y"]).atual!.mes).toBe("2026-07");
  });

  it("painel mensal usa o último dado até o fim do mês e variação anual", () => {
    const p = painelMensal({ d: { pontos: [{ data: "2025-01-31", valor: 5 }, { data: "2026-01-30", valor: 6 }], toleranciaDias: 7 } }, "2025-01-01", "2026-01-01");
    expect(p[0].valores.d).toBe(5);
    expect(p[1].valores.d).toBeNull(); // fevereiro sem dado recente
    expect(variacaoAnual(p, "d", "dYoY").at(-1)!.valores.dYoY).toBeCloseTo(20, 10);
  });
});

import oficiais from "./fixtures/oficiais.json";
import { painelAnalogos, SERIES_CICLOS } from "@/lib/analises";

describe("análogos com dados reais (Selic e IPCA desde 2015)", () => {
  const p = (k: keyof typeof oficiais) => oficiais[k].obs.map(([data, valor]) => ({ data: data as string, valor: valor as number }));
  const painel = painelAnalogos({ [SERIES_CICLOS.selic]: p("selic_meta"), [SERIES_CICLOS.ipca12]: p("ipca_12m_oficial") }, "2026-10-04");

  it("painel mensal com Selic, IPCA 12m e Δ Selic em 6 meses", () => {
    const ago = painel.find((l) => l.mes === "2026-08")!;
    expect(ago.valores.selic).toBe(14);
    expect(ago.valores.ipca12).toBe(4.22);
    expect(ago.valores.selicD6).toBeCloseTo(-1, 10); // 15,00 em fev → 14,00 em ago
  });

  it("encontra 5 análogos antes de out/2024 com desfecho em 12 meses", () => {
    const { atual, analogos } = encontrarAnalogos(painel, ["ipca12", "selic", "selicD6"]);
    expect(atual!.mes).toBe("2026-08"); // setembro ainda sem IPCA
    expect(analogos).toHaveLength(5);
    expect(analogos.every((a) => a.mes <= "2024-08" && a.mes >= "2016-01")).toBe(true);
    expect(analogos[0].depois.selic).not.toBeNull();
  });
});
