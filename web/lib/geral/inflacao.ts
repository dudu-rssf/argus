/**
 * Seção Geral da aba Inflação (Fases 6d e 6e): relógio do ciclo, checklist com "Ver mais",
 * cabo de guerra por prazo com os subitens por trás de cada grupo, áreas de influência
 * e períodos parecidos. Monta tudo a partir das séries do banco; a página só exibe.
 */
import { encontrarAnalogos, painelMensal } from "../analogos";
import { valorAte } from "../ciclos";
import { fmtData, fmtNumero } from "../formato";
import { aplicar, type Ponto } from "../transform";
import { caboDeGuerra, type Grupo, type ItemCabo } from "./cabo";
import { mesesSeguidos, type ItemChecklist } from "./checklist";
import {
  cestaMensal, classificar, dadosSubitens, datasSubitens, ID_SUBITEM, maioresMovimentos, soma12,
  type Classificacao, type Movimento, type Subitem,
} from "./composicao";
import { episodioDe, type Episodio } from "./episodios";
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
  ex0: "BR-031:11427", ex3: "BR-034:27839", ms: "BR-030:4466", dp: "BR-033:16122", p55: "BR-034:28750", exfe: "BR-126:28751",
  industriais: "BR-038:27863", alimentacao: "BR-038:27864", monitorados: "BR-036:4449",
  comerc: "BR-135:4447", naoComerc: "BR-136:4448", duraveis: "BR-137:10843",
  ...Object.fromEntries(GRUPOS_IPCA.flatMap((g) => [[`var${g.id}`, `${T7060}@63.${g.id}`], [`peso${g.id}`, `${T7060}@66.${g.id}`]])),
} as Record<string, string>;

/** Focus anual do IPCA para o ano dado (BR-046). */
export const focusAno = (ano: number) => `BR-046:ExpectativasMercadoAnuais · Indicador='IPCA'@${ano}`;
/** Ids que a seção Geral lê com histórico completo. */
export const idsGeralInflacao = (ano: number) => [...new Set([...Object.values(SERIES_GERAL_INFLACAO), focusAno(ano), focusAno(ano + 1), focusAno(ano + 2)])];
/** Ids dos subitens (variação e peso); lidos só desde `desdeSubitens`. */
export const idsSubitens = (subitens: Subitem[]) => subitens.flatMap((s) => [ID_SUBITEM(63, s.id), ID_SUBITEM(66, s.id)]);
export const desdeSubitens = (hoje: string) => `${Number(hoje.slice(0, 4)) - 3}-01-01`;

export const NUCLEOS = [
  { k: "ex0", sigla: "EX0", nome: "Exclusão 0", definicao: "Tira do IPCA a alimentação no domicílio e os preços monitorados (energia, combustíveis, tarifas). Sobram os preços livres menos os alimentos." },
  { k: "ex3", sigla: "EX3", nome: "Exclusão 3", definicao: "Tira alimentação no domicílio, monitorados e os itens mais voláteis de bens industriais e serviços. É a soma dos industriais e serviços subjacentes." },
  { k: "ms", sigla: "MS", nome: "Médias aparadas com suavização", definicao: "Corta, todo mês, os itens com as maiores e as menores variações (20% de cada ponta do peso) e espalha em 12 meses os reajustes que acontecem uma vez por ano." },
  { k: "dp", sigla: "DP", nome: "Dupla ponderação", definicao: "Mantém todos os itens, mas dá menos peso aos mais voláteis: o peso do IPCA é multiplicado pelo inverso da volatilidade de cada item." },
  { k: "p55", sigla: "P55", nome: "Percentil 55", definicao: "Ordena as variações dos itens no mês e pega o ponto em que 55% do peso do IPCA ficou abaixo. Um 'mediano' levemente deslocado para cima." },
] as const;

