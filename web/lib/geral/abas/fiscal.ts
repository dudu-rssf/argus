/**
 * Geral da aba Fiscal: resultado primário, dívida, juros e o que mudou no déficit
 * nominal por esfera. As séries do BCB vêm como NFSP (necessidade de financiamento:
 * positivo = déficit); aqui o "resultado" troca o sinal (positivo = superávit).
 */
import { fmtData, fmtNumero } from "../../formato";
import type { Ponto } from "../../transform";
import type { Fase } from "../relogio";
import { relogio } from "../relogio";
import {
  decompor, deltaK, formulaParecidos, formulaRelogio, mediaAnos, mensalizar, mover, parecidos, semDados, sinal, somaN,
  ultimos, variacaoK, type Forca, type GeralAba, type Pergunta,
} from "../motor";

const S = {
  primario: "BR-069:5793", nominal: "BR-070:5727", juros: "BR-070:5760",
  federal: "BR-071:5783", estatais: "BR-071:5789",
  dbgg: "BR-072:13762", dlsp: "BR-073:4513",
  receita: "BR-074:rtn=10.01.2", despesa: "BR-074:rtn=10.03.1",
  selic: "BR-050:432",
};
const focus = (ind: string, ano: number) => `BR-077:ExpectativasMercadoAnuais · Indicador='${ind}'@${ano}`;
export const idsFiscal = (ano: number) => [...Object.values(S), focus("Resultado primário", ano), focus("Resultado primário", ano + 1), focus("Dívida líquida do setor público", ano), focus("Dívida líquida do setor público", ano + 1)];

const NOMES: Record<Fase, string> = { aquecendo: "Superávit, melhora", esfriando: "Superávit, piora", fria: "Déficit, piora", reaquecendo: "Déficit, melhora" };
const DESCR: Record<Fase, string> = {
  aquecendo: "superávit primário e melhorando", esfriando: "superávit primário, mas piorando",
  fria: "déficit primário e piorando", reaquecendo: "déficit primário, mas melhorando",
};
const neg = (s: Ponto[]) => s.map((p) => ({ data: p.data, valor: -p.valor }));
const resultado = (v: number) => (v >= 0 ? `superávit de ${fmtNumero(v)}%` : `déficit de ${fmtNumero(-v)}%`);

