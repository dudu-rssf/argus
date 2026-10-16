/**
 * Geral da aba Mercado de Trabalho: desemprego contra a média, o que explica a mudança
 * da desocupação (ocupação × participação), renda e emprego formal, períodos parecidos.
 * A PNAD não tem ajuste sazonal: comparações principais contra 12 meses antes.
 */
import { calcularFatos, frase } from "../../fatos";
import { fmtData, fmtNumero } from "../../formato";
import type { Ponto } from "../../transform";
import type { Fase } from "../relogio";
import { relogio } from "../relogio";
import {
  deltaK, formulaParecidos, formulaRelogio, kAntes, mediaAnos, mediaMovelAnos, mesAbs, parecidos, PRAZOS, semDados, sinal,
  somaN, ultimos, variacaoK, type Decomposicao, type Forca, type GeralAba, type Pergunta,
} from "../motor";

const S = {
  desocupacao: "BR-015:24369",
  participacao: "BR-016:t5944/v4096",
  ocupacao: "BR-016:t6379/v4097",
  ocupados: "BR-017:t8501/v4090/c1350=57302,57303@57302",
  informais: "BR-017:t8501/v4090/c1350=57302,57303@57303",
  informalidade: "BR-018:t8513/v12466",
  rendimento: "BR-019:t6390/v5933,5929@5933",
  massa: "BR-020:t6392/v6293,6288@6293",
  caged: "BR-133:derivado",
  selic: "BR-050:432",
  ipca12: "BR-026:13522",
};
export const idsTrabalho = () => Object.values(S);

const NOMES: Record<Fase, string> = { aquecendo: "Piorando", esfriando: "Melhorando", fria: "Aquecido", reaquecendo: "Afrouxando" };
const DESCR: Record<Fase, string> = {
  aquecendo: "desemprego acima da média e subindo", esfriando: "desemprego acima da média, mas caindo",
  fria: "desemprego abaixo da média e caindo", reaquecendo: "desemprego abaixo da média, mas subindo",
};

