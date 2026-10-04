/**
 * Monta a análise de ciclos a partir das séries do banco (servidor). A página só exibe.
 */
import { depois, episodios, medir, trajetoria, type DefMetrica, type Episodio, type ValorMetrica } from "./ciclos";
import { aplicar, type Ponto } from "./transform";

export const SERIES_CICLOS = {
  selic: "BR-050:432",
  ipca12: "BR-026:13522",
  focus12: "BR-047:ExpectativasMercadoInflacao12Meses · Indicador='IPCA'",
  juroReal: "BR-055:derivado",
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
    ipca12: s("ipca12"), focus12: s("focus12"), juroReal: s("juroReal"), pib: s("pib"),
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
