/**
 * Curadorias que envelhecem: o teste quebra (e o CI avisa) antes de o site ficar desatualizado.
 * - Calendário de reuniões do Copom e do FOMC: precisa cobrir pelo menos 120 dias à frente.
 * - Contexto histórico dos períodos parecidos: o último episódio (aberto) não pode ter mais de
 *   24 meses, senão os períodos parecidos passam a usá-lo sem um título próprio.
 */
import { describe, expect, it } from "vitest";
import reunioes from "@/lib/gerado/reunioes.json";
import { EPISODIOS } from "@/lib/geral/episodios";

const hoje = new Date().toISOString().slice(0, 10);
const somarDias = (d: string, n: number) => new Date(Date.parse(d) + n * 86_400_000).toISOString().slice(0, 10);

describe("curadorias em dia", () => {
  it("calendário do Copom e do FOMC cobre os próximos 120 dias (config/agenda/reunioes.yaml)", () => {
    expect(reunioes.copom.at(-1)!.data >= somarDias(hoje, 120), "acrescente as reuniões do Copom do próximo ano").toBe(true);
    expect(reunioes.fomc.at(-1)!.data >= somarDias(hoje, 120), "acrescente as reuniões do FOMC do próximo ano").toBe(true);
  });
  it("contexto histórico sem lacunas e com o período aberto recente (lib/geral/episodios.ts)", () => {
    for (let i = 1; i < EPISODIOS.length; i++) expect(EPISODIOS[i].de > EPISODIOS[i - 1].ate, EPISODIOS[i].titulo).toBe(true);
    const aberto = EPISODIOS.at(-1)!;
    const limite = somarDias(hoje, -730).slice(0, 7);
    expect(aberto.de >= limite, "feche o episódio atual com título e texto e abra um novo").toBe(true);
  });
});
