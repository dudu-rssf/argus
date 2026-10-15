import { describe, expect, it } from "vitest";
import { analiseItem5, SERIES_CICLOS, SERIES_ITEM5 } from "@/lib/analises";
import { ESPECIFICACOES, rotuloEspecificacao } from "@/lib/taylor";
import oficiais from "./fixtures/oficiais.json";

const p = (k: keyof typeof oficiais) => oficiais[k].obs.map(([data, valor]) => ({ data: data as string, valor: valor as number }));
const dados = {
  [SERIES_CICLOS.selic]: p("selic_meta_todo"),
  [SERIES_CICLOS.ipca12]: p("ipca_12m_todo"),
  [SERIES_CICLOS.focus12]: p("focus_12m_todo"),
  [SERIES_CICLOS.neutro]: p("neutro_focus_todo"),
  [SERIES_CICLOS.desocupacao]: p("desocupacao_todo"),
  [SERIES_ITEM5.meta]: p("meta_inflacao_todo"),
  [SERIES_ITEM5.pibSA]: p("pib_indice_sa_todo"),
};

describe("item 5 com os dados reais do banco", () => {
  const a = analiseItem5(dados, "2026-10-15");

  it("meta do CMN conforme a história oficial", () => {
    const meta = Object.fromEntries(p("meta_inflacao_todo").map((x) => [x.data.slice(0, 4), x.valor]));
    expect([meta["1999"], meta["2003"], meta["2005"], meta["2019"], meta["2024"], meta["2026"]]).toEqual([8, 4, 4.5, 4.25, 3, 3]);
  });

  it("faixa começa quando todos os insumos existem e vai até o mês atual", () => {
    expect(a.faixa[0].mes).toBe("2001-12"); // Focus 12m desde 12/12/2001
    expect(a.faixa.at(-1)!.mes).toBe("2026-10");
    const lacunas = a.faixa.filter((l) => l.mediana === null).map((l) => l.mes);
    console.log("meses sem faixa:", lacunas.join(", ") || "nenhum");
    for (const l of a.faixa.filter((x) => x.mediana !== null)) {
      expect(l.minimo!).toBeLessThanOrEqual(l.mediana!);
      expect(l.mediana!).toBeLessThanOrEqual(l.maximo!);
    }
  });

  it("hoje: números plausíveis e explicáveis", () => {
    const hoje = [...a.faixa].reverse().find((l) => l.mediana !== null)!;
    const h = a.hiatos.at(-1)!;
    console.log(`hiato ${h.data}: HP ${h.hp?.toFixed(2)} TR ${h.hpTempoReal?.toFixed(2)} Hamilton ${h.hamilton?.toFixed(2)}`);
    console.log(`${hoje.mes}: Selic ${hoje.selic} · regra ${hoje.minimo!.toFixed(2)}–${hoje.maximo!.toFixed(2)} (mediana ${hoje.mediana!.toFixed(2)}) · hiato de ${hoje.hiatoDe}`);
    ESPECIFICACOES.forEach((e, i) => console.log(`  ${rotuloEspecificacao(e)}: ${hoje.especificacoes[i]!.toFixed(2)}`));
    expect(hoje.mes).toBe("2026-10");
    expect(hoje.hiatoDe).toBe("2026-04-01");
    expect(hoje.mediana!).toBeGreaterThan(5);
    expect(hoje.mediana!).toBeLessThan(20);
  });

  it("dispersões", () => {
    console.log(`Phillips desocupação: ${a.phillipsDesocupacao.length} meses (${a.phillipsDesocupacao[0].data} a ${a.phillipsDesocupacao.at(-1)!.data})`);
    console.log(`Phillips hiato: ${a.phillipsHiato.length} trimestres (${a.phillipsHiato[0].data} a ${a.phillipsHiato.at(-1)!.data})`);
    expect(a.phillipsDesocupacao.length).toBeGreaterThan(150);
    expect(a.phillipsHiato[0].data).toBe("1999-01-01");
  });

  it("2015-16 (recessão): regra abaixo do pico e hiato muito negativo", () => {
    const t = a.hiatos.find((l) => l.data === "2016-10-01")!;
    expect(t.hp!).toBeLessThan(-2);
    expect(t.hamilton!).toBeLessThan(-4);
  });
});
