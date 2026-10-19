/**
 * Auditoria das análises (aba Análises e postura monetária): recalcula de forma
 * independente, com os dados reais exportados do banco, e compara com o que o site mostra.
 * - Juro real ex-ante (BR-055), neutro implícito (BR-117) e postura (BR-118): Fisher à mão.
 * - Regra de Taylor: as 16 especificações à mão, com o hiato do statsmodels (referência externa).
 * - Ciclos da Selic: conferidos contra a história documentada das decisões do Copom.
 */
import { describe, expect, it } from "vitest";
import { analiseItem5, SERIES_CICLOS, SERIES_ITEM5 } from "@/lib/analises";
import { episodios } from "@/lib/ciclos";
import { ESPECIFICACOES } from "@/lib/taylor";
import abas from "./fixtures/abas.json";
import ref from "./fixtures/hiato_referencia.json";
import oficiais from "./fixtures/oficiais.json";

type Serie = [string, number][];
const A = abas as unknown as Record<string, Serie>;
const p = (k: keyof typeof oficiais) => (oficiais[k].obs as Serie).map(([data, valor]) => ({ data, valor }));
const fisher = (n: number, i: number) => ((1 + n / 100) / (1 + i / 100) - 1) * 100;
/** último valor da série até a data (inclusive) */
const ate = (s: Serie, d: string) => { let v: number | null = null; for (const [x, y] of s) { if (x <= d) v = y; else break; } return v; };

describe("juro real, neutro e postura (Fisher recalculado à mão)", () => {
  const selic = A["BR-050:432"], focus = A["BR-047:ExpectativasMercadoInflacao12Meses · Indicador='IPCA'"];
  const jr = A["BR-055:derivado"], neutro = A["BR-117:derivado"], postura = A["BR-118:derivado"];

  it("BR-055 = Fisher(Selic vigente, Focus 12m) em todas as datas", () => {
    const f = new Map(focus);
    let n = 0;
    for (const [d, v] of jr) {
      const s = ate(selic, d), i = f.get(d);
      if (s === null || i === undefined) continue;
      expect(Math.abs(v - fisher(s, i)), d).toBeLessThan(1e-9);
      n++;
    }
    expect(n).toBeGreaterThan(5000);
  });

  it("BR-117 = Fisher(Focus Selic fim de t+3, Focus IPCA de t+3) — conferido em 2024 (ano t+3 = 2027)", () => {
    const sel = new Map(A["BR-132:ExpectativasMercadoAnuais · Indicador='Selic'@2027"]);
    const ipca = new Map((oficiais.focus_ipca_2027.obs as Serie));
    let n = 0;
    for (const [d, v] of neutro) {
      if (!d.startsWith("2024")) continue;
      const s = sel.get(d), i = ipca.get(d);
      if (s === undefined || i === undefined) continue;
      expect(Math.abs(v - fisher(s, i)), d).toBeLessThan(1e-9);
      n++;
    }
    expect(n).toBeGreaterThan(40);
  });

  it("BR-118 = BR-055 − último BR-117 até a data", () => {
    const j = new Map(jr);
    for (const [d, v] of postura.slice(-300)) expect(Math.abs(v - (j.get(d)! - ate(neutro, d)!)), d).toBeLessThan(1e-9);
  });
});

describe("regra de Taylor recalculada à mão (hiato do statsmodels)", () => {
  const dados = {
    [SERIES_CICLOS.selic]: p("selic_meta_todo"), [SERIES_CICLOS.ipca12]: p("ipca_12m_todo"), [SERIES_CICLOS.focus12]: p("focus_12m_todo"),
    [SERIES_CICLOS.neutro]: p("neutro_focus_todo"), [SERIES_ITEM5.meta]: p("meta_inflacao_todo"),
    [SERIES_ITEM5.pibSA]: (ref.pib as Serie).map(([data, valor]) => ({ data, valor })),
  };
  const a = analiseItem5(dados, "2026-10-15");
  for (const mes of ["2016-06", "2022-03", "2026-06"]) it(mes, () => {
    const l = a.faixa.find((x) => x.mes === mes)!;
    const fim = new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0)).toISOString().slice(0, 10);
    const v = (k: keyof typeof oficiais) => ate(oficiais[k].obs as Serie, fim)!;
    const hp = ate(Object.entries(ref.hp) as Serie, fim)!, ham = ate(Object.entries(ref.hamilton) as Serie, fim)!;
    const meta = v("meta_inflacao_todo"), neutro = v("neutro_focus_todo");
    const esperado = ESPECIFICACOES.map((e) => {
      const pi = e.inflacao === "ipca12" ? v("ipca_12m_todo") : v("focus_12m_todo");
      const hiato = e.hiato === "hiatoHP" ? hp : ham;
      return neutro + pi + e.a * (pi - meta) + e.b * hiato; // Taylor (1993), com a e b variando
    });
    esperado.forEach((x, i) => expect(Math.abs(l.especificacoes[i]! - x), `${mes} esp ${i}`).toBeLessThan(1e-6));
    console.log(`${mes}: Selic ${l.selic} · regra ${l.minimo!.toFixed(2)}–${l.maximo!.toFixed(2)} (mediana ${l.mediana!.toFixed(2)})`);
  });
});

describe("ciclos da Selic contra a história documentada do Copom", () => {
  const eps = episodios(p("selic_meta_todo"), "2026-10-16").filter((e) => e.tipo !== "manutencao");
  const resumo = eps.map((e) => `${e.tipo} ${e.inicio.slice(0, 7)} ${e.selicInicial}→${e.selicFinal}`);
  it.each([
    ["alta 2002-10 18→26.5", "aperto da crise de confiança de 2002"],
    ["corte 2005-09 19.75→11.25", "ciclo de cortes de 2005-07"],
    ["corte 2016-10 14.25→6.5", "cortes de out/2016 a mar/2018"],
    ["corte 2019-08 6.5→2", "cortes até a mínima de 2%"],
    ["alta 2021-03 2→13.75", "aperto de 2021-22"],
    ["corte 2023-08 13.75→10.5", "cortes de 2023-24"],
    ["alta 2024-09 10.5→15", "aperto de 2024-25"],
  ])("%s (%s)", (esperado) => {
    expect(resumo).toContain(esperado);
  });
});
