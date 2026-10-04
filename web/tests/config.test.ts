import { describe, expect, it } from "vitest";
// @ts-expect-error módulo JavaScript sem tipos
import { montarConfig } from "../scripts/gerar-config.mjs";

const series = [{ pais: "BR", aba: "Inflação", series: [
  { id: "BR-025", indicador: "IPCA", fonte: "BCB SGS", codigo: "433", frequencia: "Mensal", unidade: "% m/m", tipo: "Var % mensal", status: "Verificado" },
  { id: "BR-127", indicador: "Média", fonte: "Argus", codigo: "média", frequencia: "Mensal", unidade: "% m/m", tipo: "Derivado", status: "Derivado" },
  { id: "BR-099", indicador: "Pendente", fonte: "X", codigo: "?", frequencia: "Mensal", unidade: "%", tipo: "Taxa", status: "Confirmar" },
] }];

const aba = (paineis: unknown[]) => [{ id: "t", titulo: "Teste", grupo: "Brasil", paineis }];

describe("configuração das abas", () => {
  it("monta painéis com tipo, frequência e fonte vindos do catálogo", () => {
    const { abas } = montarConfig(series, aba([{ titulo: "IPCA", transformacao: "acum12", series: [{ dado: "BR-025:433" }] }]));
    expect(abas[0].paineis[0].series[0]).toMatchObject({ serie: "BR-025", tipo: "Var % mensal", frequencia: "Mensal", rotulo: "IPCA" });
  });
  it("derivada pode declarar como se transforma", () => {
    const { abas } = montarConfig(series, aba([{ titulo: "N", series: [{ dado: "BR-127:derivado", tipo: "Var % mensal" }] }]));
    expect(abas[0].paineis[0].series[0].tipo).toBe("Var % mensal");
  });
  it("recusa série fora do catálogo, não verificada, transformação desconhecida e tipo trocado", () => {
    expect(() => montarConfig(series, aba([{ titulo: "X", series: [{ dado: "BR-777:1" }] }]))).toThrow(/não está no catálogo/);
    expect(() => montarConfig(series, aba([{ titulo: "X", series: [{ dado: "BR-099:?" }] }]))).toThrow(/status "Confirmar"/);
    expect(() => montarConfig(series, aba([{ titulo: "X", transformacao: "xyz", series: [{ dado: "BR-025:433" }] }]))).toThrow(/desconhecida/);
    expect(() => montarConfig(series, aba([{ titulo: "X", series: [{ dado: "BR-025:433", tipo: "Taxa" }] }]))).toThrow(/só vale para derivadas/);
  });
});
