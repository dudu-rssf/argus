/**
 * Transformações de séries (plano.md, "Motor de gráfico"). Funções puras:
 * recebem pontos ordenados por data e devolvem pontos novos. Nenhuma inventa valor:
 * se falta o período de comparação, o ponto simplesmente não sai.
 */

export type Ponto = { data: string; valor: number }; // data ISO AAAA-MM-DD

export type TipoSerie = "Índice" | "Var % mensal" | "Taxa" | "Fluxo" | "Estoque" | "Derivado";

export type IdTransformacao =
  | "nivel" | "mom" | "qoq" | "yoy"
  | "acum3" | "acum6" | "acum12"
  | "anual3" | "anual6"
  | "dpp1" | "dpp3" | "dpp12"
  | "soma3" | "soma12";

export const ROTULOS: Record<IdTransformacao, string> = {
  nivel: "Nível",
  mom: "Var. mensal (%)",
  qoq: "Var. trimestral (%)",
  yoy: "Var. em 12 meses (%)",
  acum3: "Acumulado 3 meses (%)",
  acum6: "Acumulado 6 meses (%)",
  acum12: "Acumulado 12 meses (%)",
  anual3: "3 meses anualizado (%)",
  anual6: "6 meses anualizado (%)",
  dpp1: "Δ p.p. em 1 mês",
  dpp3: "Δ p.p. em 3 meses",
  dpp12: "Δ p.p. em 12 meses",
  soma3: "Soma 3 meses",
  soma12: "Soma 12 meses",
};

/** Transformações válidas por tipo de série. Trimestrais trocam MoM por QoQ. */
export function transformacoesValidas(tipo: TipoSerie, frequencia: string): IdTransformacao[] {
  const trimestral = ehTrimestral(frequencia);
  switch (tipo) {
    case "Índice":
      return trimestral
        ? ["nivel", "qoq", "yoy", "acum12", "anual6"]
        : ["nivel", "mom", "yoy", "acum3", "acum6", "acum12", "anual3", "anual6"];
    case "Var % mensal":
      return ["nivel", "acum3", "acum6", "acum12", "anual3", "anual6"];
    case "Taxa":
      return ["nivel", "dpp1", "dpp3", "dpp12"];
    case "Fluxo":
      return ["nivel", "soma3", "soma12", "yoy"];
    case "Estoque":
      return ["nivel", "mom", "yoy"];
    default:
      return ["nivel"];
  }
}

// ---------------------------------------------------------------- datas

const ehTrimestral = (f: string) => /trimestral/i.test(f) && !/m[óo]vel/i.test(f);
const ehDiaria = (f: string) => /di[áa]ria|semanal|cont[íi]nua/i.test(f);

/** Índice do mês (ano*12 + mês-1) a partir da data ISO. */
function mesAbs(data: string): number {
  return Number(data.slice(0, 4)) * 12 + Number(data.slice(5, 7)) - 1;
}

