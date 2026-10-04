/**
 * Critério de pronto da Fase 2: cada transformação do site bate com o número oficial.
 * Dados reais exportados do banco (workflow "Exportar dados de conferência").
 * A comparação usa as casas decimais que a fonte publica. Regra: pelo menos 90% dos
 * pontos idênticos e nenhum a mais de 1 unidade da última casa. A diferença de 1 unidade
 * vem do arredondamento do insumo publicado (ex.: o IBGE calcula a taxa com o índice
 * sem arredondar; o IPCA 12m do BCB sai do número-índice, não das variações com 2 casas).
 * O PIB é o caso mais sensível: o índice sai com 2 casas (ex.: 193,81) e a taxa com 1.
 */
import { describe, expect, it } from "vitest";
import oficiais from "./fixtures/oficiais.json";
import { aplicar, type IdTransformacao, type Ponto, type TipoSerie } from "@/lib/transform";

type Chave = keyof typeof oficiais;
const serie = (k: Chave): Ponto[] => oficiais[k].obs.map(([data, valor]) => ({ data: data as string, valor: valor as number }));

function conferir(
  base: Chave, id: IdTransformacao, tipo: TipoSerie, freq: string, oficial: Chave, casas: number,
) {
  const nosso = new Map(aplicar(id, serie(base), tipo, freq).map((p) => [p.data, p.valor]));
  const pares = serie(oficial).filter((p) => nosso.has(p.data));
  const divergentes = pares
    .map((p) => ({ data: p.data, oficial: p.valor, nosso: Number(nosso.get(p.data)!.toFixed(casas)) }))
    .filter((x) => Math.abs(x.nosso - x.oficial) > 1e-9);
  const unidade = 10 ** -casas;
  const foraDaTolerancia = divergentes.filter((x) => Math.abs(x.nosso - x.oficial) > unidade + 1e-9);
  return { pares: pares.length, divergentes, foraDaTolerancia, exatos: (pares.length - divergentes.length) / pares.length };
}

function aprovar(r: ReturnType<typeof conferir>) {
  expect(r.foraDaTolerancia).toEqual([]);
  expect(r.exatos).toBeGreaterThanOrEqual(0.9);
}

describe("transformações conferidas contra números oficiais", () => {
  it("IPCA mensal acumulado 12m (encadeado) = IPCA 12m do BCB (SGS 13522)", () => {
    const r = conferir("ipca_mensal", "acum12", "Var % mensal", "Mensal", "ipca_12m_oficial", 2);
    expect(r.pares).toBeGreaterThan(120);
    aprovar(r);
  });

  it("PIM índice sem ajuste → YoY = variação M/M-12 do IBGE (t8888 v11602)", () => {
    const r = conferir("pim_indice_nsa", "yoy", "Índice", "Mensal", "pim_yoy_oficial", 1);
    expect(r.pares).toBeGreaterThan(120);
    aprovar(r);
  });

  it("PIM índice sem ajuste → acumulado 12m = variação acumulada em 12 meses do IBGE (v11604)", () => {
    const r = conferir("pim_indice_nsa", "acum12", "Índice", "Mensal", "pim_12m_oficial", 1);
    expect(r.pares).toBeGreaterThan(110);
    aprovar(r);
  });

  it("PMC índice com ajuste → MoM = variação M/M-1 dessazonalizada do IBGE (t8880 v11708)", () => {
    const r = conferir("pmc_indice_sa", "mom", "Índice", "Mensal", "pmc_mom_sa_oficial", 1);
    expect(r.pares).toBeGreaterThan(120);
    aprovar(r);
  });

  it("PIB índice com ajuste → QoQ = taxa trimestre contra trimestre anterior do IBGE (t5932 v6564)", () => {
    const r = conferir("pib_indice_sa", "qoq", "Índice", "Trimestral", "pib_qoq_oficial", 1);
    expect(r.pares).toBeGreaterThan(40);
    aprovar(r);
  });

  it("Selic meta → Δ p.p. confere com as decisões do Copom (comunicados 279ª a 281ª)", () => {
    // 279ª (17/06/2026): 14,25%; 280ª (05/08): 14,00%; 281ª (16/09): 13,75%
    const d1 = new Map(aplicar("dpp1", serie("selic_meta"), "Taxa", "Diária").map((p) => [p.data, p.valor]));
    const d3 = new Map(aplicar("dpp3", serie("selic_meta"), "Taxa", "Diária").map((p) => [p.data, p.valor]));
    expect(d1.get("2026-09-30")).toBeCloseTo(-0.25, 10);
    expect(d3.get("2026-09-30")).toBeCloseTo(-0.5, 10);
    expect(d1.get("2026-08-31")).toBeCloseTo(-0.25, 10);
  });
});
