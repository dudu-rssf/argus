/**
 * Leitura de trajetória (decisão 0013): curto (3 meses), médio (12 meses) e longo
 * (posição nos últimos 10 anos) da medida que o gráfico mostra. Regra fixa e neutra:
 * diz para onde o dado foi e onde ele está na própria história, nunca se isso é bom ou ruim.
 */
import type { Ponto } from "./transform";

export type Direcao = "subiu" | "caiu" | "estavel";
export type Movimento = { direcao: Direcao; delta: number; referencia: Ponto };
export type Leitura = {
  ultimo: Ponto;
  emPontos: boolean; // true: Δ em pontos (p.p. ou unidade da série); false: Δ em %
  curto: Movimento | null;
  medio: Movimento | null;
  longo: { percentil: number; media: number; anos: number } | null;
};

const MESES_CURTO = 3;
const MESES_MEDIO = 12;
const ANOS_LONGO = 10;
const FRACAO_ESTAVEL = 0.25; // |Δ| abaixo de 1/4 do Δ típico (mediana dos |Δ| históricos) = estável
const MIN_HISTORICO = 24;

function mesesAntes(data: string, meses: number): string {
  const total = Number(data.slice(0, 4)) * 12 + Number(data.slice(5, 7)) - 1 - meses;
  const ano = Math.floor(total / 12);
  const mes = (total % 12) + 1;
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  return `${ano}-${String(mes).padStart(2, "0")}-${String(Math.min(Number(data.slice(8, 10)), ultimo)).padStart(2, "0")}`;
}

/** Último ponto até a data, aceitando no máximo `folgaDias` de distância. */
function ate(serie: Ponto[], data: string, folgaDias: number): Ponto | null {
  let lo = 0, hi = serie.length - 1, achado = -1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    if (serie[m].data <= data) { achado = m; lo = m + 1; } else hi = m - 1;
  }
  if (achado < 0) return null;
  const dias = (Date.parse(data) - Date.parse(serie[achado].data)) / 86_400_000;
  return dias <= folgaDias ? serie[achado] : null;
}

/** Tamanho típico de um movimento: mediana dos |Δ| (não se distorce com crises). */
function tipico(xs: number[]): number {
  const a = xs.map(Math.abs).sort((x, y) => x - y);
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

function variacao(atual: number, antes: number, emPontos: boolean): number {
  return emPontos ? atual - antes : (atual / antes - 1) * 100;
}

function movimento(serie: Ponto[], meses: number, emPontos: boolean, folgaDias: number): Movimento | null {
  const ultimo = serie[serie.length - 1];
  const ref = ate(serie, mesesAntes(ultimo.data, meses), folgaDias);
  if (!ref || (!emPontos && ref.valor === 0)) return null;
  const delta = variacao(ultimo.valor, ref.valor, emPontos);

  // Escala de "estável": Δ típico do mesmo horizonte nos últimos 10 anos.
  const inicio = mesesAntes(ultimo.data, ANOS_LONGO * 12);
  const historico: number[] = [];
  for (const p of serie) {
    if (p.data < inicio) continue;
    const r = ate(serie, mesesAntes(p.data, meses), folgaDias);
    if (r && (emPontos || r.valor !== 0)) historico.push(variacao(p.valor, r.valor, emPontos));
  }
  const limite = historico.length >= MIN_HISTORICO ? FRACAO_ESTAVEL * tipico(historico) : 0;
  const direcao: Direcao = Math.abs(delta) <= limite ? "estavel" : delta > 0 ? "subiu" : "caiu";
  return { direcao, delta, referencia: ref };
}

/**
 * @param serie a série já transformada, como aparece no gráfico (ordenada por data)
 * @param emPontos true quando a medida é taxa/percentual (Δ em pontos); false para níveis (Δ em %)
 * @param frequencia frequência da série original (define a folga ao procurar a data de comparação)
 */
export function lerTrajetoria(serie: Ponto[], emPontos: boolean, frequencia: string): Leitura | null {
  if (!serie.length) return null;
  const diaria = /di[áa]ria|semanal|cont[íi]nua/i.test(frequencia);
  const folga = diaria ? 7 : 0;
  const ultimo = serie[serie.length - 1];

  const inicio = mesesAntes(ultimo.data, ANOS_LONGO * 12);
  const janela = serie.filter((p) => p.data > inicio).map((p) => p.valor);
  const anos = (Date.parse(ultimo.data) - Date.parse(serie.find((p) => p.data > inicio)!.data)) / (365.25 * 86_400_000);
  const longo = janela.length >= MIN_HISTORICO
    ? {
        percentil: Math.round((janela.filter((v) => v <= ultimo.valor).length / janela.length) * 100),
        media: janela.reduce((s, v) => s + v, 0) / janela.length,
        anos: Math.round(anos),
      }
    : null;

  return {
    ultimo, emPontos,
    curto: movimento(serie, MESES_CURTO, emPontos, folga),
    medio: movimento(serie, MESES_MEDIO, emPontos, folga),
    longo,
  };
}