export function geralFiscal(dados: Record<string, Ponto[]>, hoje: string): GeralAba {
  const s = (k: keyof typeof S) => dados[S[k]] ?? [];
  const ano = Number(hoje.slice(0, 4));
  const prim = neg(s("primario"));
  const perguntas: Pergunta[] = [];
  const up = prim.at(-1);

  perguntas.push(up ? {
    id: "superavit", pergunta: "O setor público tem superávit primário?", resposta: up.valor > 0 ? "Sim" : "Não",
    evidencia: `Resultado primário do setor público consolidado em 12 meses: ${resultado(up.valor)} do PIB (${fmtData(up.data)}).`,
    explica: "Resultado primário = receitas menos despesas, sem contar juros. Setor público consolidado (União, BC, estados, municípios e estatais), 12 meses, % do PIB (SGS 5793, sinal trocado).",
    verMais: { secoes: [
      { titulo: "O que é", paragrafos: [
        "O resultado primário é o que o governo arrecada menos o que gasta, sem contar os juros da dívida. Superávit primário significa que sobra dinheiro para pagar parte dos juros; déficit, que até as despesas do dia a dia precisam de dívida nova.",
        "É a medida que o governo controla mais diretamente e a que entra nas metas fiscais.",
      ] },
      { titulo: "Gráfico", graficos: [{ titulo: "Resultado primário em 12 meses (% do PIB)", pontos: ultimos(prim, 60), referencia: 0, rotuloReferencia: "equilíbrio", destaque: true }] },
    ] },
  } : semDados("superavit", "O setor público tem superávit primário?"));

  const d3 = deltaK(prim, 3), d6 = deltaK(prim, 6);
  perguntas.push(d3 && d6 ? {
    id: "melhorando", pergunta: "O resultado primário está melhorando?",
    resposta: d3.d > 0 && d6.d > 0 ? "Sim" : d3.d <= 0 && d6.d <= 0 ? "Não" : "Parcial",
    evidencia: `O resultado em 12 meses ${mover(d3.d)} em 3 meses e ${mover(d6.d)} em 6 meses (subir = melhorar).`,
    explica: "Sim = o resultado primário em 12 meses melhorou em 3 e em 6 meses; Não = em nenhum dos dois; Parcial = os prazos discordam.",
    verMais: { secoes: [
      { titulo: "Como ler", paragrafos: ["Receitas extraordinárias (concessões, dividendos de estatais) e gastos fora do padrão (precatórios, calamidades) mexem muito no resultado de 12 meses. Vale olhar o primário por esfera no quadro abaixo e a receita e despesa do Governo Central."] },
      { titulo: "Gráficos", graficos: [
        { titulo: "Resultado primário em 12 meses (% do PIB)", pontos: ultimos(prim, 36), referencia: 0, destaque: true },
        { titulo: "Governo Federal e BC (% do PIB)", pontos: ultimos(neg(s("federal")), 36), referencia: 0 },
      ] },
    ] },
  } : semDados("melhorando", "O resultado primário está melhorando?"));

  const dbgg = s("dbgg"), dd = deltaK(dbgg, 12), mdb = mediaAnos(dbgg, 10);
  perguntas.push(dd ? {
    id: "divida", pergunta: "A dívida bruta está subindo?", resposta: dd.d > 0 ? "Sim" : "Não",
    evidencia: `Dívida bruta do governo geral em ${fmtNumero(dd.atual.valor, 1)}% do PIB (${fmtData(dd.atual.data)}), ${sinal(dd.d, 1)} p.p. em 12 meses${mdb !== null ? `; média de 10 anos: ${fmtNumero(mdb, 1)}%` : ""}.`,
    explica: "Dívida bruta do governo geral (DBGG, metodologia BCB, SGS 13762), % do PIB.",
    verMais: { secoes: [
      { titulo: "O que é", paragrafos: [
        "A dívida bruta soma tudo o que União, estados e municípios devem. É a medida mais usada para comparar países e a que as agências de risco olham.",
        "Ela sobe quando o governo tem déficit nominal (primário mais juros) e cai quando o PIB nominal cresce mais rápido que a dívida. Por isso juros altos fazem a dívida subir mesmo com o primário equilibrado.",
      ] },
      { titulo: "Gráficos (% do PIB)", graficos: [
        { titulo: "Dívida bruta (DBGG)", pontos: ultimos(dbgg, 60), referencia: mdb, rotuloReferencia: "média de 10 anos", casas: 1, destaque: true },
        { titulo: "Dívida líquida (DLSP)", pontos: ultimos(s("dlsp"), 60), casas: 1 },
      ] },
    ] },
  } : semDados("divida", "A dívida bruta está subindo?"));

  const juros = s("juros"), dj = deltaK(juros, 12);
  perguntas.push(dj ? {
    id: "juros", pergunta: "O gasto com juros da dívida está subindo?", resposta: dj.d > 0 ? "Sim" : "Não",
    evidencia: `Juros nominais de ${fmtNumero(dj.atual.valor)}% do PIB em 12 meses, ${sinal(dj.d)} p.p. contra um ano antes.`,
    explica: "Juros nominais apropriados pelo setor público consolidado em 12 meses, % do PIB (SGS 5760).",
    verMais: { secoes: [
      { titulo: "Como ler", paragrafos: ["O gasto com juros acompanha a Selic (boa parte da dívida é pós-fixada), a inflação (títulos atrelados ao IPCA) e o tamanho da dívida. É a maior parte do déficit nominal brasileiro."] },
      { titulo: "Gráficos", graficos: [
        { titulo: "Juros nominais em 12 meses (% do PIB)", pontos: ultimos(juros, 60), destaque: true },
        { titulo: "Meta Selic", pontos: ultimos(mensalizar(s("selic")), 60) },
      ] },
    ] },
  } : semDados("juros", "O gasto com juros da dívida está subindo?"));

  const rec12 = variacaoK(somaN(s("receita"), 12), 12), des12 = variacaoK(somaN(s("despesa"), 12), 12);
  const ur = rec12.at(-1), ud = des12.at(-1);
  perguntas.push(ur && ud ? {
    id: "despesa", pergunta: "A despesa do Governo Central cresce mais que a receita?", resposta: ud.valor > ur.valor ? "Sim" : "Não",
    evidencia: `Em 12 meses até ${fmtData(ud.data)}: despesa total ${sinal(ud.valor, 1)}% e receita líquida ${sinal(ur.valor, 1)}% contra os 12 meses anteriores (valores nominais).`,
    explica: "Resultado do Tesouro Nacional (RTN): receita líquida de transferências e despesa total do Governo Central, somadas em 12 meses.",
    verMais: { secoes: [
      { titulo: "Como ler", paragrafos: ["Quando a despesa cresce mais rápido que a receita por muito tempo, o resultado primário piora. Os números são nominais: com inflação de 4% a 5%, crescer 5% é ficar quase estável em termos reais."] },
      { titulo: "Gráficos (12 meses contra os 12 anteriores)", graficos: [
        { titulo: "Receita líquida", pontos: ultimos(rec12, 36), casas: 1, destaque: true },
        { titulo: "Despesa total", pontos: ultimos(des12, 36), casas: 1 },
      ] },
    ] },
  } : semDados("despesa", "A despesa do Governo Central cresce mais que a receita?"));

  const fp = dados[focus("Resultado primário", ano)] ?? [], fp1 = dados[focus("Resultado primário", ano + 1)] ?? [];
  const a = fp.at(-1), b = fp1.at(-1);
  perguntas.push(a && b ? {
    id: "focus", pergunta: `O mercado espera resultado melhor em ${ano + 1}?`, resposta: b.valor > a.valor ? "Sim" : "Não",
    evidencia: `Focus para o resultado primário: ${resultado(a.valor)} do PIB em ${ano} e ${resultado(b.valor)} em ${ano + 1}.`,
    explica: "Mediana das projeções do Focus para o resultado primário do setor público consolidado (positivo = superávit).",
    verMais: { secoes: [
      { titulo: "Como ler", paragrafos: ["A trajetória esperada do primário e da dívida líquida mostra se o mercado acredita em estabilização da dívida. Revisões para pior costumam vir junto com juros futuros mais altos e real mais fraco."] },
      { titulo: "Gráficos", graficos: [
        { titulo: `Focus, primário de ${ano + 1} (% do PIB)`, pontos: ultimos(mensalizar(fp1), 24), destaque: true },
        { titulo: `Focus, dívida líquida de ${ano + 1} (% do PIB)`, pontos: ultimos(mensalizar(dados[focus("Dívida líquida do setor público", ano + 1)] ?? []), 24), casas: 1 },
      ] },
    ] },
  } : semDados("focus", `O mercado espera resultado melhor em ${ano + 1}?`));

  // ---------------------------------------------------------------- o que mudou no déficit nominal (NFSP: + = déficit)
  const fed = s("federal"), est = s("estatais"), tot = s("primario");
  const mf = new Map(fed.map((p) => [p.data, p.valor])), me = new Map(est.map((p) => [p.data, p.valor]));
  const regionais = tot.flatMap((p) => (mf.has(p.data) && me.has(p.data) ? [{ data: p.data, valor: p.valor - mf.get(p.data)! - me.get(p.data)! }] : []));
  const dec = decompor([
    { id: "federal", nome: "Primário: Governo Federal e BC", serie: fed },
    { id: "regionais", nome: "Primário: estados e municípios", serie: regionais },
    { id: "estatais", nome: "Primário: estatais", serie: est },
    { id: "juros", nome: "Juros nominais", serie: juros },
  ]);

  const forca = (id: string, nome: string, influencia: string, pontos: Ponto[], racional: string): Forca => {
    const d = deltaK(pontos, 3);
    return { id, nome, influencia, valor: pontos.at(-1)?.valor ?? null, unidade: "%", d3: d?.d ?? null, rotuloD3: "em 3 meses", serie: ultimos(pontos, 36), racional };
  };

  const r = relogio(prim, () => 0, { mesesDirecao: 6, rastroMeses: 24 });
  return {
    frase: up ? `Setor público com ${resultado(up.valor)} do PIB em 12 meses${d3 ? `; resultado ${d3.d > 0 ? "melhorou" : d3.d < 0 ? "piorou" : "ficou estável"}${d3.d ? ` ${fmtNumero(Math.abs(d3.d))} p.p.` : ""} em 3 meses` : ""}${dd ? `; dívida bruta em ${fmtNumero(dd.atual.valor, 1)}% do PIB` : ""}.` : null,
    relogio: r ? { relogio: r, rotulo: "Primário 12m", referencia: "equilíbrio (zero)", unidade: "%", mesesDirecao: 6, nomes: NOMES, descricoes: DESCR,
      explica: "Cruza duas perguntas: o setor público tem superávit ou déficit primário em 12 meses (horizontal) e o resultado está melhorando ou piorando em 6 meses (vertical). À direita, superávit; para cima, melhora.",
      formula: formulaRelogio("resultado primário do setor público em 12 meses, % do PIB (SGS 5793 com sinal trocado)", "zero", NOMES) } : null,
    perguntas,
    decomposicao: dec.data ? {
      titulo: "O que mudou no déficit nominal", rotuloTotal: "Mudança no déficit nominal (12 meses, % do PIB)", unidade: "p.p.", data: dec.data, porPrazo: dec.porPrazo, aditiva: true,
      rotuloAtual: "Déficit hoje (% do PIB; negativo = superávit)", setas: { baixo: "← reduziu o déficit", cima: "aumentou o déficit →" },
      explica: "O déficit nominal (o quanto o setor público precisa se endividar) é o primário de cada esfera mais os juros. As barras mostram quanto cada parte mudou no prazo escolhido; a soma é a mudança do déficit nominal. Para a direita, o déficit aumentou.",
      formula: {
        titulo: "Decomposição do déficit nominal",
        formula: ["Déficit nominal = primário (Governo Federal e BC + estados e municípios + estatais) + juros nominais", "Estados e municípios = primário consolidado − Governo Federal e BC − estatais", "Mudança = valor em 12 meses hoje − valor k meses antes"],
        variaveis: ["NFSP em 12 meses, % do PIB: SGS 5727 (nominal), 5793 (primário), 5783 (Governo Federal e BC), 5789 (estatais), 5760 (juros)"],
        metodologia: ["Conceito NFSP do BCB, sem desvalorização cambial: positivo = déficit."],
      },
      porTras: {
        federal: ["Arrecadação federal (atividade, inflação, receitas extraordinárias), despesas obrigatórias (Previdência, pessoal) e regras fiscais."],
        regionais: ["ICMS e transferências da União; folha de pagamento e investimento de estados e municípios, que crescem em anos eleitorais."],
        estatais: ["Investimentos e resultado das estatais federais, estaduais e municipais (Petrobras e bancos públicos não entram)."],
        juros: ["Selic, inflação (títulos atrelados ao IPCA) e tamanho da dívida."],
      },
    } : null,
    forcas: {
      titulo: "Dívida, juros e receitas", legenda: "Último valor · mudança em 3 meses · últimos 3 anos",
      explica: "Os números que mostram para onde a dívida pública está indo.",
      racionalGeral: "A dívida sobe com déficit nominal (primário + juros) e cai, como fração do PIB, quando o PIB nominal cresce mais rápido. Receita e despesa explicam o primário; Selic e inflação explicam os juros.",
      formula: { titulo: "Dívida, juros e receitas", formula: ["% do PIB em 12 meses ou estoque em % do PIB; RTN: soma de 12 meses contra os 12 anteriores"], variaveis: ["SGS 13762, 4513, 5760; RTN do Tesouro Nacional"], metodologia: ["Valores do BCB e do Tesouro, sem ajustes."] },
      itens: [
        forca("dbgg", "Dívida bruta (% do PIB)", "Solvência", dbgg, "Tudo o que União, estados e municípios devem."),
        forca("dlsp", "Dívida líquida (% do PIB)", "Solvência", s("dlsp"), "Dívida menos ativos do governo (reservas, créditos)."),
        forca("juros", "Juros nominais (% do PIB, 12m)", "Selic e inflação", juros, "Custo da dívida em 12 meses."),
        forca("receita", "Receita líquida do Governo Central", "Arrecadação", rec12, "Crescimento nominal em 12 meses."),
        forca("despesa", "Despesa do Governo Central", "Gastos", des12, "Crescimento nominal em 12 meses."),
      ],
    },
    parecidos: parecidos({
      primario: { pontos: prim, toleranciaDias: 40 },
      juros: { pontos: juros, toleranciaDias: 40 },
      dbgg: { pontos: dbgg, toleranciaDias: 40 },
      selic: { pontos: s("selic"), toleranciaDias: 10 },
    }, [
      { id: "primario", rotulo: "Primário 12m (% PIB)", curto: "primário", unidade: "%" },
      { id: "juros", rotulo: "Juros 12m (% PIB)", curto: "juros", unidade: "%" },
      { id: "dbgg", rotulo: "Dívida bruta (% PIB)", curto: "dívida bruta", unidade: "%" },
      { id: "selic", rotulo: "Selic", curto: "Selic", unidade: "%" },
    ], { id: "dbgg", rotulo: "Dívida bruta (% do PIB)", unidade: "%" }, "2006-12", hoje),
    formulaParecidos: formulaParecidos("Resultado primário e juros em 12 meses (% do PIB, SGS 5793 e 5760), dívida bruta (SGS 13762) e Selic (SGS 432)"),
  };
}
