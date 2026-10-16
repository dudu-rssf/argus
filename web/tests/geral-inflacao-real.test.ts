import { describe, expect, it } from "vitest";
import ipca from "@/lib/gerado/ipca.json";
import type { Classificacao } from "@/lib/geral/composicao";
import { focusAno, GRUPOS_IPCA, geralInflacao, PRAZOS, SERIES_GERAL_INFLACAO as S } from "@/lib/geral/inflacao";
import { subitensReais } from "./composicao-real.test";
import oficiais from "./fixtures/oficiais.json";

type Chave = keyof typeof oficiais;
const p = (k: Chave) => oficiais[k].obs.map(([data, valor]) => ({ data: data as string, valor: valor as number }));

export function dadosReais() {
  const d: Record<string, { data: string; valor: number }[]> = {
    [S.ipca12]: p("ipca_12m_todo"), [S.ipcaMes]: p("ipca_mensal_todo"), [S.meta]: p("meta_inflacao_todo"),
    [S.nucleos]: p("nucleos_media_mensal"), [S.servicos]: p("servicos_mensal"), [S.servsub]: p("servicos_subjacentes_mensal"),
    [S.difusao]: p("difusao"), [S.focus12]: p("focus_12m_todo"), [S.selic]: p("selic_meta_todo"),
    [S.ex0]: p("nucleo_ex0_mensal"), [S.ex3]: p("nucleo_ex3_mensal"), [S.ms]: p("nucleo_ms_mensal"), [S.dp]: p("nucleo_dp_mensal"), [S.p55]: p("nucleo_p55_mensal"),
    [S.industriais]: p("industriais_mensal"), [S.alimentacao]: p("alimentos_mensal"), [S.monitorados]: p("monitorados_mensal"),
    [S.comerc]: p("comercializaveis_mensal"), [S.naoComerc]: p("nao_comercializaveis_mensal"), [S.duraveis]: p("duraveis_mensal"),
    [focusAno(2027)]: p("focus_ipca_2027"),
    ...subitensReais(),
  };
  for (const g of GRUPOS_IPCA) {
    d[S[`var${g.id}`]] = p(`ipca_grupo_${g.id}_var` as Chave);
    d[S[`peso${g.id}`]] = p(`ipca_grupo_${g.id}_peso` as Chave);
  }
  return d;
}