export function geralTrabalho(dados: Record<string, Ponto[]>, hoje: string): GeralAba {
  const s = (k: keyof typeof S) => (dados[S[k]] ?? []).filter((p) => p.valor !== 0 || k === "caged");
  const des = s("desocupacao");
  const mediaDes = mediaMovelAnos(des, 10);
  const media10 = mediaAnos(des, 10);
  const perguntas: Pergunta[] = [];
  const u = des.at(-1);
  const d12 = deltaK(des, 12);

  perguntas.push(u && media10 !== null ? {
    id: "media", pergunta: "O desemprego está abaixo da média de 10 anos?", resposta: u.valor < media10 ? "Sim" : "Não",
    evidencia: `Desocupação de ${fmtNumero(u.valor, 1)}% no trimestre até ${fmtData(u.data)}, contra média de ${fmtNumero(media10, 1)}% em 10 anos.`,
    explica: "Taxa de desocupação da PNAD Contínua (IBGE, SGS 24369): desocupados como fatia da força de trabalho, em trimestre móvel.",
    verMais: { secoes: [
      { titulo: "O que é", paragrafos: [
        "Desocupado é quem não trabalha, procurou emprego e estava disponível. A taxa é a fatia dessas pessoas na força de trabalho (quem trabalha ou procura). Quem desistiu de procurar não conta como desocupado.",
        "Desemprego baixo para o padrão histórico costuma pressionar salários e, depois, a inflação de serviços. Por isso o Banco Central acompanha de perto.",
      ] },
      { titulo: "Gráfico", graficos: [{ titulo: "Taxa de desocupação", pontos: ultimos(des, 60), referencia: media10, rotuloReferencia: "média de 10 anos", casas: 1, destaque: true }] },
    ] },
  } : semDados("media", "O desemprego está abaixo da média de 10 anos?"));

  perguntas.push(d12 ? {
    id: "queda", pergunta: "O desemprego está menor que há um ano?", resposta: d12.d < 0 ? "Sim" : "Não",
    evidencia: `${fmtNumero(d12.atual.valor, 1)}% contra ${fmtNumero(d12.antes.valor, 1)}% no mesmo trimestre do ano anterior (${sinal(d12.d, 1)} p.p.).`,
    explica: "Compara com o mesmo trimestre do ano anterior porque a PNAD não tem ajuste sazonal: o desemprego sobe todo começo de ano e cai no fim.",
    verMais: { secoes: [
      { titulo: "Como ler", paragrafos: [
        "A desocupação tem sazonalidade forte: sobe no primeiro trimestre (fim dos temporários de fim de ano) e cai no segundo semestre. Comparar com o mês anterior engana; o certo é comparar com o mesmo período do ano anterior.",
      ] },
      { titulo: "Gráficos", graficos: [
        { titulo: "Desocupação", pontos: ultimos(des, 36), casas: 1, destaque: true },
        { titulo: "Mudança contra 12 meses antes (p.p.)", pontos: ultimos(des.flatMap((p) => { const a = kAntes(des, 12, p); return a ? [{ data: p.data, valor: p.valor - a.valor }] : []; }), 36), barras: true, casas: 1 },
      ] },
    ] },
  } : semDados("queda", "O desemprego está menor que há um ano?"));

  const rend = variacaoK(s("rendimento"), 12), massa = variacaoK(s("massa"), 12);
  const ur = rend.at(-1);
  perguntas.push(ur ? {
    id: "renda", pergunta: "A renda real do trabalho está crescendo?", resposta: ur.valor > 0 ? "Sim" : "Não",
    evidencia: `Rendimento médio real ${sinal(ur.valor)}% contra um ano antes; massa de rendimento real ${massa.at(-1) ? `${sinal(massa.at(-1)!.valor)}%` : "—"} (${fmtData(ur.data)}).`,
    explica: "Rendimento médio real habitual e massa de rendimento real da PNAD (IBGE), descontada a inflação.",
    verMais: { secoes: [
      { titulo: "O que é", paragrafos: [
        "Rendimento médio real é o salário típico de quem trabalha, já descontada a inflação. A massa de rendimento é a soma de tudo o que os trabalhadores recebem: cresce quando o salário médio sobe ou quando mais gente trabalha.",
        "Salário real subindo rápido com desemprego baixo é o canal pelo qual o mercado de trabalho pressiona a inflação de serviços. A massa é o motor do consumo das famílias.",
      ] },
      { titulo: "Gráficos (contra 12 meses antes)", graficos: [
        { titulo: "Rendimento médio real", pontos: ultimos(rend, 36), destaque: true },
        { titulo: "Massa de rendimento real", pontos: ultimos(massa, 36) },
      ] },
    ] },
  } : semDados("renda", "A renda real do trabalho está crescendo?"));

  const caged = s("caged"), c12 = somaN(caged, 12), uc = c12.at(-1), ac = uc ? kAntes(c12, 12) : null;
  perguntas.push(uc ? {
    id: "formal", pergunta: "O emprego com carteira está crescendo?", resposta: uc.valor > 0 ? "Sim" : "Não",
    evidencia: `Saldo do Novo CAGED de ${fmtNumero(uc.valor / 1000, 0)} mil vagas em 12 meses até ${fmtData(uc.data)}${ac ? `, contra ${fmtNumero(ac.valor / 1000, 0)} mil um ano antes` : ""}.`,
    explica: "Saldo de admissões menos desligamentos com carteira assinada (Novo CAGED, Ministério do Trabalho), somado em 12 meses.",
    verMais: { secoes: [
      { titulo: "O que é", paragrafos: [
        "O CAGED registra todas as contratações e demissões com carteira assinada. O saldo é a diferença: positivo, o emprego formal cresceu. É o dado mais rápido e completo do emprego formal, mas não cobre informais.",
        "Somar 12 meses tira a sazonalidade (dezembro sempre tem saldo muito negativo).",
      ] },
      { titulo: "Gráficos", graficos: [
        { titulo: "Saldo em 12 meses (mil vagas)", pontos: ultimos(c12.map((p) => ({ data: p.data, valor: p.valor / 1000 })), 36), unidade: " mil", casas: 0, destaque: true },
        { titulo: "Saldo mensal (mil vagas)", pontos: ultimos(caged.map((p) => ({ data: p.data, valor: p.valor / 1000 })), 24), unidade: " mil", casas: 0, barras: true },
      ] },
    ] },
  } : semDados("formal", "O emprego com carteira está crescendo?"));

  const inf = s("informalidade"), di = deltaK(inf, 12);
  perguntas.push(di ? {
    id: "informalidade", pergunta: "A informalidade está caindo?", resposta: di.d < 0 ? "Sim" : "Não",
    evidencia: `Taxa de informalidade de ${fmtNumero(di.atual.valor, 1)}%, ${sinal(di.d, 1)} p.p. contra um ano antes.`,
    explica: "Fatia dos ocupados sem carteira, sem CNPJ ou trabalhando para a família (PNAD, IBGE).",
    verMais: { secoes: [
      { titulo: "Por que importa", paragrafos: [
        "Emprego informal tem renda menor e mais instável e responde diferente aos juros. Quando o emprego cresce só na informalidade, a qualidade da recuperação é menor; quando a informalidade cai, mais renda fica protegida por contrato.",
      ] },
      { titulo: "Gráficos", graficos: [
        { titulo: "Taxa de informalidade", pontos: ultimos(inf, 36), casas: 1, destaque: true },
        { titulo: "Ocupados informais, contra 12 meses antes", pontos: ultimos(variacaoK(s("informais"), 12), 36) },
      ] },
    ] },
  } : semDados("informalidade", "A informalidade está caindo?"));

  const part = s("participacao"), dp = deltaK(part, 12);
  perguntas.push(dp ? {
    id: "participacao", pergunta: "Mais pessoas estão no mercado de trabalho?", resposta: dp.d > 0 ? "Sim" : "Não",
    evidencia: `Participação na força de trabalho de ${fmtNumero(dp.atual.valor, 1)}%, ${sinal(dp.d, 1)} p.p. contra um ano antes.`,
    explica: "Fatia das pessoas em idade de trabalhar que trabalham ou procuram trabalho (PNAD, IBGE).",
    verMais: { secoes: [
      { titulo: "Por que importa", paragrafos: [
        "O desemprego pode cair por dois motivos: mais gente empregada (bom sinal) ou menos gente procurando (desalento, aposentadoria, programas sociais). A participação separa os dois.",
        "Participação subindo amplia a oferta de trabalhadores e alivia a pressão sobre salários.",
      ] },
      { titulo: "Gráficos", graficos: [
        { titulo: "Participação na força de trabalho", pontos: ultimos(part, 36), casas: 1, destaque: true },
        { titulo: "Nível da ocupação (ocupados / população em idade de trabalhar)", pontos: ultimos(s("ocupacao"), 36), casas: 1 },
      ] },
    ] },
  } : semDados("participacao", "Mais pessoas estão no mercado de trabalho?"));

  // ---------------------------------------------------------------- de onde veio a mudança no desemprego
  // u = 100 × (1 − n/p); Δu = 100 (n0 − n1)/p0  [ocupação]  +  100 n1 (1/p0 − 1/p1)  [participação]
  const ocup = s("ocupacao");
  const pm = new Map(part.map((p) => [p.data, p.valor])), nm = new Map(ocup.map((p) => [p.data, p.valor]));
  const datas = part.map((p) => p.data).filter((d) => nm.has(d));
  const data = datas.at(-1) ?? null;
  const porPrazo = Object.fromEntries(PRAZOS.map((k) => {
    if (!data) return [k, { antes: null, itens: [] }];
    const antes = datas.find((d) => mesAbs(d) === mesAbs(data) - k) ?? null;
    if (!antes) return [k, { antes: null, itens: [] }];
    const p0 = pm.get(antes)!, p1 = pm.get(data)!, n0 = nm.get(antes)!, n1 = nm.get(data)!;
    return [k, { antes, itens: [
      { id: "ocupacao", nome: "Ocupação (gente trabalhando)", atual: n1, delta: (100 * (n0 - n1)) / p0 },
      { id: "participacao", nome: "Participação (gente procurando)", atual: p1, delta: 100 * n1 * (1 / p0 - 1 / p1) },
    ].sort((a, b) => b.delta - a.delta) }];
  })) as Decomposicao["porPrazo"];

  const forca = (id: string, nome: string, influencia: string, pontos: Ponto[], unidade: string, racional: string, rotuloD3 = "em 3 meses"): Forca => {
    const d = deltaK(pontos, 3);
    return { id, nome, influencia, valor: pontos.at(-1)?.valor ?? null, unidade, d3: d?.d ?? null, rotuloD3, serie: ultimos(pontos, 36), racional };
  };

  const fatos = calcularFatos(des, { emPontos: true, frequencia: "Trimestre móvel" });
  const r = relogio(des, mediaDes, { mesesDirecao: 12, rastroMeses: 24 });
  return {
    frase: fatos ? frase("Desocupação", fatos, { unidade: "%", frequencia: "Trimestre móvel", casas: 1 }) : null,
    relogio: r ? { relogio: r, rotulo: "Desocupação", referencia: "média de 10 anos", unidade: "%", mesesDirecao: 12, nomes: NOMES, descricoes: DESCR,
      explica: "Cruza duas perguntas: o desemprego está acima ou abaixo da média de 10 anos (horizontal) e está subindo ou caindo contra 12 meses antes (vertical; 12 meses porque a PNAD tem sazonalidade). Aqui, a esquerda é o lado aquecido: desemprego baixo.",
      formula: formulaRelogio("taxa de desocupação (SGS 24369)", "média dos 10 anos anteriores", NOMES, 12) } : null,
    perguntas,
    decomposicao: data ? {
      titulo: "De onde veio a mudança no desemprego", rotuloTotal: "Mudança na taxa de desocupação", unidade: "p.p.", data, porPrazo, aditiva: true,
      rotuloAtual: "Nível hoje (% da população em idade de trabalhar)", setas: { baixo: "← reduziu o desemprego", cima: "aumentou o desemprego →" },
      explica: "A taxa de desocupação muda por dois motivos: mais ou menos gente trabalhando (ocupação) e mais ou menos gente procurando trabalho (participação). A soma das duas barras é a mudança exata da taxa no prazo. Prazos de 3, 6 e 9 meses têm efeito sazonal; 12 meses compara o mesmo período do ano.",
      formula: {
        titulo: "Decomposição da desocupação",
        formula: ["u = 100 × (1 − n / p), com n = nível da ocupação e p = participação (ambos % da população em idade de trabalhar)",
          "Efeito ocupação = 100 × (n₀ − n₁) / p₀", "Efeito participação = 100 × n₁ × (1/p₀ − 1/p₁)", "Efeito ocupação + efeito participação = u₁ − u₀ (exato)"],
        variaveis: ["Participação na força de trabalho (SIDRA 5944, v4096)", "Nível da ocupação (SIDRA 6379, v4097)"],
        metodologia: ["A taxa recalculada por n e p bate com a divulgada (SGS 24369) a menos de arredondamento."],
        limitacoes: ["Sem ajuste sazonal: prazos menores que 12 meses misturam sazonalidade."],
      },
      porTras: {
        ocupacao: ["Contratações e demissões: ritmo da atividade, juros e confiança das empresas.", "Emprego informal e por conta própria reage rápido à renda das famílias."],
        participacao: ["Pessoas que voltam a procurar quando a economia melhora, ou desistem (desalento) quando piora.", "Programas de transferência de renda, aposentadorias e demografia (envelhecimento) reduzem a participação."],
      },
    } : null,
    forcas: {
      titulo: "Renda e emprego", legenda: "Último valor · mudança em 3 meses · últimos 3 anos",
      explica: "Os números que mostram a força do mercado de trabalho e o que ele passa para o consumo e para a inflação.",
      racionalGeral: "Renda real e massa de salários alimentam o consumo; o CAGED mostra o emprego formal; ocupados e informalidade mostram a qualidade das vagas.",
      formula: { titulo: "Renda e emprego", formula: ["Variações contra 12 meses antes; CAGED somado em 12 meses"], variaveis: ["PNAD Contínua (SIDRA 6390, 6392, 8501, 8513) e Novo CAGED (BR-133)"], metodologia: ["Mudança em 3 meses da própria medida."] },
      itens: [
        forca("rendimento", "Rendimento médio real", "Salários", rend, "%", "Salário típico, descontada a inflação, contra 12 meses antes."),
        forca("massa", "Massa de rendimento real", "Consumo das famílias", massa, "%", "Tudo o que os trabalhadores recebem, descontada a inflação, contra 12 meses antes."),
        { ...forca("caged", "Saldo do CAGED em 12 meses", "Emprego formal", c12.map((p) => ({ data: p.data, valor: p.valor / 1000 })), " mil", "Vagas com carteira criadas em 12 meses (mil)."), casas: 0 },
        forca("ocupados", "Pessoas ocupadas", "Geração de vagas", variacaoK(s("ocupados"), 12), "%", "Total de ocupados contra 12 meses antes."),
        forca("informalidade", "Taxa de informalidade", "Qualidade das vagas", inf, "%", "Fatia dos ocupados sem vínculo formal."),
      ],
    },
    parecidos: parecidos({
      desocupacao: { pontos: des, toleranciaDias: 40 },
      rendimento: { pontos: rend, toleranciaDias: 40 },
      massa: { pontos: massa, toleranciaDias: 40 },
      selic: { pontos: s("selic"), toleranciaDias: 10 },
      ipca12: { pontos: s("ipca12"), toleranciaDias: 40 },
    }, [
      { id: "desocupacao", rotulo: "Desocupação", curto: "desocupação", unidade: "%" },
      { id: "rendimento", rotulo: "Rendimento real 12m", curto: "rendimento", unidade: "%" },
      { id: "massa", rotulo: "Massa real 12m", curto: "massa", unidade: "%" },
      { id: "selic", rotulo: "Selic", curto: "Selic", unidade: "%" },
      { id: "ipca12", rotulo: "IPCA 12m", curto: "IPCA", unidade: "%" },
    ], { id: "desocupacao", rotulo: "Taxa de desocupação", unidade: "%" }, "2013-01", hoje),
    formulaParecidos: formulaParecidos("Desocupação (SGS 24369), rendimento e massa real contra 12 meses antes (PNAD), Selic (SGS 432) e IPCA 12 meses (SGS 13522)"),
  };
}

