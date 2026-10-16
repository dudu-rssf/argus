/**
 * Geral da aba Setor Externo: conta corrente contra a média, financiamento pelo
 * investimento direto, balança comercial, exportações por destino, câmbio e commodities.
 */
import { calcularFatos, frase } from "../../fatos";
import { fmtData, fmtNumero } from "../../formato";
import type { Ponto } from "../../transform";
import type { Fase } from "../relogio";
import { relogio } from "../relogio";
import {
  decompor, deltaK, formulaParecidos, formulaRelogio, mediaAnos, mediaMovelAnos, mensalizar, parecidos, semDados, sinal,
  somaN, ultimos, variacaoK, type Forca, type GeralAba, type Pergunta,
} from "../motor";

const S = {
  tcPib: "BR-082:23079", tc: "BR-081:22701", idp: "BR-083:22885",
  exp: "BR-079:fluxo=export", imp: "BR-079:fluxo=import",
  china: "BR-080:fluxo=export/pais=160", eua: "BR-080:fluxo=export/pais=249", ue: "BR-080:fluxo=export/bloco=22",
  reservas: "BR-084:13621", dolar: "BR-085:1", real: "BR-086:11752",
  minerio: "BR-089:PIORECRUSDM", brent: "BR-089:DCOILBRENTEU", soja: "BR-089:PSOYBUSDM",
  selic: "BR-050:432",
};
const focusCambio = (ano: number) => `BR-088:ExpectativasMercadoAnuais · Indicador='Câmbio'@${ano}`;
export const idsExterno = (ano: number) => [...Object.values(S), focusCambio(ano), focusCambio(ano + 1)];

const NOMES: Record<Fase, string> = { aquecendo: "Forte, melhorando", esfriando: "Forte, piorando", fria: "Fraco, piorando", reaquecendo: "Fraco, melhorando" };
const DESCR: Record<Fase, string> = {
  aquecendo: "saldo externo melhor que a média e melhorando", esfriando: "saldo melhor que a média, mas piorando",
  fria: "saldo pior que a média e piorando", reaquecendo: "saldo pior que a média, mas melhorando",
};
const bi = (s: Ponto[], div = 1e9) => s.map((p) => ({ data: p.data, valor: p.valor / div }));

