/**
 * Seção Geral da aba Inflação (Fase 6d): relógio do ciclo, checklist, cabo de guerra e
 * períodos parecidos. Monta tudo a partir das séries do banco; a página só exibe.
 */
import { encontrarAnalogos, painelMensal } from "../analogos";
import { valorAte } from "../ciclos";
import { fmtData, fmtNumero } from "../formato";
import { aplicar, type Ponto } from "../transform";
import { caboDeGuerra, contribuicoes12m, type Grupo, type ItemCabo } from "./cabo";
import { mesesSeguidos, type ItemChecklist } from "./checklist";
import { relogio, type Relogio } from "./relogio";

const T7060 = "BR-041:t7060/v63,66/c315=all";
/** Grupos do IPCA (nível 1 da classificação 315), conferidos nos metadados oficiais da t7060. */
export const GRUPOS_IPCA = [
  { id: "7170", nome: "Alimentação e bebidas" }, { id: "7445", nome: "Habitação" },
  { id: "7486", nome: "Artigos de residência" }, { id: "7558", nome: "Vestuário" },
  { id: "7625", nome: "Transportes" }, { id: "7660", nome: "Saúde e cuidados pessoais" },
  { id: "7712", nome: "Despesas pessoais" }, { id: "7766", nome: "Educação" }, { id: "7786", nome: "Comunicação" },
];

export const SERIES_GERAL_INFLACAO = {
  ipca12: "BR-026:13522",
  ipcaMes: "BR-025:433",
  meta: "BR-134:13521",
  nucleos: "BR-127:derivado",
  servicos: "BR-037:10844",
  servsub: "BR-042:29683",
  difusao: "BR-040:21379",
  focus12: "BR-047:ExpectativasMercadoInflacao12Meses · Indicador='IPCA'",
  selic: "BR-050:432",
  ex0: "BR-031:11427", ex3: "BR-034:27839", ms: "BR-030:4466", dp: "BR-033:16122", p55: "BR-034:28750",
  ...Object.fromEntries(GRUPOS_IPCA.flatMap((g) => [[`var${g.id}`, `${T7060}@63.${g.id}`], [`peso${g.id}`, `${T7060}@66.${g.id}`]])),
} as Record<string, string>;

const NUCLEOS = [["ex0", "EX0"], ["ex3", "EX3"], ["ms", "MS"], ["dp", "DP"], ["p55", "P55"]] as const;

export type Parecido = {
  mes: string; semelhanca: number;
  entao: Record<string, number | null>; depois: Record<string, number | null>;
};
export type VariavelParecida = { id: string; rotulo: string; unidade: string };
export const VARIAVEIS_PARECIDAS: VariavelParecida[] = [
  { id: "ipca12", rotulo: "IPCA 12 meses", unidade: "%" },
  { id: "nucleos", rotulo: "Média dos núcleos 12m", unidade: "%" },
  { id: "servicos", rotulo: "Serviços 12m", unidade: "%" },
  { id: "focus12", rotulo: "Focus 12m", unidade: "%" },
  { id: "selic", rotulo: "Selic", unidade: "%" },
];

export type GeralInflacao = {
  relogio: Relogio | null;
  checklist: ItemChecklist[];
  cabo: { data: string | null; itens: ItemCabo[]; total: number; oficial: Ponto | null };
  parecidos: { atual: { mes: string; valores: Record<string, number | null> } | null; lista: Parecido[]; caiu: number; subiu: number; medianaIpca: number | null };
};