describe("Geral da Inflação com dados reais (retrato de 15/10/2026)", () => {
  const g = geralInflacao(dadosReais(), "2026-10-15", { subitens: ipca.subitens, classificacao: ipca.classificacao as Classificacao });

  it("relógio", () => {
    const r = g.relogio!;
    console.log("relógio:", r.atual.data, r.atual.fase, `há ${r.mesesNaFase} meses`, `x=${r.atual.x.toFixed(2)} y=${r.atual.y.toFixed(2)}`);
    expect(r.atual.data).toBe("2026-09-01");
    expect(r.rastro).toHaveLength(25);
  });

  it("checklist com 6 perguntas e evidência", () => {
    for (const i of g.checklist) console.log(`${i.resposta.padEnd(8)} ${i.pergunta} — ${i.evidencia}`);
    expect(g.checklist).toHaveLength(6);
    expect(g.checklist[0]).toMatchObject({ resposta: "Sim" });
    expect(g.checklist.every((i) => i.resposta !== "Sem dados")).toBe(true);
  });

  it("cabo de guerra: soma das contribuições ≈ IPCA 12 meses oficial", () => {
    console.log("cabo:", g.cabo.data, g.cabo.porPrazo[3].itens.map((i) => `${i.nome} ${i.atual.toFixed(2)} (Δ3m ${i.delta.toFixed(2)})`).join(" | "));
    console.log("soma", g.cabo.total.toFixed(3), "oficial", g.cabo.oficial?.valor);
    expect(g.cabo.porPrazo[3].itens).toHaveLength(9);
    expect(Math.abs(g.cabo.total - g.cabo.oficial!.valor)).toBeLessThan(0.2); // aproximação aditiva vs encadeado
  });

  it("cabo por prazo (3, 6, 9, 12 meses) e subitens por trás de cada grupo", () => {
    for (const k of PRAZOS) {
      const c = g.cabo.porPrazo[k];
      console.log(`prazo ${k}: desde ${c.antes}`, c.itens.map((i) => `${i.nome} ${i.delta.toFixed(2)}`).join(" | "));
      expect(c.itens).toHaveLength(9);
    }
    for (const gr of GRUPOS_IPCA) {
      expect(g.cabo.movimentos[gr.id][3].length, gr.nome).toBeGreaterThan(0);
      expect(g.cabo.influencias[gr.id].length, gr.nome).toBeGreaterThan(0);
    }
    console.log("habitação 3m:", g.cabo.movimentos["7445"][3].map((m) => `${m.nome} ${m.delta.toFixed(3)}`).join(" | "));
  });

  it("áreas de influência: contribuições somam o IPCA 12 meses", () => {
    for (const a of g.areas.itens) console.log(`${a.nome}: 12m ${a.var12?.toFixed(2)}%, contrib ${a.contrib12?.toFixed(2)} p.p., peso ${a.peso?.toFixed(1)}%, Δ3m ${a.d3?.toFixed(2)}`);
    for (const a of g.areas.lentes) console.log(`lente ${a.nome}: 12m ${a.var12?.toFixed(2)}%`);
    expect(g.areas.itens).toHaveLength(4);
    const soma = g.areas.itens.reduce((t, a) => t + (a.contrib12 ?? 0), 0);
    const pesos = g.areas.itens.reduce((t, a) => t + (a.peso ?? 0), 0);
    expect(Math.abs(soma - g.cabo.total)).toBeLessThan(0.05);
    expect(pesos).toBeGreaterThan(99.9);
  });

  it("ver mais: núcleos, serviços por subgrupo, troca de meses e Focus por ano", () => {
    const v = g.verMais;
    expect(v.nucleos).toHaveLength(5);
    console.log("serviços:", v.servicos.composicao.map((c) => `${c.nome} ${c.contrib12.toFixed(2)}pp ${c.var12?.toFixed(1)}% peso ${c.peso.toFixed(0)}%`).join(" | "));
    expect(v.servicos.composicao.length).toBe(9);
    expect(Math.abs(v.servicos.composicao.reduce((t, c) => t + c.peso, 0) - 100)).toBeLessThan(0.01);
    console.log("troca:", v.aceleracao.troca.map((t) => `${t.entra.data} ${t.entra.valor} x ${t.sai?.valor}`).join(" | "), "saem:", v.aceleracao.saem.map((p) => p.data + " " + p.valor).join(", "));
    expect(v.aceleracao.troca).toHaveLength(6);
    console.log("focus anos:", JSON.stringify(v.expectativas.anos));
  });

  it("5 períodos parecidos, com o antes e o depois", () => {
    console.log("hoje:", g.parecidos.atual?.mes, JSON.stringify(g.parecidos.atual?.valores));
    for (const x of g.parecidos.lista) console.log(x.mes, `${x.semelhanca}%`, "ipca", x.entao.ipca12, "→", x.depois.ipca12, "selic", x.entao.selic, "→", x.depois.selic);
    console.log("caiu", g.parecidos.caiu, "subiu", g.parecidos.subiu, "mediana", g.parecidos.medianaIpca);
    expect(g.parecidos.lista).toHaveLength(5);
    for (const x of g.parecidos.lista) {
      console.log(x.mes, x.episodio?.titulo, "mais parecido em", x.proximidade[0].id, "| trajetória", x.trajetoria.length);
      expect(x.episodio).not.toBeNull();
      expect(x.trajetoria.length).toBeGreaterThan(20);
    }
    expect(g.parecidos.hoje.at(-1)?.t).toBe(0);
  });
});