function deslocarMeses(data: string, meses: number): string {
  const total = mesAbs(data) + meses;
  const ano = Math.floor(total / 12);
  const mes = (total % 12) + 1;
  const diaOriginal = Number(data.slice(8, 10));
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const dia = Math.min(diaOriginal, ultimo);
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

/**
 * Valor de comparação `meses` antes de cada ponto. Séries mensais e trimestrais
 * exigem a data exata; diárias usam o último valor até a data, com no máximo
 * 7 dias de distância (feriados e fins de semana).
 */
function comparar(
  serie: Ponto[], meses: number, frequencia: string,
  f: (atual: number, antes: number) => number,
): Ponto[] {
  const out: Ponto[] = [];
  if (!ehDiaria(frequencia)) {
    const mapa = new Map(serie.map((p) => [p.data, p.valor]));
    for (const p of serie) {
      const antes = mapa.get(deslocarMeses(p.data, -meses));
      if (antes !== undefined) out.push({ data: p.data, valor: f(p.valor, antes) });
    }
    return out;
  }
  let j = 0;
  for (const p of serie) {
    const alvo = deslocarMeses(p.data, -meses);
    while (j + 1 < serie.length && serie[j + 1].data <= alvo) j++;
    const ref = serie[j];
    if (ref && ref.data <= alvo && diasEntre(ref.data, alvo) <= 7)
      out.push({ data: p.data, valor: f(p.valor, ref.valor) });
  }
  return out;
}

/** Janelas de `n` meses consecutivos terminando em cada ponto (passo de 1 mês). */
function janelas(serie: Ponto[], n: number): { fim: Ponto; itens: Ponto[] }[] {
  const out = [];
  for (let i = n - 1; i < serie.length; i++) {
    const itens = serie.slice(i - n + 1, i + 1);
    if (mesAbs(itens[n - 1].data) - mesAbs(itens[0].data) === n - 1) out.push({ fim: serie[i], itens });
  }
  return out;
}

// ---------------------------------------------------------------- transformações

export const variacaoPct = (serie: Ponto[], meses: number, frequencia = "Mensal") =>
  comparar(serie, meses, frequencia, (a, b) => (a / b - 1) * 100);

export const deltaPP = (serie: Ponto[], meses: number, frequencia = "Mensal") =>
  comparar(serie, meses, frequencia, (a, b) => a - b);

/** Variação % mensal acumulada em n meses: encadeada, nunca somada. */
export function acumuladoEncadeado(serie: Ponto[], n: number): Ponto[] {
  return janelas(serie, n).map(({ fim, itens }) => ({
    data: fim.data,
    valor: (itens.reduce((acc, p) => acc * (1 + p.valor / 100), 1) - 1) * 100,
  }));
}

/** Índice: soma dos últimos n meses contra os mesmos n meses um ano antes (padrão IBGE). */
export function acumuladoIndice(serie: Ponto[], n: number): Ponto[] {
  const mapa = new Map(serie.map((p) => [p.data, p.valor]));
  const out: Ponto[] = [];
  for (const { fim, itens } of janelas(serie, n)) {
    const antes = itens.map((p) => mapa.get(deslocarMeses(p.data, -12)));
    if (antes.some((v) => v === undefined)) continue;
    const soma = itens.reduce((s, p) => s + p.valor, 0);
    const somaAntes = (antes as number[]).reduce((s, v) => s + v, 0);
    out.push({ data: fim.data, valor: (soma / somaAntes - 1) * 100 });
  }
  return out;
}

/** Ritmo de n meses levado a 12: índice compara níveis; var. % mensal encadeia. */
export function anualizado(serie: Ponto[], n: number, tipo: TipoSerie, frequencia = "Mensal"): Ponto[] {
  if (tipo === "Var % mensal")
    return acumuladoEncadeado(serie, n).map((p) => ({
      data: p.data, valor: (Math.pow(1 + p.valor / 100, 12 / n) - 1) * 100,
    }));
  return comparar(serie, n, frequencia, (a, b) => (Math.pow(a / b, 12 / n) - 1) * 100);
}

export function somaMovel(serie: Ponto[], n: number): Ponto[] {
  return janelas(serie, n).map(({ fim, itens }) => ({
    data: fim.data, valor: itens.reduce((s, p) => s + p.valor, 0),
  }));
}

export function aplicar(id: IdTransformacao, serie: Ponto[], tipo: TipoSerie, frequencia: string): Ponto[] {
  const trimestral = ehTrimestral(frequencia);
  switch (id) {
    case "nivel": return serie;
    case "mom": return variacaoPct(serie, 1, frequencia);
    case "qoq": return variacaoPct(serie, 3, frequencia);
    case "yoy": return variacaoPct(serie, 12, frequencia);
    case "acum3": case "acum6": case "acum12": {
      const n = Number(id.slice(4));
      if (tipo === "Var % mensal") return acumuladoEncadeado(serie, n);
      if (trimestral) return acumuladoTrimestral(serie, n / 3);
      return acumuladoIndice(serie, n);
    }
    case "anual3": case "anual6": return anualizado(serie, Number(id.slice(5)), tipo, frequencia);
    case "dpp1": return deltaPP(serie, 1, frequencia);
    case "dpp3": return deltaPP(serie, 3, frequencia);
    case "dpp12": return deltaPP(serie, 12, frequencia);
    case "soma3": return somaMovel(serie, 3);
    case "soma12": return somaMovel(serie, 12);
  }
}

/** Trimestral: soma dos últimos q trimestres contra os mesmos trimestres um ano antes. */
export function acumuladoTrimestral(serie: Ponto[], q: number): Ponto[] {
  const mapa = new Map(serie.map((p) => [p.data, p.valor]));
  const out: Ponto[] = [];
  for (let i = q - 1; i < serie.length; i++) {
    const itens = serie.slice(i - q + 1, i + 1);
    if (mesAbs(itens[q - 1].data) - mesAbs(itens[0].data) !== 3 * (q - 1)) continue;
    const antes = itens.map((p) => mapa.get(deslocarMeses(p.data, -12)));
    if (antes.some((v) => v === undefined)) continue;
    const soma = itens.reduce((acc, p) => acc + p.valor, 0);
    const somaAntes = (antes as number[]).reduce((acc, v) => acc + v, 0);
    out.push({ data: serie[i].data, valor: (soma / somaAntes - 1) * 100 });
  }
  return out;
}
