import { describe, expect, it } from "vitest";
import { GRUPOS_IPCA, geralInflacao, SERIES_GERAL_INFLACAO as S } from "@/lib/geral/inflacao";
import oficiais from "./fixtures/oficiais.json";

type Chave = keyof typeof oficiais;
const p = (k: Chave) => oficiais[k].obs.map(([data, valor]) => ({ data: data as string, valor: valor as number }));

export function dadosReais() {
  const d: Record<string, { data: string; valor: number }[]> = {
    [S.ipca12]: p("ipca_12m_todo"), [S.ipcaMes]: p("ipca_mensal_todo"), [S.meta]: p("meta_inflacao_todo"),
    [S.nucleos]: p("nucleos_media_mensal"), [S.servicos]: p("servicos_mensal"), [S.servsub]: p("servicos_subjacentes_mensal"),
    [S.difusao]: p("difusao"), [S.focus12]: p("focus_12m_todo"), [S.selic]: p("selic_meta_todo"),
    [S.ex0]: p("nucleo_ex0_mensal"), [S.ex3]: p("nucleo_ex3_mensal"), [S.ms]: p("nucleo_ms_mensal"), [S.dp]: p("nucleo_dp_mensal"), [S.p55]: p("nucleo_p55_mensal"),
  };
  for (const g of GRUPOS_IPCA) {
    d[S[`var${g.id}`]] = p(`ipca_grupo_${g.id}_var` as Chave);
    d[S[`peso${g.id}`]] = p(`ipca_grupo_${g.id}_peso` as Chave);
  }
  return d;
}

describe("Geral da Inflação com dados reais (retrato de 15/10/2026)", () => {
  const g = geralInflacao(dadosReais(), "2026-10-15");

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
    console.log("cabo:", g.cabo.data, g.cabo.itens.map((i) => `${i.nome} ${i.atual.toFixed(2)} (Δ3m ${i.delta.toFixed(2)})`).join(" | "));
    console.log("soma", g.cabo.total.toFixed(3), "oficial", g.cabo.oficial?.valor);
    expect(g.cabo.itens).toHaveLength(9);
    expect(Math.abs(g.cabo.total - g.cabo.oficial!.valor)).toBeLessThan(0.2); // aproximação aditiva vs encadeado
  });

  it("5 períodos parecidos, com o antes e o depois", () => {
    console.log("hoje:", g.parecidos.atual?.mes, JSON.stringify(g.parecidos.atual?.valores));
    for (const x of g.parecidos.lista) console.log(x.mes, `${x.semelhanca}%`, "ipca", x.entao.ipca12, "→", x.depois.ipca12, "selic", x.entao.selic, "→", x.depois.selic);
    console.log("caiu", g.parecidos.caiu, "subiu", g.parecidos.subiu, "mediana", g.parecidos.medianaIpca);
    expect(g.parecidos.lista).toHaveLength(5);
  });
});
