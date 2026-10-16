/**
 * Geral da aba Famílias: o orçamento das famílias (comprometimento de renda, dívida,
 * inadimplência), a renda e o crédito por modalidade.
 */
import { calcularFatos, frase } from "../../fatos";
import { fmtData, fmtNumero } from "../../formato";
import type { Ponto } from "../../transform";
import type { Fase } from "../relogio";
import { relogio } from "../relogio";
import {
  decompor, deltaK, formulaParecidos, formulaRelogio, kAntes, mediaAnos, mediaMovelAnos, mover, parecidos, semDados, sinal,
  ultimos, variacaoK, type Forca, type GeralAba, type Pergunta,
} from "../motor";

const S = {
  endividamento: "BR-091:29037", comprometimento: "BR-092:29034", inadimplencia: "BR-096:21084",
  cartao: "BR-093:20590", pessoal: "BR-094:20580", imobiliario: "BR-095:20612",
  creditoPF: "BR-062:20541", juroPF: "BR-065:20716",
  massa: "BR-020:t6392/v6293,6288@6293", rendimento: "BR-019:t6390/v5933,5929@5933",
  consumo: "BR-004:t1621/v584/c11255=93404,93405,93406,93407,93408@93404",
  selic: "BR-050:432",
};
export const idsFamilias = () => Object.values(S);

const NOMES: Record<Fase, string> = { aquecendo: "Apertando", esfriando: "Aliviando", fria: "Folgado", reaquecendo: "Começa a apertar" };
const DESCR: Record<Fase, string> = {
  aquecendo: "comprometimento acima da média e subindo", esfriando: "acima da média, mas caindo",
  fria: "abaixo da média e caindo", reaquecendo: "abaixo da média, mas subindo",
};

