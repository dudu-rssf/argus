/**
 * Geral da aba Política Monetária: postura (juro real × neutro implícito), decisões do
 * Copom, o que o mercado espera, o que mexeu no juro real e o crédito.
 */
import { decisoes, valorAte } from "../../ciclos";
import reunioesGeradas from "../../gerado/reunioes.json";
import { calcularFatos, frase } from "../../fatos";
import { fmtData, fmtNumero } from "../../formato";
import type { Ponto } from "../../transform";
import type { Fase } from "../relogio";
import { relogio } from "../relogio";
import {
  deltaDias, deltaK, formulaParecidos, formulaRelogio, mensalizar, mesAbs, mover, parecidos, PRAZOS, semDados, sinal,
  somaN, ultimos, variacaoK, type Decomposicao, type Forca, type GeralAba, type Pergunta,
} from "../motor";

const S = {
  selic: "BR-050:432",
  juroReal: "BR-055:derivado",
  neutro: "BR-117:derivado",
  postura: "BR-118:derivado",
  focus12: "BR-047:ExpectativasMercadoInflacao12Meses · Indicador='IPCA'",
  ipca12: "BR-026:13522",
  credito: "BR-062:20539", creditoPF: "BR-062:20541", creditoPJ: "BR-062:20540",
  concessoes: "BR-064:20631",
  taxa: "BR-065:20714", spread: "BR-066:20783",
};
const focusSelic = (ano: number) => `BR-132:ExpectativasMercadoAnuais · Indicador='Selic'@${ano}`;
const focusReuniao = (r: string) => `BR-056:ExpectativasMercadoSelic@${r}`;
/** Reuniões do Copom de um ano, na ordem: R1/ano, R2/ano... com a data da decisão. */
export function reunioesCopom(ano: number): { reuniao: string; data: string }[] {
  return REUNIOES.copom.filter((r) => r.data.startsWith(String(ano))).map((r, i) => ({ reuniao: `R${i + 1}/${ano}`, data: r.data }));
}
export const idsMonetaria = (ano: number) => [...Object.values(S), focusSelic(ano), focusSelic(ano + 1), focusSelic(ano + 2),
  ...[ano, ano + 1].flatMap((a) => reunioesCopom(a).map((r) => focusReuniao(r.reuniao)))];

/** Selic esperada pelo Focus em cada reunião futura (última pesquisa), contra a Selic de hoje. */
export function curvaReunioes(dados: Record<string, Ponto[]>, hoje: string, selicHoje: number | null) {
  if (selicHoje === null) return null;
  const ano = Number(hoje.slice(0, 4));
  const futuras = [ano, ano + 1].flatMap(reunioesCopom).filter((r) => r.data >= hoje);
  let anterior = selicHoje, pesquisa = "";
  const itens = futuras.flatMap((r) => {
    const s = dados[focusReuniao(r.reuniao)] ?? [];
    const u = s.at(-1);
    if (!u) return [];
    pesquisa = u.data > pesquisa ? u.data : pesquisa;
    const a4 = valorAte(s, new Date(Date.parse(u.data) - 28 * 86_400_000).toISOString().slice(0, 10), 10);
    const item = { reuniao: r.reuniao, data: r.data, mediana: u.valor, mudanca: u.valor - anterior, antes4: a4 && a4.data < u.data ? a4.valor : null };
    anterior = u.valor;
    return [item];
  });
  return itens.length ? { pesquisa, selicHoje, itens } : null;
}

const REUNIOES = reunioesGeradas as { copom: { data: string }[] };

const NOMES: Record<Fase, string> = { aquecendo: "Apertando", esfriando: "Afrouxando", fria: "Estimulando", reaquecendo: "Tirando estímulo" };
const DESCR: Record<Fase, string> = {
  aquecendo: "juro real acima do neutro e subindo", esfriando: "juro real acima do neutro, mas caindo",
  fria: "juro real abaixo do neutro e caindo", reaquecendo: "juro real abaixo do neutro, mas subindo",
};
const bps = (v: number) => `${Math.round(Math.abs(v) * 100)} bps`;

