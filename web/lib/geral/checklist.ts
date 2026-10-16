/**
 * Checklist sim/não (Fase 6d): perguntas factuais com resposta por regra e evidência.
 * As respostas descrevem; não dizem se algo é bom ou ruim (decisão 0017).
 */
import type { Ponto } from "../transform";

export type Resposta = "Sim" | "Não" | "Parcial" | "Sem dados";
export type ItemChecklist = { pergunta: string; resposta: Resposta; evidencia: string; explica: string };

/** Quantos pontos seguidos, até o último, satisfazem a condição. */
export function mesesSeguidos(serie: Ponto[], cond: (p: Ponto) => boolean): number {
  let n = 0;
  for (let i = serie.length - 1; i >= 0 && cond(serie[i]); i--) n++;
  return n;
}
