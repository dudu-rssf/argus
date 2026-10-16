/**
 * Central (tela inicial): monta a faixa de mercado, o resumo das análises e as últimas
 * divulgações a partir das séries do banco. Funções puras; a página só exibe.
 */
import { SERIES_CICLOS } from "./analises";
import { decisoes, valorAte } from "./ciclos";
import type { Aba } from "./config";
import { resolverPainel } from "./config";
import { lerTrajetoria, type Direcao } from "./leitura";
import { aplicar, type Ponto } from "./transform";

// ---------------------------------------------------------------- faixa de mercado

export const SERIES_MERCADO = {
  selic: SERIES_CICLOS.selic,
  dolar: SERIES_CICLOS.dolar,
  ibov: SERIES_CICLOS.ibov,
  ipca12: SERIES_CICLOS.ipca12,
  focus12: SERIES_CICLOS.focus12,
  juroReal: SERIES_CICLOS.juroReal,
} as const;

export type Comparacao = "decisao" | "diaAnterior" | "mesAnterior" | "quatroSemanas";

export type Ficha = {
  id: keyof typeof SERIES_MERCADO; rotulo: string; unidade: string; casas: number; frequencia: string;
  ultimo: Ponto | null;
  delta: number | null; deltaUnidade: "%" | "p.p." | "bps"; referencia: Ponto | null; comparacao: Comparacao;
};

const DEF: Omit<Ficha, "ultimo" | "delta" | "referencia">[] = [
  { id: "selic", rotulo: "Selic meta", unidade: "% a.a.", casas: 2, frequencia: "Diária", deltaUnidade: "bps", comparacao: "decisao" },
  { id: "dolar", rotulo: "Dólar", unidade: "R$/US$", casas: 4, frequencia: "Diária", deltaUnidade: "%", comparacao: "diaAnterior" },
  { id: "ibov", rotulo: "Ibovespa", unidade: "pontos", casas: 0, frequencia: "Diária", deltaUnidade: "%", comparacao: "diaAnterior" },
  { id: "ipca12", rotulo: "IPCA 12 meses", unidade: "%", casas: 2, frequencia: "Mensal", deltaUnidade: "p.p.", comparacao: "mesAnterior" },
  { id: "focus12", rotulo: "Focus IPCA 12m à frente", unidade: "%", casas: 2, frequencia: "Diária", deltaUnidade: "p.p.", comparacao: "quatroSemanas" },
  { id: "juroReal", rotulo: "Juro real ex-ante", unidade: "% a.a.", casas: 2, frequencia: "Diária", deltaUnidade: "p.p.", comparacao: "quatroSemanas" },
];

const menosDias = (data: string, dias: number) => new Date(Date.parse(data) - dias * 86_400_000).toISOString().slice(0, 10);

export function ficha(def: (typeof DEF)[number], serie: Ponto[]): Ficha {
  const ultimo = serie.at(-1) ?? null;
  let referencia: Ponto | null = null, delta: number | null = null;
  if (ultimo) {
    if (def.comparacao === "decisao") {
      const d = decisoes(serie).at(-1);
      if (d) { referencia = { data: d.data, valor: d.de }; delta = Math.round((d.para - d.de) * 100); }
    } else {
      referencia = def.comparacao === "diaAnterior" ? serie.at(-2) ?? null
        : def.comparacao === "mesAnterior" ? valorAte(serie, menosDias(ultimo.data, 1), 45)
        : valorAte(serie, menosDias(ultimo.data, 28), 10);
      if (referencia) delta = def.deltaUnidade === "%"
        ? (referencia.valor ? (ultimo.valor / referencia.valor - 1) * 100 : null)
        : ultimo.valor - referencia.valor;
    }
  }
  return { ...def, ultimo, delta, referencia };
}

export function faixaMercado(dados: Record<string, Ponto[]>): Ficha[] {
  return DEF.map((d) => ficha(d, dados[SERIES_MERCADO[d.id]] ?? []));
}

// ---------------------------------------------------------------- direções

export type DirecaoResumo = { id: string; rotulo: string; curto: Direcao | null; medio: Direcao | null; ultimo: Ponto | null; frequencia: string };

export function direcoes(dados: Record<string, Ponto[]>): DirecaoResumo[] {
  const itens = [
    { id: "ipca12", rotulo: "Inflação (IPCA 12 meses)", serie: dados[SERIES_CICLOS.ipca12] ?? [], frequencia: "Mensal" },
    { id: "ibc", rotulo: "Atividade (IBC-Br, var. 12 meses)", serie: aplicar("yoy", dados[SERIES_CICLOS.ibc] ?? [], "Índice", "Mensal"), frequencia: "Mensal" },
    { id: "desocupacao", rotulo: "Desocupação", serie: dados[SERIES_CICLOS.desocupacao] ?? [], frequencia: "Mensal" },
  ];
  return itens.map(({ id, rotulo, serie, frequencia }) => {
    const l = lerTrajetoria(serie, true, frequencia);
    return { id, rotulo, frequencia, ultimo: l?.ultimo ?? null, curto: l?.curto?.direcao ?? null, medio: l?.medio?.direcao ?? null };
  });
}

// ---------------------------------------------------------------- últimas divulgações

export type SerieDivulgada = { dado: string; aba: string; abaId: string; painel: string; rotulo: string; unidade: string; frequencia: string; tipo: string };

const ehDiaria = (f: string) => /di[áa]ria|semanal|cont[íi]nua/i.test(f);

/** Séries das abas que têm "divulgação" (mensais, trimestrais, anuais); diárias ficam na faixa de mercado. */
export function seriesDivulgadas(abas: Aba[], ano: number): SerieDivulgada[] {
  const vistos = new Map<string, SerieDivulgada>();
  for (const a of abas) for (const p0 of a.paineis) {
    const p = resolverPainel(p0, ano);
    for (const s of p.series) {
      if (ehDiaria(s.frequencia) || vistos.has(s.dado)) continue;
      vistos.set(s.dado, { dado: s.dado, aba: a.titulo, abaId: a.id, painel: p.titulo, rotulo: s.rotulo, unidade: s.unidade, frequencia: s.frequencia, tipo: s.tipo });
    }
  }
  return [...vistos.values()];
}