export function geralExterno(dados: Record<string, Ponto[]>, hoje: string): GeralAba {
  const s = (k: keyof typeof S) => dados[S[k]] ?? [];
  const ano = Number(hoje.slice(0, 4));
  const tcPib = s("tcPib"), mediaTc = mediaMovelAnos(tcPib, 10), m10 = mediaAnos(tcPib, 10);
  const perguntas: Pergunta[] = [];
  const u = tcPib.at(-1);

  perguntas.push(u && m10 !== null ? {
    id: "conta", pergunta: "O déficit em conta corrente está menor que a média de 10 anos?", resposta: u.valor > m10 ? "Sim" : "Não",
    evidencia: `Transações correntes em 12 meses: ${fmtNumero(u.valor)}% do PIB (${fmtData(u.data)}), contra média de ${fmtNumero(m10)}% em 10 anos.`,
    explica: "Saldo de transações correntes (balança comercial, serviços e rendas) em 12 meses, % do PIB (SGS 23079). Negativo = déficit.",
    verMais: { secoes: [
      { titulo: "O que é", paragrafos: [
        "A conta corrente soma tudo o que o país recebe e paga ao exterior de forma corrente: comércio de bens, serviços (fretes, viagens, tecnologia) e rendas (juros e lucros remetidos). O Brasil costuma ter déficit, porque remete muitos lucros e juros.",
        "Déficit maior significa que o país depende mais de dinheiro de fora. Se esse dinheiro secar, o ajuste vem pelo câmbio.",
      ] },
      { titulo: "Gráfico", graficos: [{ titulo: "Transações correntes em 12 meses (% do PIB)", pontos: ultimos(tcPib, 60), referencia: m10, rotuloReferencia: "média de 10 anos", destaque: true }] },
    ] },
  } : semDados("conta", "O déficit em conta corrente está menor que a média de 10 anos?"));

  const tc12 = somaN(s("tc"), 12), idp12 = somaN(s("idp"), 12), ut = tc12.at(-1), ui = idp12.at(-1);
  perguntas.push(ut && ui ? {
    id: "idp", pergunta: "O investimento direto cobre o déficit externo?", resposta: ui.valor >= -ut.valor ? "Sim" : "Não",
    evidencia: `Em 12 meses até ${fmtData(ut.data)}: investimento direto no país de US$ ${fmtNumero(ui.valor / 1000, 1)} bi contra ${ut.valor < 0 ? `déficit em conta corrente de US$ ${fmtNumero(-ut.valor / 1000, 1)} bi` : `superávit de US$ ${fmtNumero(ut.valor / 1000, 1)} bi`}.`,
    explica: "Investimento direto no país (SGS 22885) e transações correntes (SGS 22701), somados em 12 meses, US$.",
    verMais: { secoes: [
      { titulo: "Por que importa", paragrafos: [
        "Investimento direto é dinheiro de empresas estrangeiras que compram ou abrem negócios aqui: é de longo prazo e não sai de uma hora para outra. Quando ele cobre o déficit em conta corrente, o país não depende de capital especulativo para fechar as contas.",
      ] },
      { titulo: "Gráficos (12 meses, US$ bi)", graficos: [
        { titulo: "Investimento direto no país", pontos: ultimos(bi(idp12, 1000), 48), unidade: "", casas: 1, destaque: true },
        { titulo: "Transações correntes", pontos: ultimos(bi(tc12, 1000), 48), unidade: "", casas: 1, referencia: 0 },
      ] },
    ] },
  } : semDados("idp", "O investimento direto cobre o déficit externo?"));

  const exp12 = somaN(s("exp"), 12), imp12 = somaN(s("imp"), 12);
  const im = new Map(imp12.map((p) => [p.data, p.valor]));
  const saldo12 = exp12.flatMap((p) => (im.has(p.data) ? [{ data: p.data, valor: (p.valor - im.get(p.data)!) / 1e9 }] : []));
  const us = saldo12.at(-1);
  perguntas.push(us ? {
    id: "balanca", pergunta: "A balança comercial tem superávit em 12 meses?", resposta: us.valor > 0 ? "Sim" : "Não",
    evidencia: `Exportações menos importações em 12 meses: US$ ${fmtNumero(us.valor, 1)} bi até ${fmtData(us.data)}${deltaK(saldo12, 12) ? `, ${sinal(deltaK(saldo12, 12)!.d, 1)} bi contra um ano antes` : ""}.`,
    explica: "Exportações e importações de bens (Comex Stat, Ministério do Desenvolvimento), somadas em 12 meses.",
    verMais: { secoes: [
      { titulo: "Como ler", paragrafos: ["O Brasil tem superávit comercial grande puxado por commodities (soja, petróleo, minério). O saldo sobe quando os preços dessas commodities sobem ou a demanda interna enfraquece (menos importação)."] },
      { titulo: "Gráficos (12 meses, US$ bi)", graficos: [
        { titulo: "Saldo comercial", pontos: ultimos(saldo12, 48), unidade: "", casas: 1, destaque: true },
        { titulo: "Exportações", pontos: ultimos(bi(exp12), 48), unidade: "", casas: 0 },
        { titulo: "Importações", pontos: ultimos(bi(imp12), 48), unidade: "", casas: 0 },
      ] },
    ] },
  } : semDados("balanca", "A balança comercial tem superávit em 12 meses?"));

  const expA = variacaoK(exp12, 12), ue = expA.at(-1);
  perguntas.push(ue ? {
    id: "exportacoes", pergunta: "As exportações estão crescendo?", resposta: ue.valor > 0 ? "Sim" : "Não",
    evidencia: `Exportações de US$ ${fmtNumero(exp12.at(-1)!.valor / 1e9, 0)} bi em 12 meses, ${sinal(ue.valor, 1)}% contra os 12 meses anteriores.`,
    explica: "Valor exportado em dólares (preço × quantidade), somado em 12 meses (Comex Stat).",
    verMais: { secoes: [
      { titulo: "Como ler", paragrafos: ["Como o valor em dólar mistura preço e quantidade, as exportações brasileiras sobem e descem muito com os preços de soja, petróleo e minério de ferro. O quadro de forças mostra esses preços."] },
      { titulo: "Gráficos", graficos: [
        { titulo: "Exportações, 12 meses contra os 12 anteriores", pontos: ultimos(expA, 48), casas: 1, destaque: true },
        { titulo: "Importações, 12 meses contra os 12 anteriores", pontos: ultimos(variacaoK(imp12, 12), 48), casas: 1 },
      ] },
    ] },
  } : semDados("exportacoes", "As exportações estão crescendo?"));

  const real = s("real"), mr = mediaAnos(real, 10), ur = real.at(-1);
  perguntas.push(ur && mr !== null ? {
    id: "cambio", pergunta: "O real está mais desvalorizado que a média de 10 anos?", resposta: ur.valor > mr ? "Sim" : "Não",
    evidencia: `Câmbio real efetivo em ${fmtNumero(ur.valor, 1)} (${fmtData(ur.data)}), contra média de ${fmtNumero(mr, 1)} em 10 anos; dólar a R$ ${fmtNumero(s("dolar").at(-1)?.valor ?? NaN)} hoje.`,
    explica: "Índice da taxa de câmbio real efetiva (SGS 11752, jun/1994 = 100): o real contra uma cesta de moedas de parceiros, descontadas as inflações. Mais alto = real mais desvalorizado.",
    verMais: { secoes: [
      { titulo: "O que é", paragrafos: [
        "O câmbio real efetivo compara o real com as moedas dos principais parceiros comerciais, já descontando a diferença de inflação. É a medida certa de competitividade: um real mais fraco que a média torna exportações mais baratas e importações mais caras.",
        "Real desvalorizado também pressiona a inflação de bens (o repasse cambial).",
      ] },
      { titulo: "Gráficos", graficos: [
        { titulo: "Câmbio real efetivo (alto = real fraco)", pontos: ultimos(real, 60), referencia: mr, rotuloReferencia: "média de 10 anos", unidade: "", casas: 1, destaque: true },
        { titulo: "Dólar (R$, fim do mês)", pontos: ultimos(mensalizar(s("dolar")), 60), unidade: "", casas: 2 },
      ] },
    ] },
  } : semDados("cambio", "O real está mais desvalorizado que a média de 10 anos?"));

  const res = mensalizar(s("reservas")), dr = deltaK(res, 12);
  perguntas.push(dr ? {
    id: "reservas", pergunta: "As reservas internacionais subiram em 12 meses?", resposta: dr.d > 0 ? "Sim" : "Não",
    evidencia: `Reservas de US$ ${fmtNumero(dr.atual.valor / 1000, 0)} bi, ${sinal(dr.d / 1000, 0)} bi contra 12 meses antes.`,
    explica: "Reservas internacionais do Banco Central, conceito liquidez (SGS 13621).",
    verMais: { secoes: [
      { titulo: "Por que importa", paragrafos: ["As reservas são o colchão em dólar do país: permitem ao Banco Central vender dólares em momentos de estresse e reduzem o risco percebido. Variam com intervenções do BC, rendimentos e a cotação de outras moedas e do ouro."] },
      { titulo: "Gráfico", graficos: [{ titulo: "Reservas (US$ bi)", pontos: ultimos(bi(res, 1000), 60), unidade: "", casas: 0, destaque: true }] },
    ] },
  } : semDados("reservas", "As reservas internacionais subiram em 12 meses?"));

  // ---------------------------------------------------------------- exportações por destino
  const mc = new Map(somaN(s("china"), 12).map((p) => [p.data, p.valor])), meu = new Map(somaN(s("eua"), 12).map((p) => [p.data, p.valor])), mue = new Map(somaN(s("ue"), 12).map((p) => [p.data, p.valor]));
  const resto = exp12.flatMap((p) => (mc.has(p.data) && meu.has(p.data) && mue.has(p.data) ? [{ data: p.data, valor: (p.valor - mc.get(p.data)! - meu.get(p.data)! - mue.get(p.data)!) / 1e9 }] : []));
  const dec = decompor([
    { id: "china", nome: "China", serie: bi(somaN(s("china"), 12)) },
    { id: "eua", nome: "Estados Unidos", serie: bi(somaN(s("eua"), 12)) },
    { id: "ue", nome: "União Europeia", serie: bi(somaN(s("ue"), 12)) },
    { id: "resto", nome: "Resto do mundo", serie: resto },
  ]);

  const mensal = (k: keyof typeof S) => mensalizar(s(k));
  const forca = (id: string, nome: string, influencia: string, pontos: Ponto[], unidade: string, racional: string): Forca => {
    const d = deltaK(pontos, 3);
    return { id, nome, influencia, valor: pontos.at(-1)?.valor ?? null, unidade, d3: d?.d ?? null, rotuloD3: "em 3 meses", serie: ultimos(pontos, 36), racional };
  };

  const fatos = calcularFatos(tcPib, { emPontos: true, frequencia: "Mensal" });
  const r = relogio(tcPib, mediaTc, { mesesDirecao: 6, rastroMeses: 24 });
  return {
    frase: fatos ? frase("Transações correntes em 12 meses (% do PIB)", fatos, { unidade: "%", frequencia: "Mensal" }) : null,
    relogio: r ? { relogio: r, rotulo: "Conta corrente", referencia: "média de 10 anos", unidade: "%", mesesDirecao: 6, nomes: NOMES, descricoes: DESCR,
      explica: "Cruza duas perguntas: o saldo em conta corrente está melhor ou pior que a média de 10 anos (horizontal) e está melhorando ou piorando em 6 meses (vertical). À direita, déficit menor que o habitual.",
      formula: formulaRelogio("transações correntes em 12 meses, % do PIB (SGS 23079)", "média dos 10 anos anteriores", NOMES) } : null,
    perguntas,
    decomposicao: dec.data ? {
      titulo: "Para onde vendemos: o que mudou nas exportações", rotuloTotal: "Mudança nas exportações em 12 meses (US$ bi)", unidade: "US$ bi", data: dec.data, porPrazo: dec.porPrazo, aditiva: true,
      rotuloAtual: "Exportações em 12 meses (US$ bi)", setas: { baixo: "← vendemos menos", cima: "vendemos mais →" },
      explica: "Quanto as exportações em 12 meses para cada destino mudaram no prazo escolhido. A soma é a mudança no total exportado.",
      formula: {
        titulo: "Exportações por destino",
        formula: ["Exportações em 12 meses = soma dos últimos 12 meses (US$ FOB)", "Resto do mundo = total − China − Estados Unidos − União Europeia", "Mudança = valor hoje − valor k meses antes"],
        variaveis: ["Comex Stat (Ministério do Desenvolvimento, Indústria, Comércio e Serviços): total, país 160 (China), 249 (EUA) e bloco 22 (UE)"],
        metodologia: ["Valores em dólar correntes: misturam preço e quantidade."],
      },
      porTras: {
        china: ["Soja, minério de ferro e petróleo: dependem do crescimento chinês, da safra brasileira e dos preços internacionais."],
        eua: ["Petróleo, aço, aviões, café e manufaturados: dependem da economia americana e de tarifas comerciais."],
        ue: ["Café, soja, celulose e minério: dependem da demanda europeia e de regras ambientais de importação."],
        resto: ["Argentina e América Latina (manufaturados, veículos), Oriente Médio e Ásia (carnes, açúcar)."],
      },
    } : null,
    forcas: {
      titulo: "Câmbio e commodities", legenda: "Último valor · mudança em 3 meses · últimos 3 anos",
      explica: "Os preços que mais mexem nas contas externas brasileiras.",
      racionalGeral: "Petróleo, minério de ferro e soja são os principais produtos exportados: seus preços em dólar movem as exportações e o saldo comercial. O câmbio muda a competitividade e o custo das importações.",
      formula: { titulo: "Câmbio e commodities", formula: ["Último valor do mês; mudança em 3 meses"], variaveis: ["Dólar (SGS 1), câmbio real efetivo (SGS 11752), Brent, minério e soja (FRED: DCOILBRENTEU, PIORECRUSDM, PSOYBUSDM)", "Focus câmbio fim de ano (BCB Olinda)"], metodologia: ["Preços em dólar, sem ajuste de inflação (exceto o câmbio real efetivo)."] },
      itens: [
        forca("dolar", "Dólar (R$)", "Câmbio", mensal("dolar"), "", "Cotação de venda, último dia do mês."),
        forca("real", "Câmbio real efetivo", "Competitividade", s("real"), "", "Índice: alto = real fraco."),
        forca("brent", "Petróleo Brent (US$/barril)", "Exportação de petróleo", mensal("brent"), "", "Preço internacional do petróleo."),
        forca("minerio", "Minério de ferro (US$/t)", "Exportação de minério", s("minerio"), "", "Preço internacional do minério de ferro."),
        forca("soja", "Soja (US$/t)", "Exportação agrícola", s("soja"), "", "Preço internacional da soja."),
        forca("focus", `Focus dólar fim de ${ano}`, "Expectativa", mensalizar(dados[focusCambio(ano)] ?? []), "", "Mediana das projeções para o dólar no fim do ano."),
      ],
    },
    parecidos: parecidos({
      tcPib: { pontos: tcPib, toleranciaDias: 40 },
      real: { pontos: real, toleranciaDias: 40 },
      exp: { pontos: expA, toleranciaDias: 40 },
      selic: { pontos: s("selic"), toleranciaDias: 10 },
    }, [
      { id: "tcPib", rotulo: "Conta corrente (% PIB)", curto: "conta corrente", unidade: "%" },
      { id: "real", rotulo: "Câmbio real efetivo", curto: "câmbio real", unidade: "" },
      { id: "exp", rotulo: "Exportações 12m (%)", curto: "exportações", unidade: "%" },
      { id: "selic", rotulo: "Selic", curto: "Selic", unidade: "%" },
    ], { id: "tcPib", rotulo: "Transações correntes (% do PIB)", unidade: "%" }, "1999-01", hoje),
    formulaParecidos: formulaParecidos("Transações correntes em 12 meses (% do PIB, SGS 23079), câmbio real efetivo (SGS 11752), crescimento das exportações em 12 meses (Comex Stat) e Selic (SGS 432)"),
  };
}