export function geralMonetaria(dados: Record<string, Ponto[]>, hoje: string): GeralAba {
  const s = (k: keyof typeof S) => dados[S[k]] ?? [];
  const ano = Number(hoje.slice(0, 4));
  const postura = mensalizar(s("postura")), jr = mensalizar(s("juroReal"));
  const perguntas: Pergunta[] = [];

  const up = s("postura").at(-1), ujr = s("juroReal").at(-1), un = s("neutro").at(-1);
  perguntas.push(up && ujr && un ? {
    id: "restritiva", pergunta: "A política monetária está restritiva?", resposta: up.valor > 0 ? "Sim" : "Não",
    evidencia: `Juro real ex-ante de ${fmtNumero(ujr.valor)}% contra neutro implícito no Focus de ${fmtNumero(un.valor)}%: ${sinal(up.valor)} p.p. (${fmtData(up.data, "Diária")}).`,
    explica: "Restritiva = juro real esperado acima do juro neutro implícito nas projeções do Focus para 3 anos à frente (BR-118).",
    verMais: { secoes: [
      { titulo: "O que é", paragrafos: [
        "Juro real ex-ante é a Selic descontada da inflação esperada para os próximos 12 meses: o custo real do dinheiro que empresas e famílias enxergam hoje.",
        "Juro neutro é o nível que nem acelera nem freia a economia. Não é observável; aqui usamos o que está implícito nas projeções do Focus para daqui a 3 anos, quando os efeitos de curto prazo já passaram. Juro real acima do neutro freia a demanda e a inflação; abaixo, estimula.",
      ] },
      { titulo: "Gráficos", graficos: [
        { titulo: "Juro real ex-ante", pontos: ultimos(jr, 60), referencia: ultimos(mensalizar(s("neutro")), 60), rotuloReferencia: "neutro implícito", destaque: true },
        { titulo: "Juro real − neutro (p.p.)", pontos: ultimos(postura, 60), referencia: 0 },
      ] },
    ] },
  } : semDados("restritiva", "A política monetária está restritiva?"));

  const dec = decisoes(s("selic"));
  const ult = dec.at(-1);
  if (ult) {
    const dir = Math.sign(ult.para - ult.de);
    let seguidas = 0;
    for (let i = dec.length - 1; i >= 0 && Math.sign(dec[i].para - dec[i].de) === dir; i--) seguidas++;
    const selicAtual = s("selic").at(-1)!;
    perguntas.push({
      id: "copom", pergunta: "O Copom está cortando os juros?", resposta: dir < 0 ? "Sim" : "Não",
      evidencia: `Última mudança da Selic em ${fmtData(ult.data, "Diária")}: ${dir < 0 ? "corte" : "alta"} de ${bps(ult.para - ult.de)}, de ${fmtNumero(ult.de)}% para ${fmtNumero(ult.para)}%${seguidas > 1 ? ` (${seguidas}ª ${dir < 0 ? "redução" : "alta"} seguida)` : ""}. Selic hoje: ${fmtNumero(selicAtual.valor)}%.`,
      explica: "Lê as mudanças da meta Selic (SGS 432). Reuniões sem mudança não aparecem como decisão.",
      verMais: { secoes: [
        { titulo: "Como funciona", paragrafos: [
          "O Copom se reúne a cada 45 dias e define a meta da Selic, a taxa dos empréstimos de um dia entre bancos. Ela é a base de todo o crédito e das aplicações em renda fixa.",
          "A política age com defasagem: o efeito máximo de uma mudança da Selic sobre a inflação aparece entre 6 e 18 meses depois.",
        ] },
        { titulo: "Gráfico", graficos: [{ titulo: "Meta Selic", pontos: ultimos(mensalizar(s("selic")), 60), destaque: true }] },
        { titulo: "Últimas decisões com mudança", tabela: { colunas: ["Data", "De", "Para", "Mudança"], linhas: dec.slice(-8).reverse().map((d) => [fmtData(d.data, "Diária"), `${fmtNumero(d.de)}%`, `${fmtNumero(d.para)}%`, `${d.para > d.de ? "+" : "−"}${bps(d.para - d.de)}`]) } },
      ] },
    });
  }

  const fs = dados[focusSelic(ano)] ?? [], fs1 = dados[focusSelic(ano + 1)] ?? [];
  const selicHoje = s("selic").at(-1);
  const u1 = fs1.at(-1);
  perguntas.push(u1 && selicHoje ? {
    id: "expectativa", pergunta: `O mercado espera Selic menor no fim de ${ano + 1}?`, resposta: u1.valor < selicHoje.valor ? "Sim" : "Não",
    evidencia: `Focus: Selic de ${fmtNumero(u1.valor)}% no fim de ${ano + 1}${fs.at(-1) ? ` e ${fmtNumero(fs.at(-1)!.valor)}% no fim de ${ano}` : ""}, contra ${fmtNumero(selicHoje.valor)}% hoje.`,
    explica: "Mediana das projeções para a Selic no fim de cada ano na pesquisa Focus do Banco Central.",
    verMais: { secoes: [
      { titulo: "Como ler", paragrafos: [
        "A diferença entre a Selic de hoje e a projetada para o fim do ano mostra quanto de corte (ou alta) o mercado já espera. Surpresas em relação a isso costumam mexer nos juros futuros, no câmbio e na bolsa.",
      ] },
      { titulo: "Gráficos", graficos: [
        { titulo: `Focus, Selic no fim de ${ano}`, pontos: ultimos(mensalizar(fs), 24) },
        { titulo: `Focus, Selic no fim de ${ano + 1}`, pontos: ultimos(mensalizar(fs1), 24), destaque: true },
      ] },
      { titulo: "Números", numeros: [[`Selic hoje`, `${fmtNumero(selicHoje.valor)}%`], [`Focus fim de ${ano}`, fs.at(-1) ? `${fmtNumero(fs.at(-1)!.valor)}%` : "—"], [`Focus fim de ${ano + 1}`, `${fmtNumero(u1.valor)}%`], [`Focus fim de ${ano + 2}`, (dados[focusSelic(ano + 2)] ?? []).at(-1) ? `${fmtNumero((dados[focusSelic(ano + 2)] ?? []).at(-1)!.valor)}%` : "—"]] },
    ] },
  } : semDados("expectativa", `O mercado espera Selic menor no fim de ${ano + 1}?`));

  const djr = deltaDias(s("juroReal"), 91, 10);
  perguntas.push(djr ? {
    id: "juroReal", pergunta: "O juro real está caindo?", resposta: djr.d < 0 ? "Sim" : "Não",
    evidencia: `Juro real ex-ante em ${fmtNumero(djr.atual.valor)}%: ${mover(djr.d)} em 3 meses.`,
    explica: "Juro real ex-ante = Selic deflacionada pela expectativa de IPCA 12 meses à frente (Focus), fórmula de Fisher.",
    verMais: { secoes: [
      { titulo: "Como ler", paragrafos: [
        "O juro real cai quando o Copom corta a Selic ou quando a inflação esperada sobe. São coisas muito diferentes: a primeira é decisão de política; a segunda pode ser sinal de desancoragem. O quadro \"O que mexeu no juro real\" separa as duas.",
      ] },
      { titulo: "Gráficos", graficos: [
        { titulo: "Juro real ex-ante", pontos: ultimos(jr, 36), destaque: true },
        { titulo: "Focus, IPCA 12 meses à frente", pontos: ultimos(mensalizar(s("focus12")), 36) },
      ] },
    ] },
  } : semDados("juroReal", "O juro real está caindo?"));

  const cred = variacaoK(s("credito"), 12), dc = deltaK(cred, 3);
  perguntas.push(dc ? {
    id: "credito", pergunta: "O crédito está desacelerando?", resposta: dc.d < 0 ? "Sim" : "Não",
    evidencia: `Saldo de crédito crescendo ${fmtNumero(dc.atual.valor, 1)}% em 12 meses (${fmtData(dc.atual.data)}); ${mover(dc.d, "p.p.", 1)} em 3 meses.`,
    explica: "Saldo total de crédito do sistema financeiro (SGS 20539), variação nominal contra 12 meses antes.",
    verMais: { secoes: [
      { titulo: "Por que importa", paragrafos: [
        "O crédito é o principal canal da Selic para a economia: juro mais alto encarece o empréstimo, os bancos ficam mais seletivos e o saldo cresce menos. Crédito desacelerando é sinal de que a política está chegando à ponta.",
        "Os números são nominais (sem descontar a inflação).",
      ] },
      { titulo: "Gráficos (contra 12 meses antes)", graficos: [
        { titulo: "Saldo total", pontos: ultimos(cred, 36), casas: 1, destaque: true },
        { titulo: "Pessoas físicas", pontos: ultimos(variacaoK(s("creditoPF"), 12), 36), casas: 1 },
        { titulo: "Empresas", pontos: ultimos(variacaoK(s("creditoPJ"), 12), 36), casas: 1 },
      ] },
    ] },
  } : semDados("credito", "O crédito está desacelerando?"));

  const taxa = s("taxa"), dt = deltaK(taxa, 3);
  perguntas.push(dt ? {
    id: "custo", pergunta: "O custo do crédito está caindo?", resposta: dt.d < 0 ? "Sim" : "Não",
    evidencia: `Taxa média de juros das novas operações em ${fmtNumero(dt.atual.valor, 1)}% ao ano (${fmtData(dt.atual.data)}); ${mover(dt.d, "p.p.", 1)} em 3 meses. Spread de ${s("spread").at(-1) ? fmtNumero(s("spread").at(-1)!.valor, 1) : "—"} p.p.`,
    explica: "Taxa média de juros das novas concessões (SGS 20714) e spread bancário (SGS 20783).",
    verMais: { secoes: [
      { titulo: "Como ler", paragrafos: [
        "A taxa média do crédito acompanha a Selic com atraso, mais o spread: a margem dos bancos, que inclui risco de calote, impostos e custos. Quando a inadimplência sobe, o spread costuma subir mesmo com a Selic caindo.",
      ] },
      { titulo: "Gráficos", graficos: [
        { titulo: "Taxa média das novas operações", pontos: ultimos(taxa, 36), casas: 1, destaque: true },
        { titulo: "Spread médio", pontos: ultimos(s("spread"), 36), unidade: " p.p.", casas: 1 },
      ] },
    ] },
  } : semDados("custo", "O custo do crédito está caindo?"));

  // ---------------------------------------------------------------- o que mexeu no juro real
  // r = (1+i)/(1+π) − 1; Δr = (i₁−i₀)/(1+π₀) [Selic] + (1+i₁)(1/(1+π₁) − 1/(1+π₀)) [expectativa]
  const selicM = new Map(mensalizar(s("selic")).map((p) => [p.data, p.valor])), focM = new Map(mensalizar(s("focus12")).map((p) => [p.data, p.valor]));
  const datas = [...focM.keys()].filter((d) => selicM.has(d)).sort();
  const data = datas.at(-1) ?? null;
  const porPrazo = Object.fromEntries(PRAZOS.map((k) => {
    const antes = data ? datas.find((d) => mesAbs(d) === mesAbs(data) - k) ?? null : null;
    if (!data || !antes) return [k, { antes: null, itens: [] }];
    const i0 = selicM.get(antes)! / 100, i1 = selicM.get(data)! / 100, p0 = focM.get(antes)! / 100, p1 = focM.get(data)! / 100;
    return [k, { antes, itens: [
      { id: "selic", nome: "Selic (decisões do Copom)", atual: i1 * 100, delta: (100 * (i1 - i0)) / (1 + p0) },
      { id: "expectativa", nome: "Inflação esperada (Focus 12m)", atual: p1 * 100, delta: 100 * (1 + i1) * (1 / (1 + p1) - 1 / (1 + p0)) },
    ].sort((a, b) => b.delta - a.delta) }];
  })) as Decomposicao["porPrazo"];

  const forca = (id: string, nome: string, influencia: string, pontos: Ponto[], racional: string, unidade = "%"): Forca => {
    const d = deltaK(pontos, 3);
    return { id, nome, influencia, valor: pontos.at(-1)?.valor ?? null, unidade, d3: d?.d ?? null, rotuloD3: "em 3 meses", serie: ultimos(pontos, 36), racional };
  };
  const conc12 = variacaoK(somaN(s("concessoes"), 12), 12);

  const fatos = calcularFatos(s("postura"), { emPontos: true, frequencia: "Diária" });
  const r = relogio(postura, () => 0, { mesesDirecao: 6, rastroMeses: 24 });
  return {
    frase: fatos ? frase("Juro real menos neutro", fatos, { unidade: "p.p.", frequencia: "Diária" }) : null,
    relogio: r ? { relogio: r, rotulo: "Juro real − neutro", referencia: "zero (neutro)", unidade: "p.p.", mesesDirecao: 6, nomes: NOMES, descricoes: DESCR,
      explica: "Cruza duas perguntas: o juro real está acima ou abaixo do neutro implícito (horizontal) e a diferença está subindo ou caindo em 6 meses (vertical). À direita, a política freia a economia; à esquerda, estimula.",
      formula: formulaRelogio("juro real ex-ante − neutro implícito no Focus (BR-118)", "zero", NOMES) } : null,
    perguntas,
    decomposicao: data ? {
      titulo: "O que mexeu no juro real", rotuloTotal: "Mudança no juro real ex-ante", unidade: "p.p.", data, porPrazo, aditiva: true,
      rotuloAtual: "Nível hoje (%)", setas: { baixo: "← reduziu o juro real", cima: "aumentou o juro real →" },
      explica: "O juro real ex-ante muda por dois motivos: o Copom mexe na Selic, ou o mercado muda a inflação que espera. A soma das barras é a mudança exata do juro real no prazo.",
      formula: {
        titulo: "Decomposição do juro real",
        formula: ["r = (1 + i)/(1 + πᵉ) − 1", "Efeito Selic = (i₁ − i₀) / (1 + πᵉ₀)", "Efeito expectativa = (1 + i₁) × [1/(1 + πᵉ₁) − 1/(1 + πᵉ₀)]", "Efeito Selic + efeito expectativa = r₁ − r₀ (exato)"],
        variaveis: ["i: meta Selic (SGS 432), último valor do mês", "πᵉ: Focus IPCA 12 meses à frente, última pesquisa do mês"],
        metodologia: ["Mesma conta do juro real ex-ante (BR-055), feita com o último dado de cada mês."],
      },
      porTras: {
        selic: ["Decisões do Copom: o comunicado e a ata explicam o motivo (aba de dados, Comunicados do Copom)."],
        expectativa: ["Inflação esperada sobe com choques (câmbio, alimentos, energia), dúvidas fiscais ou perda de credibilidade da meta; cai quando a inflação corrente cede."],
      },
    } : null,
    forcas: {
      titulo: "Crédito: onde a política chega", legenda: "Último valor · mudança em 3 meses · últimos 3 anos",
      explica: "O crédito é o principal canal pelo qual a Selic chega a famílias e empresas.",
      racionalGeral: "A Selic muda o custo de captação dos bancos, que repassam para a taxa do crédito (mais o spread). Crédito mais caro reduz concessões e o crescimento do saldo, freando consumo e investimento.",
      formula: { titulo: "Crédito", formula: ["Saldos: variação contra 12 meses antes", "Concessões: soma de 12 meses contra os 12 anteriores"], variaveis: ["SGS 20539, 20541, 20540, 20631, 20714, 20783"], metodologia: ["Valores nominais."] },
      itens: [
        forca("credito", "Saldo de crédito total", "Volume", cred, "Crescimento nominal do estoque de crédito em 12 meses."),
        forca("pf", "Crédito a pessoas físicas", "Famílias", variacaoK(s("creditoPF"), 12), "Crescimento nominal do saldo de crédito às famílias."),
        forca("pj", "Crédito a empresas", "Empresas", variacaoK(s("creditoPJ"), 12), "Crescimento nominal do saldo de crédito às empresas."),
        forca("concessoes", "Concessões em 12 meses", "Crédito novo", conc12, "Empréstimos novos somados em 12 meses, contra os 12 anteriores."),
        forca("taxa", "Taxa média do crédito", "Custo", taxa, "Juros médios das novas operações, % ao ano."),
        forca("spread", "Spread médio", "Margem e risco", s("spread"), "Diferença entre a taxa do crédito e o custo de captação dos bancos.", " p.p."),
      ],
    },
    parecidos: parecidos({
      selic: { pontos: s("selic"), toleranciaDias: 10 },
      juroReal: { pontos: s("juroReal"), toleranciaDias: 15 },
      focus12: { pontos: s("focus12"), toleranciaDias: 15 },
      ipca12: { pontos: s("ipca12"), toleranciaDias: 40 },
    }, [
      { id: "selic", rotulo: "Selic", curto: "Selic", unidade: "%" },
      { id: "juroReal", rotulo: "Juro real ex-ante", curto: "juro real", unidade: "%" },
      { id: "focus12", rotulo: "Focus IPCA 12m", curto: "Focus", unidade: "%" },
      { id: "ipca12", rotulo: "IPCA 12m", curto: "IPCA", unidade: "%" },
    ], { id: "selic", rotulo: "Selic", unidade: "%" }, "2002-01", hoje),
    formulaParecidos: formulaParecidos("Selic (SGS 432), juro real ex-ante (BR-055), Focus IPCA 12 meses e IPCA 12 meses (SGS 13522)"),
    curvaReunioes: curvaReunioes(dados, hoje, s("selic").at(-1)?.valor ?? null),
  };
}
