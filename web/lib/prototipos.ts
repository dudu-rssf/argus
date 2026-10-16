/**
 * Protótipos de aba digerida (Fase 6c), na Inflação: as medidas, os fatos e as frases.
 * Cada medida é uma série do catálogo numa transformação fixa. Funções puras.
 */
import { catalogo, resolverAno, type SerieDoPainel } from "./config";
export { painelDe } from "./painel-de";
import { calcularFatos, frase, type Fatos } from "./fatos";
import { aplicar, type IdTransformacao, type Ponto, type TipoSerie } from "./transform";

export type Grupo = "Cheio" | "Abertura" | "Inflação de fundo" | "Expectativas" | "Atacado";

type DefMedida = {
  id: string; grupo: Grupo; rotulo: string; dado: string; transf: IdTransformacao;
  tipo?: TipoSerie; meta?: boolean; mapa?: boolean;
};

export const META = "BR-134:13521";

export const MEDIDAS_INFLACAO: DefMedida[] = [
  { id: "ipca12", grupo: "Cheio", rotulo: "IPCA 12 meses", dado: "BR-026:13522", transf: "nivel", meta: true, mapa: true },
  { id: "ipcames", grupo: "Cheio", rotulo: "IPCA no mês", dado: "BR-025:433", transf: "nivel" },
  { id: "servicos", grupo: "Abertura", rotulo: "Serviços", dado: "BR-037:10844", transf: "acum12", meta: true, mapa: true },
  { id: "industriais", grupo: "Abertura", rotulo: "Bens industriais", dado: "BR-038:27863", transf: "acum12", meta: true, mapa: true },
  { id: "alimentos", grupo: "Abertura", rotulo: "Alimentação no domicílio", dado: "BR-038:27864", transf: "acum12", meta: true, mapa: true },
  { id: "livres", grupo: "Abertura", rotulo: "Preços livres", dado: "BR-035:11428", transf: "acum12", meta: true, mapa: true },
  { id: "monitorados", grupo: "Abertura", rotulo: "Monitorados", dado: "BR-036:4449", transf: "acum12", meta: true, mapa: true },
  { id: "nucleos", grupo: "Inflação de fundo", rotulo: "Média dos 5 núcleos", dado: "BR-127:derivado", transf: "acum12", tipo: "Var % mensal", meta: true, mapa: true },
  { id: "p50", grupo: "Inflação de fundo", rotulo: "Mediana ponderada (P50)", dado: "BR-128:derivado", transf: "acum12", tipo: "Var % mensal", meta: true, mapa: true },
  { id: "servsub", grupo: "Inflação de fundo", rotulo: "Serviços subjacentes", dado: "BR-042:29683", transf: "acum12", meta: true, mapa: true },
  { id: "indsub", grupo: "Inflação de fundo", rotulo: "Industriais subjacentes", dado: "BR-129:29684", transf: "acum12", meta: true, mapa: true },
  { id: "difusao", grupo: "Inflação de fundo", rotulo: "Difusão", dado: "BR-040:21379", transf: "nivel" },
  { id: "focus12", grupo: "Expectativas", rotulo: "Focus 12 meses à frente", dado: "BR-047:ExpectativasMercadoInflacao12Meses · Indicador='IPCA'", transf: "nivel", meta: true, mapa: true },
  { id: "focusano1", grupo: "Expectativas", rotulo: "Focus para {ano+1}", dado: "BR-046:ExpectativasMercadoAnuais · Indicador='IPCA'@{ano+1}", transf: "nivel", meta: true },
  { id: "igpm", grupo: "Atacado", rotulo: "IGP-M 12 meses", dado: "BR-043:189", transf: "acum12" },
];

export type Medida = {
  id: string; grupo: Grupo; rotulo: string; transf: IdTransformacao; serieDoPainel: SerieDoPainel;
  serie: Ponto[]; fatos: Fatos | null; frase: string | null; mapa: boolean;
};

export function medidas(defs: DefMedida[], dados: Record<string, Ponto[]>, ano: number): Medida[] {
  const cat = catalogo();
  const meta = dados[META] ?? [];
  return defs.map((d) => {
    const dado = resolverAno(d.dado, ano);
    const rotulo = resolverAno(d.rotulo, ano);
    const c = cat[dado.split(":")[0]];
    const tipo = (d.tipo ?? c?.tipo ?? "Taxa") as TipoSerie;
    const serieDoPainel: SerieDoPainel = {
      dado, serie: c?.id ?? dado, rotulo, tipo, frequencia: c?.frequencia ?? "Mensal", unidade: c?.unidade ?? "%",
      fonte: c?.fonte ?? "", codigo: c?.codigo ?? "", indicador: c?.indicador, observacao: c?.observacao,
    };
    const serie = aplicar(d.transf, dados[dado] ?? [], tipo, serieDoPainel.frequencia);
    const emPontos = true; // todas as medidas da Inflação são taxas ou variações em %
    const fatos = calcularFatos(serie, { emPontos, frequencia: serieDoPainel.frequencia, meta: d.meta ? meta : undefined });
    return {
      id: d.id, grupo: d.grupo, rotulo, transf: d.transf, serieDoPainel, serie, fatos, mapa: !!d.mapa,
      frase: fatos ? frase(rotulo, fatos, { unidade: "%", frequencia: serieDoPainel.frequencia }) : null,
    };
  });
}

// ---------------------------------------------------------------- mapa (protótipo D)

export type PontoMapa = { data: string; x: number; y: number };

/** Rastro dos últimos `meses` meses: x = valor − meta do ano; y = Δ em 3 meses (p.p.). */
export function rastro(m: Medida, meta: Ponto[], meses = 6): PontoMapa[] {
  const s = m.serie;
  if (!s.length) return [];
  const diaria = /di[áa]ria|semanal|cont[íi]nua/i.test(m.serieDoPainel.frequencia);
  // Diárias: um ponto por fim de mês.
  const base = diaria ? fimDeMes(s) : s;
  const out: PontoMapa[] = [];
  for (let i = Math.max(3, base.length - 1 - meses); i < base.length; i++) {
    const p = base[i], antes = base[i - 3];
    const mesesDif = (Number(p.data.slice(0, 4)) - Number(antes.data.slice(0, 4))) * 12 + Number(p.data.slice(5, 7)) - Number(antes.data.slice(5, 7));
    if (mesesDif !== 3) continue;
    const ano = p.data.slice(0, 4);
    const mt = [...meta].reverse().find((x) => x.data.slice(0, 4) <= ano);
    if (!mt) continue;
    out.push({ data: p.data, x: p.valor - mt.valor, y: p.valor - antes.valor });
  }
  return out;
}

function fimDeMes(s: Ponto[]): Ponto[] {
  const porMes = new Map<string, Ponto>();
  for (const p of s) porMes.set(p.data.slice(0, 7), { data: `${p.data.slice(0, 7)}-01`, valor: p.valor });
  return [...porMes.values()];
}

export type Quadrante = "acima-subindo" | "acima-caindo" | "abaixo-caindo" | "abaixo-subindo";
export const NOME_QUADRANTE: Record<Quadrante, string> = {
  "acima-subindo": "Acima da meta e subindo",
  "acima-caindo": "Acima da meta e caindo",
  "abaixo-caindo": "Abaixo da meta e caindo",
  "abaixo-subindo": "Abaixo da meta e subindo",
};
export const quadrante = (p: PontoMapa): Quadrante =>
  p.x >= 0 ? (p.y >= 0 ? "acima-subindo" : "acima-caindo") : (p.y < 0 ? "abaixo-caindo" : "abaixo-subindo");
