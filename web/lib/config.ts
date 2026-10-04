/** Configuração gerada de config/ por scripts/gerar-config.mjs (antes do build). */
import gerado from "./gerado/config.json";
import type { IdTransformacao, TipoSerie } from "./transform";

export type SerieDoPainel = {
  dado: string; serie: string; rotulo: string; tipo: TipoSerie;
  frequencia: string; unidade: string; fonte: string; codigo: string;
};
export type Painel = {
  titulo: string;
  transformacao: IdTransformacao;
  combinado: { barras: IdTransformacao; linha: IdTransformacao } | null;
  series: SerieDoPainel[];
};
export type Aba = { id: string; titulo: string; grupo: string; ordem: number; paineis: Painel[] };
export type ItemCatalogo = {
  id: string; pais: string; aba: string; indicador: string; fonte: string; codigo: string;
  frequencia: string; unidade: string; tipo: string; status: string;
};

const config = gerado as unknown as { catalogo: Record<string, ItemCatalogo>; abas: Aba[] };

export const abas = (): Aba[] => config.abas;
export const aba = (id: string): Aba | undefined => config.abas.find((a) => a.id === id);
export const catalogo = (): Record<string, ItemCatalogo> => config.catalogo;
