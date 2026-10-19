/**
 * Motor comum da seção Geral (Fase 6f): tipos e funções puras que as abas usam para
 * montar relógio, perguntas com "Ver mais", decomposição por prazo, forças e períodos
 * parecidos. Cada aba (lib/geral/abas/*.ts) só escolhe séries, regras e textos.
 */
import { encontrarAnalogos, painelMensal } from "../analogos";
import { valorAte } from "../ciclos";
import { fmtNumero } from "../formato";
import { REF, type Formula } from "../formulas";
import type { Ponto } from "../transform";
import type { Resposta } from "./checklist";
export type { Resposta };
import { episodioDe, type Episodio } from "./episodios";
import type { Fase, Relogio } from "./relogio";

// ---------------------------------------------------------------- tipos

export type MiniSerie = { titulo: string; pontos: Ponto[]; unidade?: string; referencia?: Ponto[] | number | null; rotuloReferencia?: string; barras?: boolean; casas?: number; nota?: string; destaque?: boolean };
export type Tabela = { colunas: string[]; linhas: (string | number | null)[][]; nota?: string };
export type VerMaisDados = { secoes: { titulo: string; paragrafos?: string[]; graficos?: MiniSerie[]; tabela?: Tabela; numeros?: [string, string][] }[] };

export type Pergunta = { id: string; pergunta: string; resposta: Resposta; evidencia: string; explica: string; verMais: VerMaisDados };

export const PRAZOS = [3, 6, 9, 12] as const;
export type Prazo = (typeof PRAZOS)[number];
export type ItemDecomposicao = { id: string; nome: string; atual: number | null; delta: number };
export type Decomposicao = {
  titulo: string; explica: string; formula: Formula; unidade: string;
  /** Frase sobre o que é o total (ex.: "Mudança na taxa de desocupação"). */
  rotuloTotal: string; data: string | null;
  /** false: os itens não somam um total (cada barra é lida sozinha). */
  aditiva?: boolean;
  porPrazo: Record<Prazo, { antes: string | null; itens: ItemDecomposicao[] }>;
  /** Por item: o que pode estar por trás (canais típicos). */
  porTras: Record<string, string[]>;
  /** Segunda coluna opcional: nível atual de cada item. */
  rotuloAtual?: string;
  setas?: { baixo: string; cima: string };
};

export type Forca = { id: string; nome: string; influencia: string; valor: number | null; unidade: string; casas?: number; d3: number | null; rotuloD3: string; serie: Ponto[]; racional: string };
export type BlocoForcas = { titulo: string; explica: string; legenda: string; formula: Formula; itens: Forca[]; racionalGeral: string };

export type VariavelParecida = { id: string; rotulo: string; curto: string; unidade: string };
export type Parecido = {
  mes: string; semelhanca: number;
  entao: Record<string, number | null>; depois: Record<string, number | null>;
  proximidade: { id: string; distancia: number }[];
  episodio: Episodio | null;
  trajetoria: { t: number; valor: number }[];
};
export type ParecidosDados = {
  variaveis: VariavelParecida[]; trajetoria: { id: string; rotulo: string; unidade: string };
  atual: { mes: string; valores: Record<string, number | null> } | null; lista: Parecido[];
  caiu: number; subiu: number; mediana: number | null; hoje: { t: number; valor: number }[]; desde: string;
};

export type RelogioAba = {
  relogio: Relogio; rotulo: string; referencia: string; unidade: string; mesesDirecao: number;
  nomes: Record<Fase, string>; descricoes: Record<Fase, string>; explica: string; formula: Formula;
};

export type GeralAba = {
  frase: string | null;
  relogio: RelogioAba | null;
  perguntas: Pergunta[];
  decomposicao: Decomposicao | null;
  forcas: BlocoForcas | null;
  parecidos: ParecidosDados;
  formulaParecidos: Formula;
};

// ---------------------------------------------------------------- utilidades

export function semDados(id: string, pergunta: string): Pergunta {
  return { id, pergunta, resposta: "Sem dados", evidencia: "Sem dados suficientes no banco.", explica: "", verMais: { secoes: [] } };
}

