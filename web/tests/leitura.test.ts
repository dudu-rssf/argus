import { describe, expect, it } from "vitest";
import oficiais from "./fixtures/oficiais.json";
import { lerTrajetoria } from "@/lib/leitura";
import { aplicar, type Ponto } from "@/lib/transform";

const mensal = (valores: number[], inicio = 2016): Ponto[] =>
  valores.map((v, i) => ({ data: `${inicio + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}-01`, valor: v }));

describe("leitura de trajetória", () => {
  it("curto compara com 3 meses atrás e médio com 12, em pontos para taxas", () => {
    const s = mensal(Array.from({ length: 36 }, (_, i) => i * 0.1)); // sobe 0,1 por mês
    const l = lerTrajetoria(s, true, "Mensal")!;
    expect(l.curto).toMatchObject({ direcao: "subiu", delta: expect.closeTo(0.3, 10) });
    expect(l.medio).toMatchObject({ direcao: "subiu", delta: expect.closeTo(1.2, 10) });
    expect(l.longo!.percentil).toBe(100);
  });

  it("movimento muito menor que o típico da série é 'estável'", () => {
    const ruido = Array.from({ length: 60 }, (_, i) => 5 + (i % 2 ? 0.5 : -0.5)); // Δ típico em 3 meses: 1,0
    ruido[59] = ruido[56] + 0.2;
    expect(lerTrajetoria(mensal(ruido), true, "Mensal")!.curto!.direcao).toBe("estavel");
    ruido[59] = ruido[56] + 0.3;
    expect(lerTrajetoria(mensal(ruido), true, "Mensal")!.curto!.direcao).toBe("subiu");
  });

  it("uma crise no histórico não faz uma queda clara virar 'estável'", () => {
    const ipca = oficiais.ipca_mensal.obs.map(([data, valor]) => ({ data: data as string, valor: valor as number }));
    const l = lerTrajetoria(aplicar("acum12", ipca, "Var % mensal", "Mensal"), true, "Mensal")!;
    expect(l.curto!.direcao).toBe("caiu"); // 4,72% em mai/2026 → 4,22% em ago/2026
  });

  it("nível usa variação percentual", () => {
    const s = mensal([...Array(12).fill(100), 110, 110, 110, 121]);
    expect(lerTrajetoria(s, false, "Mensal")!.curto!.delta).toBeCloseTo(10, 10);
  });

  it("sem histórico suficiente, não inventa percentil", () => {
    expect(lerTrajetoria(mensal([1, 2, 3, 4]), true, "Mensal")!.longo).toBeNull();
    expect(lerTrajetoria(mensal([1, 2]), true, "Mensal")!.medio).toBeNull();
  });

  it("IPCA 12m em ago/2026 (dados reais): referências certas", () => {
    const ipca = oficiais.ipca_mensal.obs.map(([data, valor]) => ({ data: data as string, valor: valor as number }));
    const l = lerTrajetoria(aplicar("acum12", ipca, "Var % mensal", "Mensal"), true, "Mensal")!;
    expect(l.ultimo.data).toBe("2026-08-01");
    expect(l.curto!.referencia.data).toBe("2026-05-01");
    expect(l.medio!.referencia.data).toBe("2025-08-01");
    expect(l.longo!.anos).toBeGreaterThanOrEqual(9);
  });

  it("diária procura a data de comparação com folga de até 7 dias", () => {
    const s: Ponto[] = [{ data: "2026-06-30", valor: 14.25 }, { data: "2026-09-30", valor: 13.75 }];
    expect(lerTrajetoria(s, true, "Diária")!.curto).toMatchObject({ direcao: "caiu", delta: -0.5 });
  });
});
