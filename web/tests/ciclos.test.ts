import { describe, expect, it } from "vitest";
import oficiais from "./fixtures/oficiais.json";
import { decisoes, depois, episodios, medir, trajetoria, valorAte } from "@/lib/ciclos";
import type { Ponto } from "@/lib/transform";

const selic: Ponto[] = oficiais.selic_meta.obs.map(([data, valor]) => ({ data: data as string, valor: valor as number }));
const HOJE = "2026-10-04";

describe("episódios da Selic (dados reais desde 2015)", () => {
  const eps = episodios(selic, HOJE);
  const resumo = eps.map((e) => [e.tipo, e.inicio, e.fim, e.bps]);

  it("identifica os ciclos conhecidos", () => {
    expect(resumo).toContainEqual(["corte", "2016-10-20", "2018-03-22", -775]); // 14,25 → 6,50
    expect(resumo).toContainEqual(["corte", "2019-08-01", "2020-08-06", -450]); // 6,50 → 2,00
    expect(resumo).toContainEqual(["alta", "2021-03-18", "2022-08-04", 1175]); // 2,00 → 13,75
    expect(resumo).toContainEqual(["corte", "2023-08-03", "2024-05-09", -325]); // 13,75 → 10,50
    expect(resumo).toContainEqual(["alta", "2024-09-19", "2025-06-19", 450]); // 10,50 → 15,00
  });

  it("todo intervalo entre ciclos é manutenção, inclusive pausa curta entre direções opostas", () => {
    expect(resumo).toContainEqual(["manutencao", "2018-03-22", "2019-08-01", 0]);
    expect(resumo).toContainEqual(["manutencao", "2022-08-04", "2023-08-03", 0]);
    expect(resumo).toContainEqual(["manutencao", "2024-05-09", "2024-09-19", 0]); // 4 meses, entre corte e alta
    expect(resumo).toContainEqual(["manutencao", "2025-06-19", "2026-03-19", 0]);
  });

  it("ciclo atual fica em andamento até hoje", () => {
    const atual = eps.at(-1)!;
    expect(atual).toMatchObject({ tipo: "corte", inicio: "2026-03-19", fim: HOJE, emAndamento: true, bps: -125 });
    expect(atual.decisoes).toHaveLength(5);
  });

  it("episódios encadeados, sem buraco nem sobreposição", () => {
    const corpo = eps.slice(1);
    corpo.forEach((e, i) => expect(e.inicio).toBe(eps[i].fim));
  });

  it("maior movimento e número de decisões", () => {
    const alta2021 = eps.find((e) => e.inicio === "2021-03-18")!;
    expect(alta2021.decisoes).toHaveLength(12);
    expect(alta2021.maiorMovimentoBps).toBe(150);
  });

  it("pausa abaixo do limite fica dentro do ciclo", () => {
    const comPausaCurta = episodios(selic, HOJE, 3); // com 3 meses, a pausa de 2024 não muda nada
    expect(comPausaCurta.some((e) => e.inicio === "2024-09-19" && e.tipo === "alta")).toBe(true);
  });
});

describe("métricas", () => {
  const s = [{ data: "2026-01-01", valor: 5 }, { data: "2026-06-01", valor: 4 }];
  it("valor até a data respeita a tolerância", () => {
    expect(valorAte(s, "2026-02-15", 60)?.valor).toBe(5);
    expect(valorAte(s, "2026-05-15", 60)).toBeNull(); // dado de jan está velho demais
  });
  it("variação em p.p. e em %", () => {
    expect(medir(s, { id: "x", rotulo: "", variacao: "pp", toleranciaDias: 40, unidade: "%" }, "2026-01-10", "2026-06-10").delta).toBeCloseTo(-1, 10);
    expect(medir(s, { id: "x", rotulo: "", variacao: "pct", toleranciaDias: 40, unidade: "" }, "2026-01-10", "2026-06-10").delta).toBeCloseTo(-20, 10);
  });
  it("'depois' só calcula quando a data já passou", () => {
    expect(depois(s, "2026-01-01", 12, "2026-10-04", 40)).toBeNull();
  });
  it("trajetória começa na Selic anterior ao primeiro movimento", () => {
    const ep = episodios(selic, HOJE).find((e) => e.inicio === "2021-03-18")!;
    const t = trajetoria(selic, ep);
    expect(t[0]).toEqual({ t: 0, valor: 2 });
    expect(t.at(-1)!.valor).toBe(13.75);
  });
  it("decisões vêm das mudanças de valor", () => {
    expect(decisoes([{ data: "a", valor: 1 }, { data: "b", valor: 1 }, { data: "c", valor: 2 }])).toEqual([{ data: "c", de: 1, para: 2 }]);
  });
});
