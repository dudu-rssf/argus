/**
 * Fatos por regra (decisão 0017): o que aconteceu com uma medida, sem julgamento.
 * Último valor, Δ de 1/3/12 meses, meses seguidos na mesma direção, percentil e média de
 * 10 anos, "maior/menor desde" (só acima de 12 meses) e distância da meta.
 * A frase é montada só desses fatos. Funções puras.
 */
import { valorAte } from "./ciclos";
import { fmtData, fmtNumero } from "./formato";
import { deltaPP, variacaoPct, type Ponto } from "./transform";

export type Fatos = {
  ultimo: Ponto; emPontos: boolean;
  d1: number | null; d3: number | null; d12: number | null;
  sequencia: { direcao: "subiu" | "caiu"; periodos: number } | null;
  percentil: number | null; media: number | null; anos: number | null; // anos de histórico no percentil (até 10)
  extremo: { tipo: "maior" | "menor"; desde: string | null } | null; // desde null = da série inteira
  meta: number | null; vsMeta: number | null;
  tipico3: number | null; // mediana dos |Δ3| em 10 anos (escala para "relevância")
  relevancia: number;
};

type Opcoes = { emPontos: boolean; frequencia: string; meta?: Ponto[] };

const ehDiaria = (f: string) => /di[áa]ria|semanal|cont[íi]nua/i.test(f);
const mesesEntre = (a: string, b: string) =>
  (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(a.slice(5, 7));

function mediana(xs: number[]): number | null {
  if (!xs.length) return null;
  const a = [...xs].sort((x, y) => x - y);
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

export function calcularFatos(serie: Ponto[], o: Opcoes): Fatos | null {
  if (!serie.length) return null;
  const ultimo = serie[serie.length - 1];
  const comparar = (k: number) => (o.emPontos ? deltaPP : variacaoPct)(serie, k, o.frequencia);
  const ultimoDe = (s: Ponto[]) => (s.at(-1)?.data === ultimo.data ? s.at(-1)!.valor : null);
  const s3 = comparar(3);

  // Meses (ou trimestres) seguidos na mesma direção, até o último dado. Diárias: não se aplica.
  let sequencia: Fatos["sequencia"] = null;
  if (!ehDiaria(o.frequencia) && serie.length > 2) {
    const sinal = Math.sign(ultimo.valor - serie[serie.length - 2].valor);
    let n = 0;
    for (let i = serie.length - 1; i > 0 && Math.sign(serie[i].valor - serie[i - 1].valor) === sinal && sinal !== 0; i--) n++;
    if (n >= 2) sequencia = { direcao: sinal > 0 ? "subiu" : "caiu", periodos: n };
  }

  // Últimos 10 anos: percentil, média e escala típica do Δ3.
  const inicio = `${Number(ultimo.data.slice(0, 4)) - 10}${ultimo.data.slice(4)}`;
  const janela = serie.filter((p) => p.data > inicio);
  const temHistorico = janela.length >= 24;
  const percentil = temHistorico ? Math.round((janela.filter((p) => p.valor <= ultimo.valor).length / janela.length) * 100) : null;
  const media = temHistorico ? janela.reduce((s, p) => s + p.valor, 0) / janela.length : null;
  const anos = temHistorico ? Math.max(1, Math.round(mesesEntre(janela[0].data, ultimo.data) / 12)) : null;
  const tipico3 = mediana(s3.filter((p) => p.data > inicio).map((p) => Math.abs(p.valor)));

  // "Maior/menor desde": o último ponto anterior que foi mais alto (ou mais baixo).
  let extremo: Fatos["extremo"] = null;
  if (serie.length > 12) {
    let iMaior = -1, iMenor = -1;
    for (let i = serie.length - 2; i >= 0 && (iMaior < 0 || iMenor < 0); i--) {
      if (iMaior < 0 && serie[i].valor > ultimo.valor) iMaior = i;
      if (iMenor < 0 && serie[i].valor < ultimo.valor) iMenor = i;
    }
    const longe = (i: number) => i < 0 ? mesesEntre(serie[0].data, ultimo.data) >= 12 : mesesEntre(serie[i].data, ultimo.data) >= 12;
    // Série parada (todos iguais) não é "maior" nem "menor": exige ter havido o outro lado.
    if (iMenor >= 0 && longe(iMaior) && (iMaior < 0 || iMaior < iMenor))
      extremo = { tipo: "maior", desde: iMaior < 0 ? null : serie[iMaior].data };
    else if (iMaior >= 0 && longe(iMenor) && (iMenor < 0 || iMenor < iMaior))
      extremo = { tipo: "menor", desde: iMenor < 0 ? null : serie[iMenor].data };
  }

  const m = o.meta ? valorAte(o.meta, ultimo.data, 400) : null;
  const d3 = ultimoDe(s3);
  const anosExtremo = extremo ? (extremo.desde ? mesesEntre(extremo.desde, ultimo.data) / 12 : 10) : 0;
  const relevancia = Math.max(
    d3 !== null && tipico3 ? Math.abs(d3) / tipico3 : 0,
    sequencia ? sequencia.periodos / 3 : 0,
    anosExtremo / 2,
  );
  return {
    ultimo, emPontos: o.emPontos,
    d1: ultimoDe(comparar(1)), d3, d12: ultimoDe(comparar(12)),
    sequencia, percentil, media, anos, extremo,
    meta: m?.valor ?? null, vsMeta: m ? ultimo.valor - m.valor : null,
    tipico3, relevancia,
  };
}

const num = (v: number, c = 2) => fmtNumero(Math.abs(v), c);

/** Frase descritiva montada só dos fatos (sem julgamento, causa ou previsão). */
export function frase(rotulo: string, f: Fatos, o: { unidade: string; frequencia: string; casas?: number }): string {
  const c = o.casas ?? 2;
  const u = o.unidade === "%" || /%/.test(o.unidade) ? "%" : ` ${o.unidade}`;
  const delta = (v: number) => (f.emPontos ? `${num(v)} p.p.` : `${num(v, 1)}%`);
  const tri = /trimestral/i.test(o.frequencia) && !/m[óo]vel/i.test(o.frequencia);
  const partes: string[] = [];
  let mov = "";
  if (f.d3 !== null) mov = f.d3 === 0 ? "estável em 3 meses" : `${f.d3 > 0 ? "subiu" : "caiu"} ${delta(f.d3)} em 3 meses`;
  if (f.sequencia) {
    const unid = tri ? "trimestre" : "mês";
    const seq = `${f.sequencia.periodos}º ${unid} seguido de ${f.sequencia.direcao === "subiu" ? "alta" : "queda"}`;
    mov = mov ? `${mov}, ${seq}` : seq;
  }
  if (mov) partes.push(mov);
  if (f.vsMeta !== null && f.meta !== null)
    partes.push(f.vsMeta === 0 ? `igual à meta (${fmtNumero(f.meta)}%)` : `${num(f.vsMeta)} p.p. ${f.vsMeta > 0 ? "acima" : "abaixo"} da meta (${fmtNumero(f.meta)}%)`);
  if (f.extremo) partes.push(`${f.extremo.tipo} ${f.extremo.desde ? `desde ${fmtData(f.extremo.desde, o.frequencia)}` : "da série"}`);
  else if (f.percentil !== null && (f.percentil >= 80 || f.percentil <= 20))
    partes.push(`${f.percentil >= 80 ? "acima" : "abaixo"} de ${f.percentil >= 80 ? f.percentil : 100 - f.percentil}% dos últimos ${f.anos ?? 10} anos`);
  const valor = `${rotulo} em ${fmtNumero(f.ultimo.valor, c)}${u}`;
  if (!partes.length) return `${valor}.`;
  return `${valor}: ${partes[0]}${partes.length > 1 ? "; " + partes.slice(1).join("; ") : ""}.`;
}
