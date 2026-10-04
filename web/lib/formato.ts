const num = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtNumero = (v: number, casas = 2) =>
  casas === 2 ? num.format(v) : new Intl.NumberFormat("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(v);

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Data no estilo da frequência: "ago/2026" para mensais, "2º tri/2026" para trimestrais, "02/10/2026" para diárias. */
export function fmtData(iso: string, frequencia = "Mensal"): string {
  const [a, m, d] = iso.split("-");
  if (/di[áa]ria|semanal|cont[íi]nua/i.test(frequencia)) return `${d}/${m}/${a}`;
  if (/trimestral/i.test(frequencia) && !/m[óo]vel/i.test(frequencia)) return `${Math.floor((Number(m) - 1) / 3) + 1}º tri/${a}`;
  return `${MESES[Number(m) - 1]}/${a}`;
}

/** Data e hora de Brasília, para "atualizado em". */
export function fmtMomento(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

/** Duração legível: "14 meses", "1 ano e 2 meses". */
export function duracao(meses: number): string {
  const m = Math.round(meses);
  if (m < 1) return "menos de 1 mês";
  if (m < 12) return `${m} ${m === 1 ? "mês" : "meses"}`;
  const anos = Math.floor(m / 12), resto = m % 12;
  return `${anos} ${anos === 1 ? "ano" : "anos"}${resto ? ` e ${resto} ${resto === 1 ? "mês" : "meses"}` : ""}`;
}