export function geralFamilias(dados: Record<string, Ponto[]>, hoje: string): GeralAba {
  const s = (k: keyof typeof S) => dados[S[k]] ?? [];
  const comp = s("comprometimento"), mediaComp = mediaMovelAnos(comp, 10), m10 = mediaAnos(comp, 10);
  const perguntas: Pergunta[] = [];
  const u = comp.at(-1);

  perguntas.push(u && m10 !== null ? {
    id: "comprometimento", pergunta: "O comprometimento de renda está acima da média de 10 anos?", resposta: u.valor > m10 ? "Sim" : "Não",
    evidencia: `${fmtNumero(u.valor, 1)}% da renda vai para pagar dívidas (${fmtData(u.data)}), contra média de ${fmtNumero(m10, 1)}% em 10 anos.`,
    explica: "Comprometimento de renda das famílias com o serviço da dívida (juros + amortização), com ajuste sazonal (SGS 29034).",
    verMais: { secoes: [
      { titulo: "O que é", paragrafos: [
        "É a fatia da renda mensal das famílias que vai para pagar parcelas de dívidas: juros mais amortização. É a medida mais direta do aperto no orçamento.",
        "Sobe quando os juros sobem (as parcelas novas ficam mais caras) ou quando as famílias pegam mais crédito do que a renda cresce. Comprometimento alto costuma vir antes de alta da inadimplência e de consumo mais fraco.",
      ] },
      { titulo: "Gráficos", graficos: [
        { titulo: "Comprometimento de renda", pontos: ultimos(comp, 60), referencia: m10, rotuloReferencia: "média de 10 anos", casas: 1, destaque: true },
        { titulo: "Endividamento (% da renda de 12 meses)", pontos: ultimos(s("endividamento"), 60), casas: 1 },
      ] },
    ] },
  } : semDados("comprometimento", "O comprometimento de renda está acima da média de 10 anos?"));

  const end = s("endividamento"), de = deltaK(end, 12);
  perguntas.push(de ? {
    id: "endividamento", pergunta: "O endividamento das famílias está subindo?", resposta: de.d > 0 ? "Sim" : "Não",
    evidencia: `Dívida das famílias de ${fmtNumero(de.atual.valor, 1)}% da renda de 12 meses (${fmtData(de.atual.data)}), ${sinal(de.d, 1)} p.p. em 12 meses.`,
    explica: "Endividamento das famílias com o sistema financeiro em relação à renda acumulada em 12 meses (SGS 29037).",
    verMais: { secoes: [
      { titulo: "Como ler", paragrafos: [
        "Endividamento é o estoque de dívida (quanto as famílias devem); comprometimento é o fluxo (quanto pagam por mês). Dívida longa e barata, como o financiamento imobiliário, aumenta o endividamento sem apertar tanto o orçamento.",
      ] },
      { titulo: "Gráficos", graficos: [
        { titulo: "Endividamento total", pontos: ultimos(end, 60), casas: 1, destaque: true },
      ] },
    ] },
  } : semDados("endividamento", "O endividamento das famílias está subindo?"));

  const inad = s("inadimplencia"), di = deltaK(inad, 12);
  perguntas.push(di ? {
    id: "inadimplencia", pergunta: "A inadimplência das famílias está subindo?", resposta: di.d > 0 ? "Sim" : "Não",
    evidencia: `${fmtNumero(di.atual.valor, 2)}% da carteira de pessoas físicas com atraso acima de 90 dias, ${sinal(di.d)} p.p. em 12 meses.`,
    explica: "Inadimplência da carteira de crédito a pessoas físicas, atraso acima de 90 dias (SGS 21084).",
    verMais: { secoes: [
      { titulo: "Por que importa", paragrafos: [
        "Inadimplência alta faz os bancos cobrarem spreads maiores e emprestarem menos, o que trava o consumo. Ela costuma subir alguns meses depois de juros altos e comprometimento de renda elevado.",
      ] },
      { titulo: "Gráficos", graficos: [
        { titulo: "Inadimplência PF (> 90 dias)", pontos: ultimos(inad, 60), destaque: true },
        { titulo: "Taxa de juros do crédito PF (% a.a.)", pontos: ultimos(s("juroPF"), 60), casas: 1 },
      ] },
    ] },
  } : semDados("inadimplencia", "A inadimplência das famílias está subindo?"));

  const massa = variacaoK(s("massa"), 12), um = massa.at(-1);
  perguntas.push(um ? {
    id: "renda", pergunta: "A renda das famílias está crescendo?", resposta: um.valor > 0 ? "Sim" : "Não",
    evidencia: `Massa de rendimento real do trabalho ${sinal(um.valor)}% contra um ano antes (${fmtData(um.data)}).`,
    explica: "Massa de rendimento real habitual de todos os trabalhos (PNAD Contínua, IBGE).",
    verMais: { secoes: [
      { titulo: "Como ler", paragrafos: ["A massa de rendimento é a soma de todos os salários, descontada a inflação. É o principal combustível do consumo e o que permite às famílias pagar as dívidas."] },
      { titulo: "Gráficos (contra 12 meses antes)", graficos: [
        { titulo: "Massa de rendimento real", pontos: ultimos(massa, 36), destaque: true },
        { titulo: "Rendimento médio real", pontos: ultimos(variacaoK(s("rendimento"), 12), 36) },
      ] },
    ] },
  } : semDados("renda", "A renda das famílias está crescendo?"));

  const cpf = variacaoK(s("creditoPF"), 12), dc = deltaK(cpf, 3);
  perguntas.push(dc ? {
    id: "credito", pergunta: "O crédito às famílias está acelerando?", resposta: dc.d > 0 ? "Sim" : "Não",
    evidencia: `Saldo de crédito a pessoas físicas crescendo ${fmtNumero(dc.atual.valor, 1)}% em 12 meses; ${mover(dc.d, "p.p.", 1)} em 3 meses.`,
    explica: "Saldo de crédito a pessoas físicas (SGS 20541), variação nominal contra 12 meses antes.",
    verMais: { secoes: [
      { titulo: "Como ler", paragrafos: ["Crédito acelerando sustenta o consumo no curto prazo, mas aumenta o comprometimento de renda à frente. O quadro abaixo mostra quais modalidades puxam o movimento."] },
      { titulo: "Gráficos (contra 12 meses antes)", graficos: [
        { titulo: "Crédito PF total", pontos: ultimos(cpf, 36), casas: 1, destaque: true },
        { titulo: "Cartão de crédito", pontos: ultimos(variacaoK(s("cartao"), 12), 36), casas: 1 },
        { titulo: "Crédito pessoal", pontos: ultimos(variacaoK(s("pessoal"), 12), 36), casas: 1 },
        { titulo: "Financiamento imobiliário", pontos: ultimos(variacaoK(s("imobiliario"), 12), 36), casas: 1 },
      ] },
    ] },
  } : semDados("credito", "O crédito às famílias está acelerando?"));

  const juro = s("juroPF"), dj = deltaK(juro, 3);
  perguntas.push(dj ? {
    id: "juro", pergunta: "O juro para as famílias está caindo?", resposta: dj.d < 0 ? "Sim" : "Não",
    evidencia: `Taxa média das novas operações com pessoas físicas em ${fmtNumero(dj.atual.valor, 1)}% ao ano; ${mover(dj.d, "p.p.", 1)} em 3 meses.`,
    explica: "Taxa média de juros das novas concessões a pessoas físicas (SGS 20716).",
    verMais: { secoes: [
      { titulo: "Como ler", paragrafos: ["A taxa média mistura modalidades muito diferentes: o rotativo do cartão pode passar de 400% ao ano, enquanto o imobiliário fica perto de 12%. Mudanças na composição (mais imobiliário, menos cartão) mexem na média sem que os juros de cada linha mudem."] },
      { titulo: "Gráfico", graficos: [{ titulo: "Taxa média PF (% a.a.)", pontos: ultimos(juro, 60), casas: 1, destaque: true }] },
    ] },
  } : semDados("juro", "O juro para as famílias está caindo?"));

  // ---------------------------------------------------------------- crédito por modalidade
  // contribuição de cada modalidade para o crescimento em 12 meses da soma das três
  const mods = [{ id: "cartao", nome: "Cartão de crédito" }, { id: "pessoal", nome: "Crédito pessoal" }, { id: "imobiliario", nome: "Financiamento imobiliário" }] as const;
  const soma = new Map<string, number>();
  for (const m of mods) for (const p of s(m.id)) soma.set(p.data, (soma.get(p.data) ?? 0) + p.valor);
  const contrib = (k: (typeof mods)[number]["id"]) => s(k).flatMap((p) => {
    const a = kAntes(s(k), 12, p);
    const base = a ? soma.get(a.data) : undefined;
    return a && base ? [{ data: p.data, valor: ((p.valor - a.valor) / base) * 100 }] : [];
  });
  const dec = decompor(mods.map((m) => ({ id: m.id, nome: m.nome, serie: contrib(m.id) })));

  const forca = (id: string, nome: string, influencia: string, pontos: Ponto[], racional: string, rotuloD3 = "em 3 meses"): Forca => {
    const d = deltaK(pontos, 3);
    return { id, nome, influencia, valor: pontos.at(-1)?.valor ?? null, unidade: "%", d3: d?.d ?? null, rotuloD3, serie: ultimos(pontos, 36), racional };
  };

  const fatos = calcularFatos(comp, { emPontos: true, frequencia: "Mensal" });
  const r = relogio(comp, mediaComp, { mesesDirecao: 6, rastroMeses: 24 });
  return {
    frase: fatos ? frase("Comprometimento de renda", fatos, { unidade: "%", frequencia: "Mensal", casas: 1 }) : null,
    relogio: r ? { relogio: r, rotulo: "Comprometimento", referencia: "média de 10 anos", unidade: "%", mesesDirecao: 6, nomes: NOMES, descricoes: DESCR,
      explica: "Cruza duas perguntas: a fatia da renda que vai para dívidas está acima ou abaixo da média de 10 anos (horizontal) e está subindo ou caindo em 6 meses (vertical). À direita, orçamento mais apertado.",
      formula: formulaRelogio("comprometimento de renda das famílias (SGS 29034)", "média dos 10 anos anteriores", NOMES) } : null,
    perguntas,
    decomposicao: dec.data ? {
      titulo: "Quais dívidas estão crescendo", rotuloTotal: "Mudança no crescimento em 12 meses (cartão + pessoal + imobiliário)", unidade: "p.p.", data: dec.data, porPrazo: dec.porPrazo, aditiva: true,
      rotuloAtual: "Contribuição hoje para o crescimento em 12 meses (p.p.)", setas: { baixo: "← freou", cima: "acelerou →" },
      explica: "Quanto cada modalidade contribui para o crescimento em 12 meses do crédito às famílias (soma de cartão, pessoal e imobiliário), e como essa contribuição mudou no prazo escolhido.",
      formula: {
        titulo: "Crédito às famílias por modalidade",
        formula: ["Contribuição da modalidade = (saldoₜ − saldoₜ₋₁₂) / (soma das três modalidades em t−12) × 100", "As três contribuições somam o crescimento em 12 meses da soma das três", "Mudança = contribuição hoje − contribuição k meses antes"],
        variaveis: ["Saldos de crédito a pessoas físicas: cartão (SGS 20590), crédito pessoal (20580), financiamento imobiliário (20612)"],
        metodologia: ["Valores nominais. As três modalidades não são todo o crédito às famílias (ficam de fora veículos, rural e outras)."],
      },
      porTras: {
        cartao: ["Consumo do dia a dia e parcelado sem juros; o rotativo cresce quando o orçamento aperta."],
        pessoal: ["Inclui o consignado (desconto em folha, mais barato) e o não consignado; cresce com renda e com regras do consignado."],
        imobiliario: ["Juros longos e funding da poupança e do FGTS; programas habitacionais."],
      },
    } : null,
    forcas: {
      titulo: "Renda, dívida e consumo", legenda: "Último valor · mudança em 3 meses · últimos 3 anos",
      explica: "O que sustenta e o que aperta o orçamento das famílias.",
      racionalGeral: "Renda e crédito financiam o consumo; dívidas e juros comprometem a renda futura. A combinação define se o consumo tem fôlego.",
      formula: { titulo: "Renda, dívida e consumo", formula: ["Variações contra 12 meses antes; níveis em % da renda"], variaveis: ["PNAD (SIDRA 6392), BCB (SGS 29037, 29034, 21084, 20716), Contas Nacionais (SIDRA 1621)"], metodologia: ["Mudança em 3 meses da própria medida (no consumo, mudança no trimestre)."] },
      itens: [
        forca("massa", "Massa de renda real", "Renda", massa, "Crescimento real dos salários somados."),
        forca("consumo", "Consumo das famílias (PIB)", "Gasto", variacaoK(s("consumo"), 12), "Contra o mesmo trimestre do ano anterior.", "no trimestre"),
        forca("endividamento", "Endividamento", "Estoque de dívida", end, "Dívida como % da renda de 12 meses."),
        forca("inadimplencia", "Inadimplência PF", "Risco", inad, "Atraso acima de 90 dias."),
        forca("juro", "Juro médio PF", "Custo", juro, "Taxa média das novas operações, % a.a."),
      ],
    },
    parecidos: parecidos({
      comprometimento: { pontos: comp, toleranciaDias: 40 },
      endividamento: { pontos: end, toleranciaDias: 40 },
      inadimplencia: { pontos: inad, toleranciaDias: 40 },
      selic: { pontos: s("selic"), toleranciaDias: 10 },
    }, [
      { id: "comprometimento", rotulo: "Comprometimento de renda", curto: "comprometimento", unidade: "%" },
      { id: "endividamento", rotulo: "Endividamento", curto: "endividamento", unidade: "%" },
      { id: "inadimplencia", rotulo: "Inadimplência PF", curto: "inadimplência", unidade: "%" },
      { id: "selic", rotulo: "Selic", curto: "Selic", unidade: "%" },
    ], { id: "comprometimento", rotulo: "Comprometimento de renda", unidade: "%" }, "2011-03", hoje),
    formulaParecidos: formulaParecidos("Comprometimento de renda (SGS 29034), endividamento (29037), inadimplência PF (21084) e Selic (SGS 432)"),
  };
}
