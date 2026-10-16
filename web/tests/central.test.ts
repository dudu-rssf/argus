import { describe, expect, it } from "vitest";
import { direcoes, faixaMercado, seriesDivulgadas } from "@/lib/central";
import { SERIES_CICLOS } from "@/lib/analises";
import { abas } from "@/lib/config";
import oficiais from "./fixtures/oficiais.json";

const p = (k: keyof typeof oficiais) => oficiais[k].obs.map(([data, valor]) => ({ data: data as string, valor: valor as number }));
const pt = (data: string, valor: number) => ({ data, valor });

describe("faixa de mercado", () => {
  const dados = {
    [SERIES_CICLOS.selic]: p("selic_meta_todo").filter((x) => x.data <= "2026-10-15"),
    [SERIES_CICLOS.ipca12]: p("ipca_12m_todo").filter((x) => x.data <= "2026-09-01"),
    [SERIES_CICLOS.focus12]: p("focus_12m_todo").filter((x) => x.data <= "2026-10-09"),
    [SERIES_CICLOS.dolar]: [pt("2026-10-13", 5.4), pt("2026-10-14", 5.454)],
  };
  const f = Object.fromEntries(faixaMercado(dados).map((x) => [x.id, x]));

  it("Selic: último valor e a última decisão em pontos-base", () => {
    expect(f.selic.ultimo!.valor).toBe(13.75);
    expect(f.selic.delta).toBe(-25);
    expect(f.selic.referencia!.valor).toBe(14);
  });
  it("dólar: variação % contra o dia anterior", () => {
    expect(f.dolar.delta).toBeCloseTo(1, 10);
  });
  it("IPCA 12m: diferença em p.p. contra o mês anterior", () => {
    expect(f.ipca12.ultimo).toEqual(pt("2026-09-01", 4.58));
    expect(f.ipca12.referencia!.data).toBe("2026-08-01");
    expect(f.ipca12.delta).toBeCloseTo(4.58 - 4.22, 10);
  });
  it("Focus: contra 4 semanas antes", () => {
    expect(f.focus12.referencia!.data <= "2026-09-11").toBe(true);
    expect(f.focus12.referencia!.data >= "2026-09-01").toBe(true);
  });
  it("série sem dados não inventa valor", () => {
    expect(f.ibov.ultimo).toBeNull();
    expect(f.ibov.delta).toBeNull();
    expect(f.juroReal.delta).toBeNull();
  });
});

describe("direções", () => {
  it("IPCA 12 meses e desocupação com direção de curto e médio prazo", () => {
    const d = direcoes({ [SERIES_CICLOS.ipca12]: p("ipca_12m_todo"), [SERIES_CICLOS.desocupacao]: p("desocupacao_todo") });
    const ipca = d.find((x) => x.id === "ipca12")!;
    expect(ipca.ultimo!.data).toBe("2026-09-01");
    expect(["subiu", "caiu", "estavel"]).toContain(ipca.curto);
    expect(d.find((x) => x.id === "ibc")!.ultimo).toBeNull();
  });
});

describe("séries com divulgação", () => {
  it("só mensais, trimestrais e anuais das abas, sem repetir", () => {
    const s = seriesDivulgadas(abas(), 2026);
    expect(s.length).toBeGreaterThan(40);
    expect(s.some((x) => /di[áa]ria|semanal/i.test(x.frequencia))).toBe(false);
    expect(new Set(s.map((x) => x.dado)).size).toBe(s.length);
    expect(s.find((x) => x.dado === "BR-026:13522")!.aba).toBe("Inflação");
  });
});