const sinal = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${fmtNumero(Math.abs(v))}`;
const delta3 = (s: Ponto[]) => {
  const u = s.at(-1);
  if (!u) return null;
  const a = valorAte(s, new Date(Date.parse(u.data) - 88 * 86_400_000).toISOString().slice(0, 10), 40);
  return a && a.data < u.data ? { atual: u, antes: a, d: u.valor - a.valor } : null;
};
const mover = (d: number) => (d > 0 ? `subiu ${fmtNumero(d)} p.p.` : d < 0 ? `caiu ${fmtNumero(-d)} p.p.` : "ficou estável");

export function geralInflacao(dados: Record<string, Ponto[]>, hoje: string): GeralInflacao {
  const s = (k: string) => dados[SERIES_GERAL_INFLACAO[k]] ?? [];
  const meta = s("meta");
  const metaEm = (data: string) => valorAte(meta, data, 400)?.valor ?? null;
  const ipca12 = s("ipca12");
  const acum = (k: string) => aplicar("acum12", s(k), "Var % mensal", "Mensal");

  // ---------------------------------------------------------------- checklist
  const checklist: ItemChecklist[] = [];
  const u = ipca12.at(-1);
  const m = u ? metaEm(u.data) : null;
  if (u && m !== null) {
    const n = mesesSeguidos(ipca12, (p) => { const mt = metaEm(p.data); return mt !== null && p.valor > mt; });
    const acima = u.valor > m;
    checklist.push({ pergunta: "O IPCA está acima da meta?", resposta: acima ? "Sim" : "Não",
      evidencia: `${fmtNumero(u.valor)}% em 12 meses (${fmtData(u.data)}) contra meta de ${fmtNumero(m)}%${acima && n > 1 ? `; acima há ${n} meses` : ""}.`,
      explica: "IPCA acumulado em 12 meses contra a meta do CMN do ano (SGS 13522 e 13521)." });
  } else checklist.push({ pergunta: "O IPCA está acima da meta?", resposta: "Sem dados", evidencia: "Sem IPCA ou meta no banco.", explica: "" });

  const dI = delta3(ipca12);
  const u6 = ipca12.at(-1), a6 = u6 ? valorAte(ipca12, new Date(Date.parse(u6.data) - 180 * 86_400_000).toISOString().slice(0, 10), 40) : null;
  const d6 = u6 && a6 && a6.data < u6.data ? u6.valor - a6.valor : null;
  const seq = mesesSeguidos(ipca12.slice(1).map((p, i) => ({ data: p.data, valor: p.valor - ipca12[i].valor })),
    (p) => Math.sign(p.valor) === Math.sign(dI?.d ?? 0) && p.valor !== 0);
  checklist.push(dI && d6 !== null ? {
    pergunta: "A inflação está acelerando?",
    resposta: dI.d > 0 && d6 > 0 ? "Sim" : dI.d <= 0 && d6 <= 0 ? "Não" : "Parcial",
    evidencia: `IPCA 12 meses ${mover(dI.d)} em 3 meses e ${mover(d6)} em 6 meses (${fmtNumero(dI.atual.valor)}% em ${fmtData(dI.atual.data)})${seq >= 2 ? `; ${seq}º mês seguido de ${dI.d > 0 ? "alta" : "queda"}` : ""}.`,
    explica: "Sim = o IPCA acumulado em 12 meses subiu em 3 e em 6 meses; Não = não subiu em nenhum dos dois; Parcial = os dois prazos discordam. O relógio do ciclo usa o prazo de 6 meses.",
  } : { pergunta: "A inflação está acelerando?", resposta: "Sem dados", evidencia: "Histórico insuficiente.", explica: "" });

  const dirNuc = NUCLEOS.map(([k, nome]) => ({ nome, d: delta3(acum(k))?.d ?? null })).filter((x) => x.d !== null);
  if (dI && dirNuc.length) {
    const iguais = dirNuc.filter((x) => Math.sign(x.d!) === Math.sign(dI.d));
    checklist.push({
      pergunta: "Os núcleos confirmam a direção do IPCA?",
      resposta: iguais.length === dirNuc.length ? "Sim" : iguais.length === 0 ? "Não" : "Parcial",
      evidencia: `IPCA ${dI.d > 0 ? "subiu" : "caiu"} em 3 meses; dos ${dirNuc.length} núcleos do Copom, ${dirNuc.filter((x) => x.d! < 0).length} caíram (${dirNuc.filter((x) => x.d! < 0).map((x) => x.nome).join(", ") || "nenhum"}) e ${dirNuc.filter((x) => x.d! > 0).length} subiram (${dirNuc.filter((x) => x.d! > 0).map((x) => x.nome).join(", ") || "nenhum"}).`,
      explica: "Núcleos tiram itens voláteis. Compara a direção em 3 meses de cada núcleo acumulado em 12 meses (EX0, EX3, MS, DP, P55) com a do IPCA.",
    });
  }

  const ss = acum("servsub"), dS = delta3(ss);
  if (dS) checklist.push({
    pergunta: "A inflação de serviços está cedendo?", resposta: dS.d < 0 ? "Sim" : "Não",
    evidencia: `Serviços subjacentes em ${fmtNumero(dS.atual.valor)}% em 12 meses; ${mover(dS.d)} em 3 meses.`,
    explica: "Serviços subjacentes (SGS 29683) é o núcleo de serviços mais olhado pelo Copom, porque reage a salários e à atividade.",
  });

  const dif = s("difusao");
  if (dif.length >= 36) {
    const ult3 = dif.slice(-3), media3 = ult3.reduce((a, p) => a + p.valor, 0) / 3;
    const corte = `${Number(dif.at(-1)!.data.slice(0, 4)) - 10}${dif.at(-1)!.data.slice(4)}`;
    const jan = dif.filter((p) => p.data > corte), media10 = jan.reduce((a, p) => a + p.valor, 0) / jan.length;
    checklist.push({
      pergunta: "A alta de preços está espalhada?", resposta: media3 > media10 ? "Sim" : "Não",
      evidencia: `Difusão média de ${fmtNumero(media3, 1)}% nos últimos 3 meses contra ${fmtNumero(media10, 1)}% de média em 10 anos.`,
      explica: "Difusão é a fatia dos itens do IPCA que subiu no mês (SGS 21379). Espalhada = média dos últimos 3 meses acima da média de 10 anos.",
    });
  }

  const f12 = s("focus12"), dF = delta3(f12), fu = f12.at(-1), mf = fu ? metaEm(fu.data) : null;
  if (fu && mf !== null) checklist.push({
    pergunta: "As expectativas estão acima da meta?", resposta: fu.valor > mf ? "Sim" : "Não",
    evidencia: `Focus para os próximos 12 meses em ${fmtNumero(fu.valor)}% (${sinal(fu.valor - mf)} p.p. da meta)${dF ? `; ${mover(dF.d)} em 3 meses` : ""}.`,
    explica: "Mediana das projeções de inflação para os próximos 12 meses na pesquisa Focus do Banco Central.",
  });

  // ---------------------------------------------------------------- cabo de guerra
  const grupos: Grupo[] = GRUPOS_IPCA.map((g) => ({ id: g.id, nome: g.nome, variacao: s(`var${g.id}`), peso: s(`peso${g.id}`) }))
    .filter((g) => g.variacao.length && g.peso.length);
  const cabo = grupos.length ? caboDeGuerra(grupos, 3) : { data: null, itens: [], total: 0 };
  const oficial = cabo.data ? ipca12.find((p) => p.data === cabo.data) ?? null : null;

  // ---------------------------------------------------------------- períodos parecidos
  const painel = painelMensal({
    ipca12: { pontos: ipca12, toleranciaDias: 40 },
    nucleos: { pontos: acum("nucleos"), toleranciaDias: 40 },
    servicos: { pontos: acum("servicos"), toleranciaDias: 40 },
    focus12: { pontos: f12, toleranciaDias: 10 },
    selic: { pontos: s("selic"), toleranciaDias: 10 },
  }, "2002-01", hoje.slice(0, 7));
  const vars = VARIAVEIS_PARECIDAS.map((v) => v.id);
  const { atual, analogos } = encontrarAnalogos(painel, vars, { quantos: 5, excluirUltimos: 24, separacao: 12 });
  const porMes = new Map(painel.map((l) => [l.mes, l.valores]));
  const mais12 = (mes: string) => { const t = Number(mes.slice(0, 4)) * 12 + Number(mes.slice(5, 7)) - 1 + 12; return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`; };
  const lista: Parecido[] = analogos.map((a) => ({
    mes: a.mes, semelhanca: Math.max(0, Math.round((1 - a.distancia / 2) * 100)),
    entao: a.valores, depois: porMes.get(mais12(a.mes)) ?? {},
  }));
  const difsIpca = lista.flatMap((p) => (p.entao.ipca12 != null && p.depois.ipca12 != null ? [p.depois.ipca12 - p.entao.ipca12] : []));
  const ordenado = [...difsIpca].sort((a, b) => a - b);
  const medianaIpca = ordenado.length ? (ordenado.length % 2 ? ordenado[ordenado.length >> 1] : (ordenado[ordenado.length / 2 - 1] + ordenado[ordenado.length / 2]) / 2) : null;

  return {
    relogio: relogio(ipca12, metaEm, { mesesDirecao: 6, rastroMeses: 24 }),
    checklist,
    cabo: { ...cabo, oficial },
    parecidos: { atual, lista, caiu: difsIpca.filter((d) => d < 0).length, subiu: difsIpca.filter((d) => d > 0).length, medianaIpca },
  };
}
