import { describe, expect, it } from "vitest";
import { META, MEDIDAS_INFLACAO, medidas, quadrante, rastro } from "@/lib/prototipos";
import oficiais from "./fixtures/oficiais.json";

const p = (k: keyof typeof oficiais) => oficiais[k].obs.map(([data, valor]) => ({ data: data as string, valor: valor as number }));

describe("protótipos da Inflação com dados reais (retrato de 15/10/2026)", () => {
  const dados = {
    "BR-026:13522": p("ipca_12m_todo"), "BR-025:433": p("ipca_mensal_todo"),
    "BR-037:10844": p("servicos_mensal"), "BR-038:27863": p("industriais_mensal"), "BR-038:27864": p("alimentos_mensal"),
    "BR-035:11428": p("livres_mensal"), "BR-036:4449": p("monitorados_mensal"),
    "BR-127:derivado": p("nucleos_media_mensal"), "BR-128:derivado": p("nucleos_p50_mensal"),
    "BR-042:29683": p("servicos_subjacentes_mensal"), "BR-129:29684": p("industriais_subjacentes_mensal"),
    "BR-040:21379": p("difusao"), "BR-043:189": p("igpm_mensal"),
    "BR-047:ExpectativasMercadoInflacao12Meses · Indicador='IPCA'": p("focus_12m_todo"),
    "BR-046:ExpectativasMercadoAnuais · Indicador='IPCA'@2027": p("focus_ipca_2027"),
    [META]: p("meta_inflacao_todo"),
  };
  const ms = medidas(MEDIDAS_INFLACAO, dados, 2026);

  it("toda medida tem fatos e frase", () => {
    for (const m of ms) {
      console.log(`${m.id}: ${m.frase}`);
      expect(m.fatos, m.id).not.toBeNull();
      expect(m.frase, m.id).toMatch(/ em -?\d/);
    }
  });

  it("IPCA 12 meses: último dado oficial e meta do ano", () => {
    const ipca12 = ms.find((m) => m.id === "ipca12")!;
    expect(ipca12.fatos!.ultimo).toEqual({ data: "2026-09-01", valor: 4.58 });
    expect(ipca12.fatos!.meta).toBe(3);
  });

  it("percentil diz quantos anos de histórico existem (Focus 2027 só desde 2023)", () => {
    expect(ms.find((m) => m.id === "focusano1")!.frase).toMatch(/dos últimos [1-4] anos/);
  });

  it("mapa: rastro de até 7 pontos e quadrante do último", () => {
    const ipca12 = ms.find((m) => m.id === "ipca12")!;
    const r = rastro(ipca12, dados[META]);
    expect(r.length).toBeGreaterThanOrEqual(6);
    expect(r.at(-1)!.x).toBeCloseTo(1.58, 10);
    console.log("IPCA no mapa:", r.at(-1), quadrante(r.at(-1)!));
  });
});
