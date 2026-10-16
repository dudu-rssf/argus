/**
 * Registro da seção Geral de cada aba (Fase 6f). A Inflação tem visual próprio
 * (lib/geral/inflacao.ts); as demais usam o motor comum.
 */
import type { Ponto } from "../../transform";
import type { GeralAba } from "../motor";
import { geralAtividade, idsAtividade } from "./atividade";
import { geralExterno, idsExterno } from "./externo";
import { geralFamilias, idsFamilias } from "./familias";
import { geralFiscal, idsFiscal } from "./fiscal";
import { geralMonetaria, idsMonetaria } from "./monetaria";
import { geralTrabalho, idsTrabalho } from "./trabalho";

export type DefGeral = { ids: (ano: number) => string[]; montar: (dados: Record<string, Ponto[]>, hoje: string) => GeralAba };

export const GERAIS: Record<string, DefGeral> = {
  atividade: { ids: idsAtividade, montar: geralAtividade },
  "mercado-de-trabalho": { ids: idsTrabalho, montar: geralTrabalho },
  "politica-monetaria": { ids: idsMonetaria, montar: geralMonetaria },
  fiscal: { ids: idsFiscal, montar: geralFiscal },
  "setor-externo": { ids: idsExterno, montar: geralExterno },
  familias: { ids: idsFamilias, montar: geralFamilias },
};
