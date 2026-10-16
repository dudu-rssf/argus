/**
 * Geral da aba Atividade: o ritmo da economia (IBC-Br), o que acelera e o que freia,
 * as forças da demanda no PIB e os períodos parecidos.
 */
import { calcularFatos, frase } from "../../fatos";
import { fmtData, fmtNumero } from "../../formato";
import type { Ponto } from "../../transform";
import type { Fase } from "../relogio";
import { relogio } from "../relogio";
import {
  decompor, deltaDias, deltaK, formulaParecidos, formulaRelogio, mediaMovelAnos, mediaN, mensalizar, mover,
  parecidos, semDados, sinal, ultimos, variacaoK, type Forca, type GeralAba, type Pergunta,
} from "../motor";

const S = {
  ibc: "BR-006:24364",
  pib: "BR-001:t1621/v584/c11255=90707",
  pim: "BR-007:t8888/v12606,12607/c544=129314,129315,129316@12607.129314",
  extrativa: "BR-007:t8888/v12606,12607/c544=129314,129315,129316@12607.129315",
  transformacao: "BR-007:t8888/v12606,12607/c544=129314,129315,129316@12607.129316",
  varejo: "BR-008:t8880/v7169,7170/c11046=56733,56734@7170.56734",
  ampliado: "BR-008:t8881/v7169,7170/c11046=56735,56736@7170.56736",
  servicos: "BR-009:t5906/v7167,7168/c11046=56725,56726@7168.56726",
  familias: "BR-004:t1621/v584/c11255=93404,93405,93406,93407,93408@93404",
  governo: "BR-004:t1621/v584/c11255=93404,93405,93406,93407,93408@93405",
  fbcf: "BR-004:t1621/v584/c11255=93404,93405,93406,93407,93408@93406",
  exportacoes: "BR-004:t1621/v584/c11255=93404,93405,93406,93407,93408@93407",
  importacoes: "BR-004:t1621/v584/c11255=93404,93405,93406,93407,93408@93408",
  selic: "BR-050:432",
  ipca12: "BR-026:13522",
};
const focusPib = (ano: number) => `BR-014:ExpectativasMercadoAnuais · Indicador='PIB Total'@${ano}`;

export const idsAtividade = (ano: number) => [...Object.values(S), focusPib(ano), focusPib(ano + 1)];

/** Crescimento em 12 meses de um índice mensal: soma de 12 meses contra os 12 anteriores. */
export const cresc12 = (s: Ponto[]) => variacaoK(mediaN(s, 12), 12);
/** Crescimento do trimestre móvel contra o trimestre anterior (índice com ajuste sazonal). */
const tri = (s: Ponto[]) => variacaoK(mediaN(s, 3), 3);

const NOMES: Record<Fase, string> = { aquecendo: "Aquecendo", esfriando: "Esfriando", fria: "Fria", reaquecendo: "Reaquecendo" };
const DESCR: Record<Fase, string> = {
  aquecendo: "crescendo acima da média e acelerando", esfriando: "acima da média, mas desacelerando",
  fria: "abaixo da média e desacelerando", reaquecendo: "abaixo da média, mas acelerando",
};

