/**
 * Hiato do produto (Análises, item 5). Funções puras.
 *
 * O hiato não é observável: é a distância, em %, entre o PIB e uma tendência estimada.
 * Três estimativas, porque cada método erra de um jeito:
 * - HP (λ = 1600) com a amostra inteira: padrão da literatura, mas revisa o passado e
 *   tem problema de ponta (o último trimestre puxa a tendência);
 * - HP só com o que existia em cada data (unilateral): o que se via em tempo real;
 * - Hamilton (2018): resíduo da regressão do PIB 8 trimestres à frente nos 4 últimos
 *   valores conhecidos; sem problema de ponta, mas perde os primeiros 11 trimestres.
 * Tudo sobre 100 × ln(PIB com ajuste sazonal): o hiato sai em % do PIB tendencial.
 */
import type { Ponto } from "./transform";

export const LAMBDA_TRIMESTRAL = 1600;
export const HAMILTON_H = 8;
export const HAMILTON_P = 4;
/** Mínimo de trimestres para o HP unilateral começar (antes disso a tendência é só a média). */
export const HP_MINIMO = 20;

export type MetodoHiato = "hp" | "hpTempoReal" | "hamilton";
export const METODOS_HIATO: { id: MetodoHiato; rotulo: string }[] = [
  { id: "hp", rotulo: "HP, amostra inteira" },
  { id: "hpTempoReal", rotulo: "HP, tempo real" },
  { id: "hamilton", rotulo: "Hamilton" },
];

/** Resolve A x = b por eliminação de Gauss com pivoteamento parcial (A pequena e densa). */
export function resolver(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((linha, i) => [...linha, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    if (Math.abs(M[piv][c]) < 1e-12) throw new Error("sistema singular");
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      if (f === 0) continue;
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
    x[r] = s / M[r][r];
  }
  return x;
}

/**
 * Tendência do filtro HP: minimiza Σ(y − τ)² + λ Σ(Δ²τ)², isto é, (I + λ D'D) τ = y,
 * com D a matriz de segundas diferenças. Sistema pentadiagonal, resolvido em banda.
 */
export function tendenciaHP(y: number[], lambda = LAMBDA_TRIMESTRAL): number[] {
  const n = y.length;
  if (n < 3) return [...y];
  // Coeficientes de D'D por linha (banda de largura 2 de cada lado).
  const A: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let k = 0; k < n - 2; k++) {
    const d = [1, -2, 1];
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) A[k + a][k + b] += lambda * d[a] * d[b];
  }
  for (let i = 0; i < n; i++) A[i][i] += 1;
  return resolverBanda(A, y, 2);
}

/** Eliminação de Gauss sem pivoteamento para matriz em banda simétrica positiva definida. */
function resolverBanda(A: number[][], b: number[], banda: number): number[] {
  const n = b.length;
  const M = A.map((l) => [...l]);
  const v = [...b];
  for (let c = 0; c < n; c++) {
    for (let r = c + 1; r <= Math.min(n - 1, c + banda); r++) {
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= Math.min(n - 1, c + banda); k++) M[r][k] -= f * M[c][k];
      v[r] -= f * v[c];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = v[r];
    for (let k = r + 1; k <= Math.min(n - 1, r + banda); k++) s -= M[r][k] * x[k];
    x[r] = s / M[r][r];
  }
  return x;
}

const emLog = (pib: Ponto[]) => pib.map((p) => 100 * Math.log(p.valor));

export function hiatoHP(pib: Ponto[], lambda = LAMBDA_TRIMESTRAL): Ponto[] {
  const y = emLog(pib);
  const t = tendenciaHP(y, lambda);
  return pib.map((p, i) => ({ data: p.data, valor: y[i] - t[i] }));
}

/** HP unilateral: para cada trimestre, o filtro só com os dados até ele; fica o último ponto. */
export function hiatoHPTempoReal(pib: Ponto[], lambda = LAMBDA_TRIMESTRAL, minimo = HP_MINIMO): Ponto[] {
  const y = emLog(pib);
  const out: Ponto[] = [];
  for (let i = minimo - 1; i < y.length; i++) {
    const t = tendenciaHP(y.slice(0, i + 1), lambda);
    out.push({ data: pib[i].data, valor: y[i] - t[i] });
  }
  return out;
}

/** Mínimos quadrados: coeficientes de y = X β. */
export function mqo(X: number[][], y: number[]): number[] {
  const k = X[0].length;
  const XtX = Array.from({ length: k }, (_, a) => Array.from({ length: k }, (_, b) => X.reduce((s, l) => s + l[a] * l[b], 0)));
  const Xty = Array.from({ length: k }, (_, a) => X.reduce((s, l, i) => s + l[a] * y[i], 0));
  return resolver(XtX, Xty);
}

/**
 * Hamilton (2018): y(t+h) = β0 + β1 y(t) + … + βp y(t−p+1) + v(t+h); o hiato em t+h é v(t+h).
 * Regressão com a amostra inteira.
 */
export function hiatoHamilton(pib: Ponto[], h = HAMILTON_H, p = HAMILTON_P): Ponto[] {
  const y = emLog(pib);
  const linhas: { x: number[]; y: number; i: number }[] = [];
  for (let t = p - 1; t + h < y.length; t++) {
    linhas.push({ x: [1, ...Array.from({ length: p }, (_, j) => y[t - j])], y: y[t + h], i: t + h });
  }
  if (linhas.length <= p + 1) return [];
  const beta = mqo(linhas.map((l) => l.x), linhas.map((l) => l.y));
  return linhas.map((l) => ({ data: pib[l.i].data, valor: l.y - l.x.reduce((s, x, j) => s + x * beta[j], 0) }));
}

export type LinhaHiato = { data: string; hp: number | null; hpTempoReal: number | null; hamilton: number | null };

/** As três estimativas na mesma tabela, por trimestre. */
export function hiatos(pib: Ponto[]): LinhaHiato[] {
  const ordenado = [...pib].sort((a, b) => a.data.localeCompare(b.data));
  const mapa = (s: Ponto[]) => new Map(s.map((p) => [p.data, p.valor]));
  const [hp, tr, ham] = [hiatoHP(ordenado), hiatoHPTempoReal(ordenado), hiatoHamilton(ordenado)].map(mapa);
  return ordenado.map((p) => ({
    data: p.data, hp: hp.get(p.data) ?? null, hpTempoReal: tr.get(p.data) ?? null, hamilton: ham.get(p.data) ?? null,
  }));
}
