/**
 * Agenda da Central: divulgações do IBGE (tabela events, tipo "agenda", coletadas da API
 * oficial de calendário) e reuniões do Copom e do FOMC (config/agenda/reunioes.yaml).
 * Função pura: a página lê o banco e passa os eventos.
 */
import type { Evento } from "./db";

export type Reunioes = { fontes: Record<string, string>; copom: { data: string; projecoes: boolean }[]; fomc: { data: string; projecoes: boolean }[] };
export type ItemAgenda = { data: string; instituicao: "IBGE" | "BCB" | "Fed"; titulo: string; detalhe: string; aba: string | null; url: string | null; destaque: boolean };

const ABA_IBGE: Record<string, string> = {
  IPCA: "inflacao", "IPCA-15": "inflacao", "Desemprego (PNAD Contínua)": "mercado-de-trabalho",
  "Produção industrial (PIM-PF)": "atividade", "Varejo (PMC)": "atividade", "Serviços (PMS)": "atividade",
  "PIB trimestral": "atividade", "Safra (LSPA)": "atividade",
};

export function montarAgenda(eventos: Evento[], reunioes: Reunioes, hoje: string, dias = 45): ItemAgenda[] {
  const fim = new Date(Date.parse(hoje) + dias * 86_400_000).toISOString().slice(0, 10);
  const dentro = (d: string) => d >= hoje && d <= fim;
  const itens: ItemAgenda[] = [
    ...eventos.filter((e) => e.tipo === "agenda" && dentro(e.data_ref)).map((e) => ({
      data: e.data_ref, instituicao: "IBGE" as const, titulo: e.titulo, detalhe: e.texto, aba: ABA_IBGE[e.titulo] ?? null, url: e.url, destaque: e.titulo === "IPCA" || e.titulo === "PIB trimestral",
    })),
    ...reunioes.copom.filter((r) => dentro(r.data)).map((r) => ({
      data: r.data, instituicao: "BCB" as const, titulo: "Decisão do Copom (Selic)", detalhe: "Comunicado no fim do dia; ata na terça seguinte", aba: "politica-monetaria", url: reunioes.fontes.copom ?? null, destaque: true,
    })),
    ...reunioes.fomc.filter((r) => dentro(r.data)).map((r) => ({
      data: r.data, instituicao: "Fed" as const, titulo: "Decisão do FOMC (juros nos EUA)", detalhe: r.projecoes ? "Com projeções econômicas (SEP)" : "Sem projeções econômicas", aba: null, url: reunioes.fontes.fomc ?? null, destaque: true,
    })),
  ];
  return itens.sort((a, b) => a.data.localeCompare(b.data) || a.instituicao.localeCompare(b.instituicao) || a.titulo.localeCompare(b.titulo));
}

/** Próxima reunião (Copom ou FOMC) a partir de hoje, inclusive. */
export function proxima(lista: { data: string }[], hoje: string): string | null {
  return lista.find((r) => r.data >= hoje)?.data ?? null;
}
