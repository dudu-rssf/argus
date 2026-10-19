import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import gerado from "@/lib/gerado/config.json";
import { FORMULA_FATOS, FORMULA_TRAJETORIA, FORMULAS_ANALISES, FORMULAS_CENTRAL, FORMULAS_DERIVADAS, FORMULAS_GERAL, FORMULAS_RESUMO, formulaTransformacao } from "@/lib/formulas";
import { ROTULOS, transformacoesValidas, type IdTransformacao, type TipoSerie } from "@/lib/transform";

const TIPOS: TipoSerie[] = ["Índice", "Var % mensal", "Taxa", "Fluxo", "Estoque", "Derivado"];
const FREQS = ["Mensal", "Trimestral", "Diária", "Trimestre móvel", "Anual"];

describe("toda conta mostrada tem fórmula (decisão 0015)", () => {
  it("toda transformação oferecida, exceto nível, tem fórmula", () => {
    for (const tipo of TIPOS) for (const freq of FREQS)
      for (const t of transformacoesValidas(tipo, freq)) {
        const f = formulaTransformacao(t, tipo, freq);
        if (t === "nivel") expect(f).toBeNull();
        else expect(f?.formula.length, `${t} ${tipo} ${freq}`).toBeGreaterThan(0);
      }
    for (const t of Object.keys(ROTULOS) as IdTransformacao[])
      if (t !== "nivel") expect(formulaTransformacao(t, "Índice", "Mensal")).not.toBeNull();
  });

  it("toda série derivada do pipeline e das abas tem fórmula", () => {
    const run = readFileSync(join(__dirname, "../../pipeline/argus_pipeline/derive/run.py"), "utf-8");
    const doPipeline = [...run.matchAll(/^\s+"(BR-\d+)": /gm)].map((m) => m[1]);
    expect(doPipeline.length).toBeGreaterThanOrEqual(6);
    const dasAbas = (gerado as { abas: { paineis: { series: { dado: string; serie: string }[] }[] }[] }).abas
      .flatMap((a) => a.paineis.flatMap((p) => p.series)).filter((s) => s.dado.endsWith(":derivado")).map((s) => s.serie);
    for (const id of new Set([...doPipeline, ...dasAbas])) expect(FORMULAS_DERIVADAS[id], id).toBeDefined();
  });

  it("fórmulas das análises, da Central e da trajetória completas", () => {
    for (const [id, f] of Object.entries({ ...FORMULAS_ANALISES, ...FORMULAS_CENTRAL, ...FORMULAS_RESUMO, ...FORMULAS_GERAL, fatos: FORMULA_FATOS, trajetoria: FORMULA_TRAJETORIA })) {
      expect(f.formula.length, id).toBeGreaterThan(0);
      expect(f.variaveis.length, id).toBeGreaterThan(0);
      expect(f.metodologia.length, id).toBeGreaterThan(0);
    }
  });

  it("acumulado depende do tipo: encadeia variação mensal, compara somas de índice", () => {
    expect(formulaTransformacao("acum12", "Var % mensal", "Mensal")!.formula[0]).toMatch(/\(1 \+ mₜ\/100\)/);
    expect(formulaTransformacao("acum12", "Índice", "Mensal")!.formula[0]).toMatch(/xₜ₋₁₂/);
    expect(formulaTransformacao("acum12", "Índice", "Trimestral")!.titulo).toMatch(/4 trimestres/);
  });
});

describe("análises citam a base científica (pedido do dono, 19/10/2026)", () => {
  it("toda análise tem fundamento e referências", () => {
    const analises = { ...FORMULAS_ANALISES, relogio: FORMULAS_GERAL.relogio, parecidos: FORMULAS_GERAL.parecidos,
      "BR-055": FORMULAS_DERIVADAS["BR-055"], "BR-117": FORMULAS_DERIVADAS["BR-117"], "BR-118": FORMULAS_DERIVADAS["BR-118"] };
    for (const [id, f] of Object.entries(analises)) {
      expect(f.fundamento?.length, id).toBeGreaterThan(0);
      expect(f.referencias?.length, id).toBeGreaterThan(0);
      for (const r of f.referencias!) expect(r, id).toMatch(/\(\d{4}\)/); // autor (ano). título...
    }
  });
});
