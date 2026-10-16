import { describe, expect, it } from "vitest";
import type { ItemResumo, Painel } from "@/lib/config";
import { fichaResumo, maioresMudancas } from "@/lib/resumo";

const mensal = (vals: number[], inicio = 2020) =>
  vals.map((v, i) => ({ data: `${inicio + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}-01`, valor: v }));
const serie = (dado: string, tipo: "Taxa" | "Índice" = "Taxa") => ({
  dado, serie: dado.split(":")[0], rotulo: dado, tipo, frequencia: "Mensal", unidade: "%", fonte: "teste", codigo: "1",
});

describe("fichas do resumo", () => {
  it("valor, Δ contra o período anterior em p.p. e minicurva de 24 meses", () => {
    const item: ItemResumo = { ...serie("BR-1:1"), transformacao: "nivel" };
    const f = fichaResumo(item, mensal(Array.from({ length: 36 }, (_, i) => 5 + i * 0.1)));
    expect(f.ultimo!.valor).toBeCloseTo(8.5, 10);
    expect(f.delta).toBeCloseTo(0.1, 10);
    expect(f.emPontos).toBe(true);
    expect(f.minicurva.length).toBe(24);
    expect(f.curto).toBe("subiu");
  });
  it("sem dados, sem valor (nada inventado)", () => {
    const f = fichaResumo({ ...serie("BR-1:1"), transformacao: "nivel" }, []);
    expect(f.ultimo).toBeNull();
    expect(f.delta).toBeNull();
  });
});

describe("o que mais mudou", () => {
  const calmo = Array.from({ length: 48 }, (_, i) => 5 + (i % 2 ? 0.1 : -0.1));
  const salto = [...calmo.slice(0, 47), calmo[46] + 1];
  const p = (id: string, dado: string): Painel => ({ id, titulo: id, transformacao: "nivel", combinado: null, eventos: null, series: [serie(dado)] });
  it("ordena pelo tamanho do último movimento contra o típico da própria série", () => {
    const m = maioresMudancas([p("calmo", "A:1"), p("salto", "B:1")], { "A:1": mensal(calmo), "B:1": mensal(salto) }, "2024-01-15");
    expect(m[0].painelId).toBe("salto");
    expect(m[0].razao).toBeCloseTo(1 / 0.2, 6);
    expect(m[0].delta).toBeCloseTo(1, 10);
  });
  it("ignora dados velhos", () => {
    expect(maioresMudancas([p("salto", "B:1")], { "B:1": mensal(salto) }, "2026-01-15")).toEqual([]);
  });
});
