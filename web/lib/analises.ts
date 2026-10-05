/**
 * Monta a análise de ciclos a partir das séries do banco (servidor). A página só exibe.
 */
import { depois, episodios, medir, trajetoria, type DefMetrica, type Episodio, type ValorMetrica } from "./ciclos";
import { painelMensal, variacaoAnual, type LinhaMes, type Variavel } from "./analogos";
import { aplicar, type Ponto } from "./transform";

export const SERIES_CICLOS = {
  selic: "BR-050:432",
  ipca12: "BR-026:13522",
  focus12: "BR-047:ExpectativasMercadoInflacao12Meses · Indicador='IPCA'",
  juroReal: "BR-055:derivado",
  neutro: "BR-117:derivado",
  postura: "BR-118:derivado",
  pib: "BR-002:t5932/v6561,6562,6564/c11255=90707@6561",
  ibc: "BR-006:24364",
  desocupacao: "BR-015:24369",
  dolar: "BR-085:1",
  ibov: "BR-106:indice=IBOV · yahoo=^BVSP",
} as const;

export const METRICAS: DefMetrica[] = [
  { id: "ipca12", rotulo: "IPCA 12 meses", variacao: "pp", toleranciaDias: 75, unidade: "%" },
  { id: "focus12", rotulo: "Expectativa Focus 12 meses", variacao: "pp", toleranciaDias: 10, unidade: "%" },
  { id: "juroReal", rotulo: "Juro real ex-ante", variacao: "pp", toleranciaDias: 10, unidade: "% a.a." },
  { id: "neutro", rotulo: "Neutro implícito no Focus (t+3)", variacao: "pp", toleranciaDias: 10, unidade: "% a.a." },
  { id: "postura", rotulo: "Juro real menos neutro", variacao: "pp", toleranciaDias: 10, unidade: "p.p." },
  { id: "pib", rotulo: "PIB (taxa anual do trimestre)", variacao: "pp", toleranciaDias: 200, unidade: "%" },
  { id: "ibc", rotulo: "IBC-Br (variação anual)", variacao: "pp", toleranciaDias: 75, unidade: "%" },
  { id: "desocupacao", rotulo: "Desocupação", variacao: "pp", toleranciaDias: 75, unidade: "%" },
  { id: "dolar", rotulo: "Dólar (R$/US$)", variacao: "pct", toleranciaDias: 10, unidade: "R$" },
  { id: "ibov", rotulo: "Ibovespa (pontos)", variacao: "pct", toleranciaDias: 10, unidade: "pts" },
];

export type LinhaCiclo = Episodio & {
  metricas: Record<string, ValorMetrica>;
  depois: { dolar: (number | null)[]; ibov: (number | null)[]; ipca12: number | null };
  trajetoria: { t: number; valor: number }[];
};

export function analisarCiclos(dados: Record<string, Ponto[]>, hoje: string): LinhaCiclo[] {
  const s = (k: keyof typeof SERIES_CICLOS) => dados[SERIES_CICLOS[k]] ?? [];
  const derivadas: Record<string, Ponto[]> = {
    ipca12: s("ipca12"), focus12: s("focus12"), juroReal: s("juroReal"), neutro: s("neutro"), postura: s("postura"), pib: s("pib"),
    ibc: aplicar("yoy", s("ibc"), "Índice", "Mensal"), desocupacao: s("desocupacao"),
    dolar: s("dolar"), ibov: s("ibov"),
  };
  const def = (id: string) => METRICAS.find((m) => m.id === id)!;
  return episodios(s("selic"), hoje).map((ep) => {
    const metricas = Object.fromEntries(METRICAS.map((m) => [m.id, medir(derivadas[m.id], m, ep.inicio, ep.fim)]));
    const fimMais12 = new Date(Date.parse(ep.fim) + 12 * 30.4375 * 86_400_000).toISOString().slice(0, 10);
    return {
      ...ep, metricas,
      depois: {
        dolar: [3, 6, 12].map((m) => (ep.emAndamento ? null : depois(derivadas.dolar, ep.fim, m, hoje, 10))),
        ibov: [3, 6, 12].map((m) => (ep.emAndamento ? null : depois(derivadas.ibov, ep.fim, m, hoje, 10))),
        ipca12: ep.emAndamento || fimMais12 > hoje ? null : medir(derivadas.ipca12, def("ipca12"), ep.fim, fimMais12).delta,
      },
      trajetoria: ep.tipo === "manutencao" ? [] : trajetoria(s("selic"), ep),
    };
  });
}

// ---------------------------------------------------------------- análogos (item 3)

export const VARIAVEIS_ESTADO: (Variavel & { padrao: boolean })[] = [
  { id: "ipca12", rotulo: "IPCA 12 meses", unidade: "%", padrao: true },
  { id: "focus12", rotulo: "Expectativa Focus 12 meses", unidade: "%", padrao: true },
  { id: "selic", rotulo: "Selic", unidade: "%", padrao: true },
  { id: "selicD6", rotulo: "Δ da Selic em 6 meses", unidade: "p.p.", padrao: true },
  { id: "juroReal", rotulo: "Juro real ex-ante", unidade: "%", padrao: true },
  { id: "ibc", rotulo: "IBC-Br (var. anual)", unidade: "%", padrao: true },
  { id: "dolarYoY", rotulo: "Dólar (var. anual)", unidade: "%", padrao: true },
  { id: "desocupacao", rotulo: "Desocupação (desde 2012)", unidade: "%", padrao: false },
];

export function painelAnalogos(dados: Record<string, Ponto[]>, hoje: string): LinhaMes[] {
  const s = (k: keyof typeof SERIES_CICLOS) => dados[SERIES_CICLOS[k]] ?? [];
  let painel = painelMensal({
    ipca12: { pontos: s("ipca12"), toleranciaDias: 40 },
    focus12: { pontos: s("focus12"), toleranciaDias: 10 },
    selic: { pontos: s("selic"), toleranciaDias: 7 },
    juroReal: { pontos: s("juroReal"), toleranciaDias: 10 },
    ibc: { pontos: aplicar("yoy", s("ibc"), "Índice", "Mensal"), toleranciaDias: 40 },
    desocupacao: { pontos: s("desocupacao"), toleranciaDias: 40 },
    dolar: { pontos: s("dolar"), toleranciaDias: 7 },
    ibov: { pontos: s("ibov"), toleranciaDias: 7 },
  }, "2001-01-01", hoje);
  painel = variacaoAnual(painel, "dolar", "dolarYoY");
  const porMes = new Map(painel.map((l) => [l.mes, l.valores.selic]));
  return painel.map((l) => {
    const [a, m] = l.mes.split("-").map(Number);
    const total = a * 12 + m - 1 - 6;
    const antes = porMes.get(`${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`);
    return { ...l, valores: { ...l.valores, selicD6: l.valores.selic != null && antes != null ? l.valores.selic - antes : null } };
  });
}