export type Parecido = {
  mes: string; semelhanca: number;
  entao: Record<string, number | null>; depois: Record<string, number | null>;
  /** Variáveis em ordem de proximidade com hoje (mais parecida primeiro). */
  proximidade: { id: string; distancia: number }[];
  episodio: Episodio | null;
  trajetoria: { t: number; valor: number }[];
};
export type VariavelParecida = { id: string; rotulo: string; unidade: string };
export const VARIAVEIS_PARECIDAS: VariavelParecida[] = [
  { id: "ipca12", rotulo: "IPCA 12 meses", unidade: "%" },
  { id: "nucleos", rotulo: "Média dos núcleos 12m", unidade: "%" },
  { id: "servicos", rotulo: "Serviços 12m", unidade: "%" },
  { id: "focus12", rotulo: "Focus 12m", unidade: "%" },
  { id: "selic", rotulo: "Selic", unidade: "%" },
];

export const PRAZOS = [3, 6, 9, 12] as const;
export type Prazo = (typeof PRAZOS)[number];

export type Area = {
  id: string; nome: string; influencia: string; racional: string;
  var12: number | null; d3: number | null; contrib12: number | null; peso: number | null; serie12: Ponto[];
};

export type VerMais = {
  meta: { ipca12: Ponto[]; meta: Ponto[]; banda: number; mesesAcima: number };
  aceleracao: { mensal: Ponto[]; ipca12: Ponto[]; troca: { entra: Ponto; sai: Ponto | null }[]; saem: Ponto[] };
  nucleos: { k: string; sigla: string; nome: string; definicao: string; serie12: Ponto[]; d3: number | null }[];
  exfe: Ponto[]; mediaNucleos: Ponto[];
  servicos: { total12: Ponto[]; sub12: Ponto[]; composicao: { nome: string; contrib12: number; var12: number | null; peso: number; d3: number | null }[]; data: string | null; movimentos: Movimento[] };
  difusao: { serie: Ponto[]; media10: number | null; media3: number | null };
  expectativas: { focus12: Ponto[]; meta: Ponto[]; anos: { ano: number; valor: number | null; d4: number | null; meta: number | null }[] };
};

export type GeralInflacao = {
  relogio: Relogio | null;
  checklist: (ItemChecklist & { id: keyof VerMais })[];
  verMais: VerMais;
  cabo: {
    data: string | null; total: number; oficial: Ponto | null;
    porPrazo: Record<Prazo, { antes: string | null; itens: ItemCabo[] }>;
    movimentos: Record<string, Record<Prazo, Movimento[]>>;
    influencias: Record<string, string[]>;
  };
  areas: { data: string | null; itens: Area[]; lentes: Area[]; ipca12: number | null };
  parecidos: {
    atual: { mes: string; valores: Record<string, number | null> } | null; lista: Parecido[];
    caiu: number; subiu: number; medianaIpca: number | null; hoje: { t: number; valor: number }[];
  };
};

