import { describe, expect, it } from "vitest";
import textos from "./fixtures/copom_textos.json";
import { chaveNome, diretores, extrairVotos } from "@/lib/copom-votos";

const ev = (n: number) => textos.find((t) => t.id === `copom-comunicado-${n}`)!;

describe("votos do Copom (comunicados reais)", () => {
  it("decisão dividida de mai/2024 (262ª): 5 × 4, com os vencidos", () => {
    const v = extrairVotos(ev(262));
    expect(v.unanime).toBe(false);
    expect(v.placar).toEqual([5, 4]);
    expect(v.grupos.map((g) => g.proposta)).toEqual(["uma redução de 0,25 ponto percentual", "uma redução de 0,50 ponto percentual"]);
    expect(v.vencidos).toEqual(["Ailton de Aquino Santos", "Gabriel Muricca Galípolo", "Paulo Picchetti", "Rodrigo Alves Teixeira"]);
    expect(v.presidente).toBe("Roberto de Oliveira Campos Neto");
  });

  it("unânime com nomes (255ª, 2023): 8 membros", () => {
    const v = extrairVotos(ev(255));
    expect(v).toMatchObject({ unanime: true, placar: [8, 0], vencidos: [] });
    expect(v.grupos[0].membros).toContain("Fernanda Magalhães Rumenos Guardado");
  });

  it("lista com vírgula antes do 'e' (281ª)", () => {
    const v = extrairVotos(ev(281));
    expect(v.unanime).toBe(true);
    expect(v.grupos[0].membros.at(-1)).toBe("Rodrigo Alves Teixeira");
    expect(v.grupos[0].membros.every((n) => !n.startsWith("e "))).toBe(true);
  });

  it("textos antigos: 'por unanimidade' e 'por sete votos a dois' sem nomes", () => {
    expect(extrairVotos(ev(150))).toMatchObject({ unanime: true, placar: null, grupos: [] });
    expect(extrairVotos(ev(90))).toMatchObject({ unanime: false, placar: [7, 2], grupos: [] });
  });

  it("sem informação no texto, não supõe nada", () => {
    expect(extrairVotos(ev(60))).toMatchObject({ unanime: null, placar: null });
  });

  it("nomes com e sem partícula são a mesma pessoa", () => {
    expect(chaveNome("Roberto Oliveira Campos Neto")).toBe(chaveNome("Roberto de Oliveira Campos Neto (presidente)"));
  });

  it("tabela de diretores: Galípolo vencido em mai/2024; Campos Neto presidiu", () => {
    const ds = diretores(textos.map(extrairVotos));
    const galipolo = ds.find((d) => d.chave.includes("galipolo"))!;
    expect(galipolo.vencido).toBe(1);
    const cn = ds.find((d) => d.chave === chaveNome("Roberto Campos Neto") || d.chave.includes("campos neto"))!;
    expect(cn.presidiu).toBe(3); // 240ª, 255ª, 262ª na amostra
  });
});

import todos from "./fixtures/copom_comunicados_todos.json";

describe("cobertura em todos os comunicados", () => {
  const vs = todos.map(extrairVotos);
  it("formatos numéricos e 'a decisão foi unânime'", () => {
    expect(vs.find((v) => v.id === "copom-comunicado-94")).toMatchObject({ unanime: false, placar: [6, 3] });
    expect(vs.find((v) => v.id === "copom-comunicado-115")).toMatchObject({ unanime: false, placar: [6, 2] });
    expect(vs.find((v) => v.id === "copom-comunicado-80")).toMatchObject({ unanime: true });
  });
  it("formato 'por seis votos a favor e três votos pela redução' (117ª, 2006)", () => {
    expect(vs.find((v) => v.id === "copom-comunicado-117")).toMatchObject({ unanime: false, placar: [6, 3] });
  });
  it("todo comunicado desde 2003 informa o placar ou a unanimidade", () => {
    expect(vs.filter((v) => v.data >= "2003-01-01" && v.unanime === null).map((v) => v.id)).toEqual([]);
  });
  it("desde jun/2012 todos trazem os nomes, exceto a 200ª (a fonte só diz 'por unanimidade')", () => {
    expect(vs.filter((v) => v.data >= "2012-06-01" && !v.grupos.length).map((v) => v.id)).toEqual(["copom-comunicado-200"]);
  });
  it("2012: 'Tombini, Presidente,' marca o presidente e não vira membro", () => {
    const v = vs.find((x) => x.id === "copom-comunicado-167")!;
    expect(v.presidente).toBe("Alexandre Antonio Tombini");
    expect(diretores(vs).some((d) => d.nome === "Presidente")).toBe(false);
  });
  it("nomes sem aspas ou ponto final", () => {
    expect(vs.flatMap((v) => v.vencidos).filter((n) => /["”.]$/.test(n))).toEqual([]);
  });
});