export const mesAbs = (d: string) => Number(d.slice(0, 4)) * 12 + Number(d.slice(5, 7)) - 1;
export const deMesAbs = (t: number) => `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}-01`;
export const sinal = (v: number, c = 2) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${fmtNumero(Math.abs(v), c)}`;
export const ultimos = (s: Ponto[], n: number) => s.slice(-n);

/** Ponto k meses antes do último (série mensal ou trimestral com datas no 1º dia). */
export function kAntes(s: Ponto[], k: number, de?: Ponto): Ponto | null {
  const u = de ?? s.at(-1);
  if (!u) return null;
  const alvo = mesAbs(u.data) - k;
  return s.find((p) => mesAbs(p.data) === alvo) ?? null;
}
export function deltaK(s: Ponto[], k: number): { atual: Ponto; antes: Ponto; d: number } | null {
  const u = s.at(-1), a = kAntes(s, k);
  return u && a ? { atual: u, antes: a, d: u.valor - a.valor } : null;
}
/** Δ em k meses para séries diárias/semanais (último valor até a data k meses antes). */
export function deltaDias(s: Ponto[], dias: number, tolerancia = 15) {
  const u = s.at(-1);
  if (!u) return null;
  const a = valorAte(s, new Date(Date.parse(u.data) - dias * 86_400_000).toISOString().slice(0, 10), tolerancia);
  return a && a.data < u.data ? { atual: u, antes: a, d: u.valor - a.valor } : null;
}
/** Série diária ou semanal → último valor de cada mês (data no 1º dia). */
export function mensalizar(s: Ponto[]): Ponto[] {
  const m = new Map<string, Ponto>();
  for (const p of s) m.set(p.data.slice(0, 7), { data: `${p.data.slice(0, 7)}-01`, valor: p.valor });
  return [...m.values()];
}
/** Variação % contra k meses antes (índices, saldos, níveis em R$). */
export function variacaoK(s: Ponto[], k: number): Ponto[] {
  const mapa = new Map(s.map((p) => [mesAbs(p.data), p.valor]));
  return s.flatMap((p) => {
    const a = mapa.get(mesAbs(p.data) - k);
    return a ? [{ data: p.data, valor: (p.valor / a - 1) * 100 }] : [];
  });
}
/** Soma móvel de n meses seguidos (fluxos). */
export function somaN(s: Ponto[], n: number): Ponto[] {
  const out: Ponto[] = [];
  for (let i = n - 1; i < s.length; i++) {
    if (mesAbs(s[i].data) - mesAbs(s[i - n + 1].data) !== n - 1) continue;
    out.push({ data: s[i].data, valor: s.slice(i - n + 1, i + 1).reduce((t, p) => t + p.valor, 0) });
  }
  return out;
}
/** Média móvel de n meses seguidos. */
export function mediaN(s: Ponto[], n: number): Ponto[] {
  return somaN(s, n).map((p) => ({ data: p.data, valor: p.valor / n }));
}
/** Média dos últimos `anos` anos até o último ponto. */
export function mediaAnos(s: Ponto[], anos = 10): number | null {
  const u = s.at(-1);
  if (!u) return null;
  const corte = `${Number(u.data.slice(0, 4)) - anos}${u.data.slice(4)}`;
  const j = s.filter((p) => p.data > corte);
  return j.length ? j.reduce((t, p) => t + p.valor, 0) / j.length : null;
}
/** Média móvel de `anos` anos para cada ponto (referência que muda no tempo). */
export function mediaMovelAnos(s: Ponto[], anos = 10): (data: string) => number | null {
  return (data: string) => {
    const corte = `${Number(data.slice(0, 4)) - anos}${data.slice(4)}`;
    const j = s.filter((p) => p.data > corte && p.data <= data);
    return j.length >= anos * 6 ? j.reduce((t, p) => t + p.valor, 0) / j.length : null;
  };
}
export function mesesSeguidos(serie: Ponto[], cond: (p: Ponto) => boolean): number {
  let n = 0;
  for (let i = serie.length - 1; i >= 0 && cond(serie[i]); i--) n++;
  return n;
}
export const mover = (d: number, u = "p.p.", c = 2) => (d > 0 ? `subiu ${fmtNumero(d, c)} ${u}` : d < 0 ? `caiu ${fmtNumero(-d, c)} ${u}` : "ficou estável");
export const fmt = (v: number | null | undefined, c = 2, u = "") => (v == null ? "—" : `${fmtNumero(v, c)}${u}`);

/** Decomposição por prazo a partir de séries de contribuição já no mesmo "total". */
export function decompor(itens: { id: string; nome: string; serie: Ponto[] }[]): { data: string | null; porPrazo: Decomposicao["porPrazo"] } {
  const mapas = itens.map((i) => ({ ...i, m: new Map(i.serie.map((p) => [p.data, p.valor])) }));
  const comuns = [...(mapas[0]?.m.keys() ?? [])].filter((d) => mapas.every((x) => x.m.has(d))).sort();
  const data = comuns.at(-1) ?? null;
  const porPrazo = Object.fromEntries(PRAZOS.map((k) => {
    if (!data) return [k, { antes: null, itens: [] }];
    const antes = comuns.find((d) => mesAbs(d) === mesAbs(data) - k) ?? null;
    const lista = antes ? mapas.map((x) => ({ id: x.id, nome: x.nome, atual: x.m.get(data)!, delta: x.m.get(data)! - x.m.get(antes)! })).sort((a, b) => b.delta - a.delta) : [];
    return [k, { antes, itens: lista }];
  })) as Decomposicao["porPrazo"];
  return { data, porPrazo };
}

/** Períodos parecidos genéricos (mesmo motor da aba Análises). */
export function parecidos(
  series: Record<string, { pontos: Ponto[]; toleranciaDias: number }>, variaveis: VariavelParecida[],
  trajetoria: { id: string; rotulo: string; unidade: string }, inicio: string, hoje: string,
): ParecidosDados {
  const painel = painelMensal(series, inicio, hoje.slice(0, 7));
  const vars = variaveis.map((v) => v.id);
  const { atual, analogos } = encontrarAnalogos(painel, vars, { quantos: 5, excluirUltimos: 24, separacao: 12 });
  const porMes = new Map(painel.map((l) => [l.mes, l.valores]));
  const desvio = Object.fromEntries(vars.map((v) => {
    const xs = painel.flatMap((l) => (l.valores[v] == null ? [] : [l.valores[v] as number]));
    const med = xs.reduce((a, x) => a + x, 0) / (xs.length || 1);
    return [v, Math.sqrt(xs.reduce((a, x) => a + (x - med) ** 2, 0) / (xs.length || 1)) || 1];
  }));
  const caminho = (mes: string, de: number, ate: number) => {
    const t0 = mesAbs(`${mes}-01`);
    const out: { t: number; valor: number }[] = [];
    for (let t = de; t <= ate; t++) {
      const v = porMes.get(deMesAbs(t0 + t).slice(0, 7))?.[trajetoria.id];
      if (v != null) out.push({ t, valor: v });
    }
    return out;
  };
  const lista: Parecido[] = analogos.map((a) => ({
    mes: a.mes, semelhanca: Math.max(0, Math.round((1 - a.distancia / 2) * 100)),
    entao: a.valores, depois: porMes.get(deMesAbs(mesAbs(`${a.mes}-01`) + 12).slice(0, 7)) ?? {},
    proximidade: atual ? vars.map((v) => ({ id: v, distancia: Math.abs(((a.valores[v] ?? 0) - (atual.valores[v] ?? 0)) / desvio[v]) })).sort((x, y) => x.distancia - y.distancia) : [],
    episodio: episodioDe(a.mes),
    trajetoria: caminho(a.mes, -12, 12),
  }));
  const difs = lista.flatMap((p) => (p.entao[trajetoria.id] != null && p.depois[trajetoria.id] != null ? [p.depois[trajetoria.id]! - p.entao[trajetoria.id]!] : []));
  const ord = [...difs].sort((a, b) => a - b);
  const mediana = ord.length ? (ord.length % 2 ? ord[ord.length >> 1] : (ord[ord.length / 2 - 1] + ord[ord.length / 2]) / 2) : null;
  const primeiro = painel.find((l) => vars.every((v) => l.valores[v] != null));
  return {
    variaveis, trajetoria, atual, lista, caiu: difs.filter((d) => d < 0).length, subiu: difs.filter((d) => d > 0).length, mediana,
    hoje: atual ? caminho(atual.mes, -12, 0) : [], desde: primeiro?.mes ?? inicio,
  };
}

/** Fórmula padrão dos períodos parecidos, com as variáveis da aba. */
export function formulaParecidos(variaveis: string): Formula {
  return {
    titulo: "Períodos parecidos",
    formula: [
      "zᵥ,ₘ = (xᵥ,ₘ − média de v) / desvio-padrão de v, em toda a amostra",
      "Distância d(m) = √[ Σᵥ (zᵥ,ₘ − zᵥ,hoje)² / nº de variáveis ]; semelhança = máx(0; 1 − d/2) × 100%",
      "Depois = valor 12 meses após o mês parecido; trajetória de t = −12 a t = +12 meses",
      "Mais parecido em / mais diferente em: variáveis ordenadas por |zᵥ,ₘ − zᵥ,hoje|",
    ],
    variaveis: [variaveis],
    metodologia: ["Os 5 meses mais parecidos, fora dos últimos 24 meses e a pelo menos 12 meses um do outro (mesmo motor da aba Análises)."],
    limitacoes: ["São poucos casos: é contexto histórico, não previsão.", "Contexto da época: curadoria do Argus com fatos documentados."],
    fundamento: ["Método de análogos (Lorenz): procura no passado os meses mais parecidos com hoje em várias variáveis padronizadas e mostra o que veio depois."],
    referencias: [REF.lorenz],
  };
}

/** Fórmula padrão do relógio, com a série e a referência da aba. */
export function formulaRelogio(serie: string, referencia: string, nomes: Record<Fase, string>, meses = 6): Formula {
  return {
    titulo: "Relógio do ciclo",
    formula: [
      `Nível = ${serie} − ${referencia}`,
      `Direção = valor de hoje − valor de ${meses} meses antes`,
      "Eixos padronizados: cada um dividido pelo seu desvio-padrão em 10 anos",
      `Fases: acima e subindo = ${nomes.aquecendo}; acima e caindo = ${nomes.esfriando}; abaixo e caindo = ${nomes.fria}; abaixo e subindo = ${nomes.reaquecendo}`,
    ],
    variaveis: [`${serie}; ${referencia}`],
    metodologia: ["Rastro: os 24 meses anteriores. \"Há N meses\": meses seguidos na fase atual."],
    limitacoes: ["Descreve onde o dado está; não prevê a próxima fase."],
    fundamento: ["Cruza nível e direção e lê o ciclo como um giro em quatro fases, como o Business Cycle Tracer do instituto de estatística holandês e o Business Cycle Clock do Eurostat e da OCDE."],
    referencias: [REF.tracer],
  };
}