const sinal = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${fmtNumero(Math.abs(v))}`;
const mesAbs = (d: string) => Number(d.slice(0, 4)) * 12 + Number(d.slice(5, 7)) - 1;
const deMesAbs = (t: number) => `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}-01`;
const deltaK = (s: Ponto[], k: number) => {
  const u = s.at(-1);
  if (!u) return null;
  const a = s.find((p) => mesAbs(p.data) === mesAbs(u.data) - k);
  return a ? { atual: u, antes: a, d: u.valor - a.valor } : null;
};
/** Δ em 3 meses para séries mensais (tolerante a meses faltando) e diárias. */
const delta3 = (s: Ponto[]) => {
  const u = s.at(-1);
  if (!u) return null;
  const a = valorAte(s, new Date(Date.parse(u.data) - 88 * 86_400_000).toISOString().slice(0, 10), 40);
  return a && a.data < u.data ? { atual: u, antes: a, d: u.valor - a.valor } : null;
};
const mover = (d: number) => (d > 0 ? `subiu ${fmtNumero(d)} p.p.` : d < 0 ? `caiu ${fmtNumero(-d)} p.p.` : "ficou estável");
const ultimos = (s: Ponto[], n: number) => s.slice(-n);
/** Série diária → último valor de cada mês. */
const mensalizar = (s: Ponto[]) => {
  const m = new Map<string, Ponto>();
  for (const p of s) m.set(p.data.slice(0, 7), p);
  return [...m.values()];
};

export function geralInflacao(dados: Record<string, Ponto[]>, hoje: string, ipca?: { subitens: Subitem[]; classificacao: Classificacao }): GeralInflacao {
  const s = (k: string) => dados[SERIES_GERAL_INFLACAO[k]] ?? [];
  const meta = s("meta");
  const metaEm = (data: string) => valorAte(meta, data, 400)?.valor ?? null;
  const ipca12 = s("ipca12");
  const acum = (k: string) => aplicar("acum12", s(k), "Var % mensal", "Mensal");
  const ano = Number(hoje.slice(0, 4));

  // ---------------------------------------------------------------- checklist
  const checklist: GeralInflacao["checklist"] = [];
  const u = ipca12.at(-1);
  const m = u ? metaEm(u.data) : null;
  const mesesAcima = mesesSeguidos(ipca12, (p) => { const mt = metaEm(p.data); return mt !== null && p.valor > mt; });
  if (u && m !== null) {
    const acima = u.valor > m;
    checklist.push({ id: "meta", pergunta: "O IPCA está acima da meta?", resposta: acima ? "Sim" : "Não",
      evidencia: `${fmtNumero(u.valor)}% em 12 meses (${fmtData(u.data)}) contra meta de ${fmtNumero(m)}%${acima && mesesAcima > 1 ? `; acima há ${mesesAcima} meses` : ""}.`,
      explica: "IPCA acumulado em 12 meses contra a meta do CMN do ano (SGS 13522 e 13521)." });
  } else checklist.push({ id: "meta", pergunta: "O IPCA está acima da meta?", resposta: "Sem dados", evidencia: "Sem IPCA ou meta no banco.", explica: "" });

  const dI = delta3(ipca12);
  const u6 = ipca12.at(-1), a6 = u6 ? valorAte(ipca12, new Date(Date.parse(u6.data) - 180 * 86_400_000).toISOString().slice(0, 10), 40) : null;
  const d6 = u6 && a6 && a6.data < u6.data ? u6.valor - a6.valor : null;
  const seq = mesesSeguidos(ipca12.slice(1).map((p, i) => ({ data: p.data, valor: p.valor - ipca12[i].valor })),
    (p) => Math.sign(p.valor) === Math.sign(dI?.d ?? 0) && p.valor !== 0);
  checklist.push(dI && d6 !== null ? {
    id: "aceleracao",
    pergunta: "A inflação está acelerando?",
    resposta: dI.d > 0 && d6 > 0 ? "Sim" : dI.d <= 0 && d6 <= 0 ? "Não" : "Parcial",
    evidencia: `IPCA 12 meses ${mover(dI.d)} em 3 meses e ${mover(d6)} em 6 meses (${fmtNumero(dI.atual.valor)}% em ${fmtData(dI.atual.data)})${seq >= 2 ? `; ${seq}º mês seguido de ${dI.d > 0 ? "alta" : "queda"}` : ""}.`,
    explica: "Sim = o IPCA acumulado em 12 meses subiu em 3 e em 6 meses; Não = não subiu em nenhum dos dois; Parcial = os dois prazos discordam. O relógio do ciclo usa o prazo de 6 meses.",
  } : { id: "aceleracao", pergunta: "A inflação está acelerando?", resposta: "Sem dados", evidencia: "Histórico insuficiente.", explica: "" });

  const nucleos = NUCLEOS.map((n) => { const serie12 = acum(n.k); return { ...n, serie12, d3: delta3(serie12)?.d ?? null }; });
  const dirNuc = nucleos.filter((x) => x.d3 !== null);
  if (dI && dirNuc.length) {
    const iguais = dirNuc.filter((x) => Math.sign(x.d3!) === Math.sign(dI.d));
    checklist.push({
      id: "nucleos",
      pergunta: "Os núcleos confirmam a direção do IPCA?",
      resposta: iguais.length === dirNuc.length ? "Sim" : iguais.length === 0 ? "Não" : "Parcial",
      evidencia: `IPCA ${dI.d > 0 ? "subiu" : "caiu"} em 3 meses; dos ${dirNuc.length} núcleos do Copom, ${dirNuc.filter((x) => x.d3! < 0).length} caíram (${dirNuc.filter((x) => x.d3! < 0).map((x) => x.sigla).join(", ") || "nenhum"}) e ${dirNuc.filter((x) => x.d3! > 0).length} subiram (${dirNuc.filter((x) => x.d3! > 0).map((x) => x.sigla).join(", ") || "nenhum"}).`,
      explica: "Núcleos tiram itens voláteis. Compara a direção em 3 meses de cada núcleo acumulado em 12 meses (EX0, EX3, MS, DP, P55) com a do IPCA.",
    });
  }

  const ss = acum("servsub"), dS = delta3(ss);
  if (dS) checklist.push({
    id: "servicos",
    pergunta: "A inflação de serviços está cedendo?", resposta: dS.d < 0 ? "Sim" : "Não",
    evidencia: `Serviços subjacentes em ${fmtNumero(dS.atual.valor)}% em 12 meses; ${mover(dS.d)} em 3 meses.`,
    explica: "Serviços subjacentes (SGS 29683) é o núcleo de serviços mais olhado pelo Copom, porque reage a salários e à atividade.",
  });

  const dif = s("difusao");
  let media3: number | null = null, media10: number | null = null;
  if (dif.length >= 36) {
    media3 = ultimos(dif, 3).reduce((a, p) => a + p.valor, 0) / 3;
    const corte = `${Number(dif.at(-1)!.data.slice(0, 4)) - 10}${dif.at(-1)!.data.slice(4)}`;
    const jan = dif.filter((p) => p.data > corte);
    media10 = jan.reduce((a, p) => a + p.valor, 0) / jan.length;
    checklist.push({
      id: "difusao",
      pergunta: "A alta de preços está espalhada?", resposta: media3 > media10 ? "Sim" : "Não",
      evidencia: `Difusão média de ${fmtNumero(media3, 1)}% nos últimos 3 meses contra ${fmtNumero(media10, 1)}% de média em 10 anos.`,
      explica: "Difusão é a fatia dos itens do IPCA que subiu no mês (SGS 21379). Espalhada = média dos últimos 3 meses acima da média de 10 anos.",
    });
  }

  const f12 = s("focus12"), dF = delta3(f12), fu = f12.at(-1), mf = fu ? metaEm(fu.data) : null;
  if (fu && mf !== null) checklist.push({
    id: "expectativas",
    pergunta: "As expectativas estão acima da meta?", resposta: fu.valor > mf ? "Sim" : "Não",
    evidencia: `Focus para os próximos 12 meses em ${fmtNumero(fu.valor)}% (${sinal(fu.valor - mf)} p.p. da meta)${dF ? `; ${mover(dF.d)} em 3 meses` : ""}.`,
    explica: "Mediana das projeções de inflação para os próximos 12 meses na pesquisa Focus do Banco Central.",
  });

  // ---------------------------------------------------------------- ver mais
  const ipcaMes = s("ipcaMes");
  const metaMensal = ultimos(ipca12, 36).map((p) => ({ data: p.data, valor: metaEm(p.data) ?? NaN })).filter((p) => Number.isFinite(p.valor));
  const porData = new Map(ipcaMes.map((p) => [p.data, p]));
  const troca = ultimos(ipcaMes, 6).map((entra) => ({ entra, sai: porData.get(deMesAbs(mesAbs(entra.data) - 12)) ?? null }));
  const ultimoMes = ipcaMes.at(-1);
  const saem = ultimoMes ? [1, 2, 3].flatMap((k) => { const p = porData.get(deMesAbs(mesAbs(ultimoMes.data) - 12 + k)); return p ? [p] : []; }) : [];
  const focusMensal = mensalizar(f12);
  const anos = [ano, ano + 1, ano + 2].map((a) => {
    const serie = dados[focusAno(a)] ?? [];
    const v = serie.at(-1);
    const antes = v ? valorAte(serie, new Date(Date.parse(v.data) - 28 * 86_400_000).toISOString().slice(0, 10), 10) : null;
    return { ano: a, valor: v?.valor ?? null, d4: v && antes ? v.valor - antes.valor : null, meta: metaEm(`${a}-01-01`) ?? metaEm(`${a - 1}-01-01`) };
  });

  // ---------------------------------------------------------------- cabo de guerra
  const grupos: Grupo[] = GRUPOS_IPCA.map((g) => ({ id: g.id, nome: g.nome, variacao: s(`var${g.id}`), peso: s(`peso${g.id}`) }))
    .filter((g) => g.variacao.length && g.peso.length);
  const vazio = { data: null, itens: [] as ItemCabo[], total: 0 };
  const caboPor = Object.fromEntries(PRAZOS.map((k) => [k, grupos.length ? caboDeGuerra(grupos, k) : vazio])) as Record<Prazo, ReturnType<typeof caboDeGuerra>>;
  const base = caboPor[3];
  const oficial = base.data ? ipca12.find((p) => p.data === base.data) ?? null : null;

  // ---------------------------------------------------------------- subitens: movimentos, serviços, áreas
  const movimentos: Record<string, Record<Prazo, Movimento[]>> = {};
  const influencias: Record<string, string[]> = {};
  let composicao: VerMais["servicos"]["composicao"] = [], dataComp: string | null = null, movServ: Movimento[] = [];
  const contribArea = new Map<string, { contrib12: number; peso: number }>();
  if (ipca) {
    for (const g of Object.values(ipca.classificacao.grupos)) influencias[g.id] = g.influencias;
    const itens = classificar(ipca.subitens, ipca.classificacao);
    const d = dadosSubitens(dados, itens);
    const datas = datasSubitens(d);
    const data = base.data && datas.includes(base.data) ? base.data : datas.at(-1) ?? null;
    if (data && datas.length >= 24) {
      for (const g of GRUPOS_IPCA) {
        const doGrupo = itens.filter((x) => x.grupo === g.id);
        movimentos[g.id] = Object.fromEntries(PRAZOS.map((k) => [k, maioresMovimentos(d, doGrupo, datas, data, k)])) as Record<Prazo, Movimento[]>;
      }
      // composição dos serviços por subgrupo
      dataComp = data;
      const serv = itens.filter((x) => x.area === "servicos");
      const pesoServ = cestaMensal(d, serv.map((x) => x.id), [data])[0]?.peso ?? 0;
      composicao = ipca.classificacao.servicos.map((sg) => {
        const ids = serv.filter((x) => x.servico === sg.nome).map((x) => x.id);
        const cesta = cestaMensal(d, ids, datas);
        const c12 = soma12(cesta.map((c) => ({ data: c.data, valor: c.contribuicao })));
        const v12 = aplicar("acum12", cesta.map((c) => ({ data: c.data, valor: c.variacao })), "Var % mensal", "Mensal");
        const agora = v12.find((p) => p.data === data)?.valor ?? null;
        const antes = v12.find((p) => mesAbs(p.data) === mesAbs(data) - 3)?.valor ?? null;
        const peso = cesta.find((c) => c.data === data)?.peso ?? 0;
        return { nome: sg.nome, contrib12: c12.find((p) => p.data === data)?.valor ?? 0, var12: agora, peso: pesoServ ? (peso / pesoServ) * 100 : 0, d3: agora !== null && antes !== null ? agora - antes : null };
      }).sort((a, b) => b.contrib12 - a.contrib12);
      movServ = maioresMovimentos(d, serv, datas, data, 3, 8);
      for (const a of ipca.classificacao.areas) {
        const cesta = cestaMensal(d, itens.filter((x) => x.area === a.id).map((x) => x.id), datas);
        const c12 = soma12(cesta.map((c) => ({ data: c.data, valor: c.contribuicao }))).find((p) => p.data === data);
        const peso = cesta.find((c) => c.data === data)?.peso;
        if (c12 && peso !== undefined) contribArea.set(a.id, { contrib12: c12.valor, peso });
      }
    }
  }

  const areaDe = (x: { nome: string; influencia: string; serie: string; racional?: string; id?: string }): Area => {
    const v12 = aplicar("acum12", dados[x.serie] ?? [], "Var % mensal", "Mensal");
    const c = x.id ? contribArea.get(x.id) : undefined;
    return {
      id: x.id ?? x.serie, nome: x.nome, influencia: x.influencia, racional: x.racional ?? "",
      var12: v12.at(-1)?.valor ?? null, d3: deltaK(v12, 3)?.d ?? null,
      contrib12: c?.contrib12 ?? null, peso: c?.peso ?? null, serie12: ultimos(v12, 36),
    };
  };
  const areas = ipca ? ipca.classificacao.areas.map(areaDe) : [];
  const lentes = ipca ? ipca.classificacao.lentes.map(areaDe) : [];

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
  const desvio = Object.fromEntries(vars.map((v) => {
    const xs = painel.flatMap((l) => (l.valores[v] == null ? [] : [l.valores[v] as number]));
    const med = xs.reduce((a, x) => a + x, 0) / (xs.length || 1);
    return [v, Math.sqrt(xs.reduce((a, x) => a + (x - med) ** 2, 0) / (xs.length || 1)) || 1];
  }));
  const ipcaPorMes = new Map(ipca12.map((p) => [p.data.slice(0, 7), p.valor]));
  const caminho = (mes: string, de: number, ate: number) => {
    const t0 = mesAbs(`${mes}-01`);
    const out: { t: number; valor: number }[] = [];
    for (let t = de; t <= ate; t++) {
      const v = ipcaPorMes.get(deMesAbs(t0 + t).slice(0, 7));
      if (v !== undefined) out.push({ t, valor: v });
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
  const difsIpca = lista.flatMap((p) => (p.entao.ipca12 != null && p.depois.ipca12 != null ? [p.depois.ipca12 - p.entao.ipca12] : []));
  const ordenado = [...difsIpca].sort((a, b) => a - b);
  const medianaIpca = ordenado.length ? (ordenado.length % 2 ? ordenado[ordenado.length >> 1] : (ordenado[ordenado.length / 2 - 1] + ordenado[ordenado.length / 2]) / 2) : null;

  return {
    relogio: relogio(ipca12, metaEm, { mesesDirecao: 6, rastroMeses: 24 }),
    checklist,
    verMais: {
      meta: { ipca12: ultimos(ipca12, 36), meta: metaMensal, banda: 1.5, mesesAcima },
      aceleracao: { mensal: ultimos(ipcaMes, 24), ipca12: ultimos(ipca12, 36), troca, saem },
      nucleos: nucleos.map((n) => ({ k: n.k, sigla: n.sigla, nome: n.nome, definicao: n.definicao, serie12: ultimos(n.serie12, 36), d3: n.d3 })),
      exfe: ultimos(acum("exfe"), 36), mediaNucleos: ultimos(acum("nucleos"), 36),
      servicos: { total12: ultimos(acum("servicos"), 36), sub12: ultimos(ss, 36), composicao, data: dataComp, movimentos: movServ },
      difusao: { serie: ultimos(dif, 36), media10, media3 },
      expectativas: { focus12: ultimos(focusMensal, 36), meta: ultimos(focusMensal, 36).map((p) => ({ data: p.data, valor: metaEm(p.data) ?? NaN })).filter((p) => Number.isFinite(p.valor)), anos },
    },
    cabo: {
      data: base.data, total: base.total, oficial,
      porPrazo: Object.fromEntries(PRAZOS.map((k) => {
        const c = caboPor[k];
        const antes = c.data ? deMesAbs(mesAbs(c.data) - k) : null;
        return [k, { antes, itens: c.itens }];
      })) as Record<Prazo, { antes: string | null; itens: ItemCabo[] }>,
      movimentos, influencias,
    },
    areas: { data: base.data ?? ipca12.at(-1)?.data ?? null, itens: areas, lentes, ipca12: u?.valor ?? null },
    parecidos: {
      atual, lista, caiu: difsIpca.filter((d) => d < 0).length, subiu: difsIpca.filter((d) => d > 0).length, medianaIpca,
      hoje: atual ? caminho(atual.mes, -12, 0) : [],
    },
  };
}
