/** Painel de gráfico montado a partir de medidas (sem ler a configuração: pode ir para o navegador). */
import type { Painel, SerieDoPainel } from "./config";
import type { IdTransformacao } from "./transform";

type ComSerie = { transf: IdTransformacao; serieDoPainel: SerieDoPainel };

/** Painel de gráfico de uma ou mais medidas com a mesma transformação. */
export function painelDe(titulo: string, ms: ComSerie[], descricao?: string): Painel {
  return {
    id: titulo.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    titulo, descricao: descricao ?? null, transformacao: ms[0].transf, combinado: null, eventos: null,
    series: ms.map((m) => m.serieDoPainel),
  };
}