export function geralAtividade(dados: Record<string, Ponto[]>, hoje: string): GeralAba {
  const s = (k: keyof typeof S) => dados[S[k]] ?? [];
  const ano = Number(hoje.slice(0, 4));
  const ibc12 = cresc12(s("ibc"));
  const mediaIbc = mediaMovelAnos(ibc12, 10);
  const perguntas: Pergunta[] = [];

  // 1. acima da média
  const u = ibc12.at(-1), m = u ? mediaIbc(u.data) : null;
  const grafIbc = { titulo: "IBC-Br, crescimento em 12 meses", pontos: ultimos(ibc12, 60), referencia: ultimos(ibc12, 60).map((p) => ({ data: p.data, valor: mediaIbc(p.data) ?? NaN })).filter((p) => Number.isFinite(p.valor)), rotuloReferencia: "média de 10 anos", destaque: true };
  perguntas.push(u && m !== null ? {
    id: "media", pergunta: "A economia cresce acima da média de 10 anos?", resposta: u.valor > m ? "Sim" : "Não",
    evidencia: `IBC-Br cresceu ${fmtNumero(u.valor)}% em 12 meses até ${fmtData(u.data)}, contra média de ${fmtNumero(m)}% nos últimos 10 anos.`,
    explica: "IBC-Br (SGS 24364) é a prévia mensal do PIB feita pelo Banco Central. Crescimento em 12 meses = soma dos últimos 12 meses contra os 12 anteriores.",
    verMais: { secoes: [
      { titulo: "O que é", paragrafos: [
        "O IBC-Br é o índice de atividade econômica do Banco Central: junta indústria, comércio, serviços e agropecuária num número mensal que antecipa o PIB, que só sai a cada trimestre.",
        "Comparar com a média de 10 anos mostra se o ritmo de hoje é forte ou fraco para o padrão recente do Brasil. Crescer acima da média por muito tempo costuma pressionar emprego e preços; abaixo, o contrário.",
      ] },
      { titulo: "Gráficos", graficos: [grafIbc, { titulo: "IBC-Br, índice com ajuste sazonal", pontos: ultimos(s("ibc"), 60), unidade: "" }] },
    ] },
  } : semDados("media", "A economia cresce acima da média de 10 anos?"));

  // 2. acelerando
  const d3 = deltaK(ibc12, 3), d6 = deltaK(ibc12, 6);
  const tIbc = tri(s("ibc"));
  perguntas.push(d3 && d6 ? {
    id: "aceleracao", pergunta: "A atividade está acelerando?",
    resposta: d3.d > 0 && d6.d > 0 ? "Sim" : d3.d <= 0 && d6.d <= 0 ? "Não" : "Parcial",
    evidencia: `O crescimento em 12 meses ${mover(d3.d)} em 3 meses e ${mover(d6.d)} em 6 meses; o último trimestre móvel ${tIbc.at(-1) ? `variou ${sinal(tIbc.at(-1)!.valor)}% contra o anterior` : "não tem dado"}.`,
    explica: "Sim = o crescimento em 12 meses do IBC-Br subiu em 3 e em 6 meses; Não = não subiu em nenhum; Parcial = os prazos discordam.",
    verMais: { secoes: [
      { titulo: "Como ler", paragrafos: [
        "O crescimento em 12 meses é lento para virar: mostra a tendência. O trimestre contra o trimestre anterior (com ajuste sazonal) é mais rápido e mostra a virada antes, mas é mais ruidoso.",
        "Quando os dois andam juntos, o movimento é mais confiável.",
      ] },
      { titulo: "Gráficos", graficos: [
        { titulo: "IBC-Br, crescimento em 12 meses", pontos: ultimos(ibc12, 36), destaque: true },
        { titulo: "IBC-Br, trimestre móvel × anterior", pontos: ultimos(tIbc, 36), barras: true },
      ] },
    ] },
  } : semDados("aceleracao", "A atividade está acelerando?"));

  // 3. espalhado entre setores
  const setores = [
    { k: "pim" as const, nome: "Indústria" }, { k: "ampliado" as const, nome: "Varejo ampliado" }, { k: "servicos" as const, nome: "Serviços" },
  ].map((x) => ({ ...x, t: tri(s(x.k)).at(-1) ?? null, c12: cresc12(s(x.k)).at(-1) ?? null }));
  const comT = setores.filter((x) => x.t);
  const positivos = comT.filter((x) => x.t!.valor > 0);
  perguntas.push(comT.length ? {
    id: "setores", pergunta: "O crescimento está espalhado entre os setores?",
    resposta: positivos.length === comT.length ? "Sim" : positivos.length === 0 ? "Não" : "Parcial",
    evidencia: `No último trimestre móvel contra o anterior: ${comT.map((x) => `${x.nome} ${sinal(x.t!.valor)}%`).join(", ")}.`,
    explica: "Compara o volume dos últimos 3 meses com os 3 anteriores (ajuste sazonal) na indústria (PIM), no varejo ampliado (PMC) e nos serviços (PMS), todos do IBGE.",
    verMais: { secoes: [
      { titulo: "Por que importa", paragrafos: [
        "Crescimento puxado por um setor só (uma safra recorde, uma plataforma de petróleo nova) é mais frágil do que um crescimento em que indústria, comércio e serviços sobem juntos.",
      ] },
      { titulo: "Os três setores (crescimento em 12 meses)", graficos: setores.map((x) => ({ titulo: x.nome, pontos: ultimos(cresc12(s(x.k)), 36), nota: x.t ? `trimestre: ${sinal(x.t.valor)}%` : undefined })) },
      { titulo: "Números", tabela: { colunas: ["Setor", "Trimestre móvel × anterior", "Crescimento em 12 meses", "Dado de"], linhas: setores.map((x) => [x.nome, x.t ? `${sinal(x.t.valor)}%` : "—", x.c12 ? `${fmtNumero(x.c12.valor)}%` : "—", x.t ? fmtData(x.t.data) : "—"]) } },
    ] },
  } : semDados("setores", "O crescimento está espalhado entre os setores?"));

  // 4. PIB no trimestre
  const pibQ = variacaoK(s("pib"), 3), pibA = variacaoK(s("pib"), 12), up = pibQ.at(-1);
  perguntas.push(up ? {
    id: "pib", pergunta: "O PIB cresceu no último trimestre?", resposta: up.valor > 0 ? "Sim" : "Não",
    evidencia: `PIB do ${fmtData(up.data, "Trimestral")} variou ${sinal(up.valor)}% contra o trimestre anterior (com ajuste sazonal) e ${pibA.at(-1) ? `${sinal(pibA.at(-1)!.valor)}%` : "—"} contra o mesmo trimestre do ano anterior.`,
    explica: "PIB trimestral do IBGE (SIDRA 1621, série com ajuste sazonal).",
    verMais: { secoes: [
      { titulo: "O que é", paragrafos: [
        "O PIB soma tudo o que foi produzido no país no trimestre. A variação contra o trimestre anterior, com ajuste sazonal, mostra o ritmo mais recente; contra o mesmo trimestre do ano anterior, a comparação sem sazonalidade.",
        "Dois trimestres seguidos de queda são chamados, por convenção de mercado, de recessão técnica.",
      ] },
      { titulo: "Gráficos", graficos: [
        { titulo: "PIB, trimestre × anterior (%)", pontos: ultimos(pibQ, 16), barras: true },
        { titulo: "PIB, trimestre × mesmo trimestre do ano anterior", pontos: ultimos(pibA, 16), destaque: true },
      ] },
    ] },
  } : semDados("pib", "O PIB cresceu no último trimestre?"));

  // 5. investimento
  const fbcfA = variacaoK(s("fbcf"), 12), uf = fbcfA.at(-1), upA = pibA.at(-1);
  perguntas.push(uf && upA ? {
    id: "investimento", pergunta: "O investimento cresce mais que o PIB?", resposta: uf.valor > upA.valor ? "Sim" : "Não",
    evidencia: `Investimento (FBCF) ${sinal(uf.valor)}% e PIB ${sinal(upA.valor)}% contra o mesmo trimestre do ano anterior (${fmtData(uf.data, "Trimestral")}).`,
    explica: "Formação bruta de capital fixo (máquinas, equipamentos e construção) nas contas nacionais do IBGE.",
    verMais: { secoes: [
      { titulo: "Por que importa", paragrafos: [
        "Investimento é o gasto em máquinas, equipamentos e construção. É o componente mais sensível a juros e confiança: sobe forte nas retomadas e cai forte nas crises.",
        "Investimento crescendo acima do PIB aumenta a capacidade de produzir no futuro, o que permite crescer sem pressionar tanto os preços.",
      ] },
      { titulo: "Gráficos", graficos: [
        { titulo: "Investimento (FBCF), contra o ano anterior", pontos: ultimos(fbcfA, 16), destaque: true },
        { titulo: "PIB, contra o ano anterior", pontos: ultimos(pibA, 16) },
      ] },
    ] },
  } : semDados("investimento", "O investimento cresce mais que o PIB?"));

  // 6. Focus
  const f = dados[focusPib(ano)] ?? [], df = deltaDias(f, 91, 10), f1 = (dados[focusPib(ano + 1)] ?? []).at(-1);
  perguntas.push(df ? {
    id: "focus", pergunta: `O mercado revisou o PIB de ${ano} para cima?`, resposta: df.d > 0 ? "Sim" : "Não",
    evidencia: `Focus para o PIB de ${ano} em ${fmtNumero(df.atual.valor)}%: ${mover(df.d)} em 3 meses${f1 ? `; para ${ano + 1}, ${fmtNumero(f1.valor)}%` : ""}.`,
    explica: "Mediana das projeções para o crescimento do PIB do ano na pesquisa Focus do Banco Central.",
    verMais: { secoes: [
      { titulo: "Como ler", paragrafos: [
        "As revisões do Focus mostram como o mercado está lendo os dados que saem: revisões para cima seguidas indicam dados vindo melhores que o esperado.",
      ] },
      { titulo: "Gráficos", graficos: [
        { titulo: `Focus, PIB de ${ano}`, pontos: ultimos(mensalizar(f), 24), destaque: true },
        { titulo: `Focus, PIB de ${ano + 1}`, pontos: ultimos(mensalizar(dados[focusPib(ano + 1)] ?? []), 24) },
      ] },
    ] },
  } : semDados("focus", `O mercado revisou o PIB de ${ano} para cima?`));

  // ---------------------------------------------------------------- quem acelera e quem freia
  const itensMom = [
    { id: "transformacao", nome: "Indústria de transformação" }, { id: "extrativa", nome: "Indústria extrativa" },
    { id: "varejo", nome: "Varejo restrito" }, { id: "ampliado", nome: "Varejo ampliado" }, { id: "servicos", nome: "Serviços" }, { id: "ibc", nome: "IBC-Br (economia toda)" },
  ] as const;
  const dec = decompor(itensMom.map((x) => ({ id: x.id, nome: x.nome, serie: cresc12(s(x.id)) })));

  // ---------------------------------------------------------------- forças (demanda no PIB)
  const forca = (k: keyof typeof S, nome: string, influencia: string, racional: string): Forca => {
    const a = variacaoK(s(k), 12), d = deltaK(a, 3);
    return { id: k, nome, influencia, valor: a.at(-1)?.valor ?? null, unidade: "%", d3: d?.d ?? null, rotuloD3: "no trimestre", serie: ultimos(a, 16), racional };
  };

  const fatos = calcularFatos(ibc12, { emPontos: true, frequencia: "Mensal" });
  return {
    frase: fatos ? frase("IBC-Br em 12 meses", fatos, { unidade: "%", frequencia: "Mensal" }) : null,
    relogio: (() => {
      const r = relogio(ibc12, mediaIbc, { mesesDirecao: 6, rastroMeses: 24 });
      return r ? { relogio: r, rotulo: "IBC-Br 12m", referencia: "média de 10 anos", unidade: "%", mesesDirecao: 6, nomes: NOMES, descricoes: DESCR,
        explica: "Cruza duas perguntas: a economia cresce acima ou abaixo da sua média de 10 anos (eixo horizontal) e o crescimento está subindo ou caindo nos últimos 6 meses (vertical). O ponto dourado é hoje; a linha, os últimos 24 meses.",
        formula: formulaRelogio("crescimento do IBC-Br em 12 meses (SGS 24364)", "média do próprio crescimento nos 10 anos anteriores", NOMES) } : null;
    })(),
    perguntas,
    decomposicao: dec.data ? {
      titulo: "Quem está acelerando e quem está freando", rotuloTotal: "", unidade: "p.p.", data: dec.data, porPrazo: dec.porPrazo, aditiva: false,
      rotuloAtual: "Crescimento em 12 meses hoje (%)", setas: { baixo: "← freando", cima: "acelerando →" },
      explica: "Mudança no crescimento em 12 meses de cada setor no prazo escolhido. Barras para a direita: o setor está crescendo mais rápido do que antes; para a esquerda, mais devagar. À direita, o crescimento atual de cada um.",
      formula: {
        titulo: "Quem acelera e quem freia",
        formula: ["Crescimento em 12 meses = (Σ índice dos últimos 12 meses / Σ dos 12 anteriores − 1) × 100", "Mudança = crescimento hoje − crescimento k meses antes (k = 3, 6, 9 ou 12)"],
        variaveis: ["PIM-PF (SIDRA 8888, índices com ajuste sazonal), PMC (8880 e 8881), PMS (5906), IBC-Br (SGS 24364)"],
        metodologia: ["Volumes (sem efeito de preço). Os setores não somam o IBC-Br: cada barra é lida sozinha."],
      },
      porTras: {
        transformacao: ["Juros e crédito para máquinas, veículos e bens duráveis.", "Câmbio: um real fraco protege da importação e ajuda a exportar.", "Demanda externa e estoques nas cadeias."],
        extrativa: ["Produção de petróleo (novas plataformas, paradas para manutenção) e de minério.", "Preços internacionais e demanda da China."],
        varejo: ["Renda e emprego das famílias, transferências do governo e inflação de alimentos (supermercados pesam muito)."],
        ampliado: ["Inclui veículos e material de construção, muito sensíveis a juros e crédito.", "Renda e confiança das famílias."],
        servicos: ["Serviços às famílias acompanham renda e emprego; serviços às empresas (transporte, tecnologia) acompanham a indústria e o agro."],
        ibc: ["Média ponderada de tudo: agropecuária, indústria e serviços. Safras grandes mexem muito no primeiro semestre."],
      },
    } : null,
    forcas: {
      titulo: "Forças por trás do PIB (demanda)", legenda: "Crescimento contra o mesmo trimestre do ano anterior · mudança no último trimestre · últimos 4 anos",
      explica: "O PIB visto pelo lado de quem gasta: famílias, governo, investimento e o resto do mundo. Cada componente responde a uma força diferente.",
      racionalGeral: "Pela ótica da demanda, o PIB = consumo das famílias + consumo do governo + investimento + exportações − importações. Cada componente tem uma força dominante: renda e crédito no consumo, política fiscal no governo, juros e confiança no investimento, mundo e câmbio no comércio exterior.",
      formula: { titulo: "Forças por trás do PIB", formula: ["Crescimento = volume do trimestre / volume do mesmo trimestre do ano anterior − 1"], variaveis: ["Contas Nacionais Trimestrais, IBGE SIDRA 1621 (volume encadeado com ajuste sazonal)"], metodologia: ["Volumes: sem efeito de preço."], limitacoes: ["Importações entram com sinal negativo no PIB: crescer mais importação tira do PIB."] },
      itens: [
        forca("familias", "Consumo das famílias", "Renda, emprego e crédito", "Cerca de 60% do PIB. Acompanha a massa de salários, o crédito e as transferências do governo."),
        forca("governo", "Consumo do governo", "Política fiscal", "Gastos correntes de União, estados e municípios (saúde, educação, administração)."),
        forca("fbcf", "Investimento (FBCF)", "Juros e confiança", "Máquinas, equipamentos e construção. O componente que mais oscila com juros e confiança."),
        forca("exportacoes", "Exportações", "Mundo, câmbio e safra", "Vendas ao exterior: dependem da demanda global, das commodities e do câmbio."),
        forca("importacoes", "Importações", "Demanda interna e câmbio", "Compras do exterior: sobem quando a demanda interna está forte ou o real está forte. Entram com sinal negativo no PIB."),
      ],
    },
    parecidos: parecidos({
      ibc12: { pontos: ibc12, toleranciaDias: 40 },
      pim12: { pontos: cresc12(s("pim")), toleranciaDias: 40 },
      varejo12: { pontos: cresc12(s("ampliado")), toleranciaDias: 40 },
      selic: { pontos: s("selic"), toleranciaDias: 10 },
      ipca12: { pontos: s("ipca12"), toleranciaDias: 40 },
    }, [
      { id: "ibc12", rotulo: "IBC-Br 12m", curto: "IBC-Br", unidade: "%" },
      { id: "pim12", rotulo: "Indústria 12m", curto: "indústria", unidade: "%" },
      { id: "varejo12", rotulo: "Varejo ampliado 12m", curto: "varejo", unidade: "%" },
      { id: "selic", rotulo: "Selic", curto: "Selic", unidade: "%" },
      { id: "ipca12", rotulo: "IPCA 12m", curto: "IPCA", unidade: "%" },
    ], { id: "ibc12", rotulo: "IBC-Br, crescimento em 12 meses", unidade: "%" }, "2004-01", hoje),
    formulaParecidos: formulaParecidos("Crescimento em 12 meses do IBC-Br, da indústria (PIM) e do varejo ampliado (PMC), Selic (SGS 432) e IPCA 12 meses (SGS 13522)"),
  };
}
