/**
 * Resumo do topo de cada aba (Fase 6b): fichas dos indicadores principais e "o que mais
 * mudou". Funções puras; a página só exibe.
 */
import type { ItemResumo, Painel } from "./config";
import { lerTrajetoria, type Direcao } from "./leitura";
import { aplicar, rotulo, type IdTransformacao, type Ponto, type TipoSerie } from "./transform";

export type FichaResumo = {
  item: ItemResumo; medida: string;
  ultimo: Ponto | null; anterior: Ponto | null; delta: number | null; emPontos: boolean;
  minicurva: Ponto[]; curto: Direcao | null; medio: Direcao | null;
};

/** A medida mostrada é taxa/percentual (Δ em p.p.) ou nível (Δ em %)? */
export function medidaEmPontos(transf: IdTransformacao, tipo: TipoSerie, unidade: string): boolean {
  return transf !== "nivel" || tipo === "Taxa" || tipo === "Var % mensal" || /%/.test(unidade);
}

const variacao = (a: number, b: number, emPontos: boolean) => (emPontos ? a - b : b ? (a / b - 1) * 100 : NaN);

export function fichaResumo(item: ItemResumo, dados: Ponto[]): FichaResumo {
  const serie = aplicar(item.transformacao, dados, item.tipo, item.frequencia);
  const emPontos = medidaEmPontos(item.transformacao, item.tipo, item.unidade);
  const ultimo = serie.at(-1) ?? null, anterior = serie.at(-2) ?? null;
  const d = ultimo && anterior ? variacao(ultimo.valor, anterior.valor, emPontos) : null;
  const l = lerTrajetoria(serie, emPontos, item.frequencia);
  const corte = ultimo ? `${Number(ultimo.data.slice(0, 4)) - 2}${ultimo.data.slice(4)}` : "";
  return {
    item, medida: rotulo(item.transformacao, item.tipo), ultimo, anterior,
    delta: d !== null && Number.isFinite(d) ? d : null, emPontos,
    minicurva: serie.filter((p) => p.data > corte), curto: l?.curto?.direcao ?? null, medio: l?.medio?.direcao ?? null,
  };
}

export type Mudanca = {
  painelId: string; titulo: string; rotulo: string; medida: string; frequencia: string;
  ultimo: Ponto; delta: number; emPontos: boolean; tipico: number; razao: number;
};

function mediana(xs: number[]): number {
  const a = [...xs].sort((x, y) => x - y);
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

/**
 * Para cada painel, o último movimento (de um período para o seguinte) da medida padrão
 * da primeira série, dividido pelo movimento típico (mediana dos |Δ| nos últimos 10 anos).
 * Devolve os `n` maiores, só entre dados recentes (até `diasMax` antes de `hoje`).
 */
export function maioresMudancas(paineis: Painel[], dados: Record<string, Ponto[]>, hoje: string, n = 3, diasMax = 120): Mudanca[] {
  const out: Mudanca[] = [];
  for (const p of paineis) {
    if (p.eventos || !p.series.length || !p.id) continue;
    const s = p.series[0];
    const transf = p.combinado ? p.combinado.linha : p.transformacao;
    const serie = aplicar(transf, dados[s.dado] ?? [], s.tipo, s.frequencia);
    if (serie.length < 25) continue;
    const ultimo = serie.at(-1)!;
    if ((Date.parse(hoje) - Date.parse(ultimo.data)) / 86_400_000 > diasMax) continue;
    const emPontos = medidaEmPontos(transf, s.tipo, s.unidade);
    const inicio = `${Number(ultimo.data.slice(0, 4)) - 10}${ultimo.data.slice(4)}`;
    const deltas: number[] = [];
    for (let i = 1; i < serie.length; i++)
      if (serie[i].data > inicio) deltas.push(variacao(serie[i].valor, serie[i - 1].valor, emPontos));
    const validos = deltas.filter(Number.isFinite);
    const tipico = mediana(validos.map(Math.abs));
    const delta = validos.at(-1);
    if (!tipico || delta === undefined) continue;
    out.push({ painelId: p.id, titulo: p.titulo, rotulo: s.rotulo, medida: rotulo(transf, s.tipo), frequencia: s.frequencia,
      ultimo, delta, emPontos, tipico, razao: Math.abs(delta) / tipico });
  }
  return out.sort((a, b) => b.razao - a.razao).slice(0, n);
}
