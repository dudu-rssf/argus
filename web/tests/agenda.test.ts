import { describe, expect, it } from "vitest";
import { montarAgenda, proxima, type Reunioes } from "@/lib/agenda";

const reunioes: Reunioes = {
  fontes: { copom: "https://www.bcb.gov.br/politicamonetaria/copom", fomc: "https://www.federalreserve.gov/x" },
  copom: [{ data: "2026-09-16", projecoes: false }, { data: "2026-11-04", projecoes: false }, { data: "2026-12-09", projecoes: false }],
  fomc: [{ data: "2026-10-28", projecoes: false }, { data: "2026-12-09", projecoes: true }],
};
const ev = (data: string, titulo: string) => ({ id: `agenda-ibge-${data}-${titulo}`, tipo: "agenda", data_ref: data, titulo, url: null, texto: "Referência: out/2026" });

describe("agenda da Central", () => {
  it("junta IBGE, Copom e FOMC na janela, em ordem de data", () => {
    const a = montarAgenda([ev("2026-10-23", "IPCA-15"), ev("2026-11-12", "IPCA"), ev("2026-10-01", "IPCA")], reunioes, "2026-10-19", 30);
    expect(a.map((x) => `${x.data} ${x.instituicao}`)).toEqual(["2026-10-23 IBGE", "2026-10-28 Fed", "2026-11-04 BCB", "2026-11-12 IBGE"]);
    expect(a.find((x) => x.instituicao === "BCB")?.aba).toBe("politica-monetaria");
    expect(a.find((x) => x.titulo === "IPCA-15")?.aba).toBe("inflacao");
  });
  it("próxima reunião", () => {
    expect(proxima(reunioes.copom, "2026-10-19")).toBe("2026-11-04");
    expect(proxima(reunioes.copom, "2026-11-04")).toBe("2026-11-04");
    expect(proxima(reunioes.copom, "2027-01-01")).toBeNull();
  });
});
