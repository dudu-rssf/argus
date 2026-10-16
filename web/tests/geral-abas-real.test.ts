import { describe, expect, it } from "vitest";
import { GERAIS } from "@/lib/geral/abas";
import type { GeralAba } from "@/lib/geral/motor";
import { PRAZOS } from "@/lib/geral/motor";
import abas from "./fixtures/abas.json";

const HOJE = "2026-10-16";
const dados = Object.fromEntries(Object.entries(abas as unknown as Record<string, [string, number][]>)
  .map(([k, v]) => [k, v.map(([data, valor]) => ({ data, valor }))]));

function mostrar(id: string, g: GeralAba) {
  console.log(`\n===== ${id}\n${g.frase}`);
  if (g.relogio) console.log("relógio:", g.relogio.relogio.atual.data, g.relogio.nomes[g.relogio.relogio.atual.fase], `há ${g.relogio.relogio.mesesNaFase}`, "valor", g.relogio.relogio.atual.valor.toFixed(2), "nível", g.relogio.relogio.atual.nivel.toFixed(2));
  for (const p of g.perguntas) console.log(`${p.resposta.padEnd(9)} ${p.pergunta} — ${p.evidencia}`);
  if (g.decomposicao) for (const k of PRAZOS) console.log(`dec ${k}m desde ${g.decomposicao.porPrazo[k].antes}:`, g.decomposicao.porPrazo[k].itens.map((i) => `${i.nome} ${i.delta.toFixed(2)} (${i.atual?.toFixed(2)})`).join(" | "));
  if (g.forcas) console.log("forças:", g.forcas.itens.map((f) => `${f.nome} ${f.valor?.toFixed(2)} Δ${f.d3?.toFixed(2)}`).join(" | "));
  console.log("parecidos:", g.parecidos.atual?.mes, g.parecidos.lista.map((p) => `${p.mes} ${p.semelhanca}% ${p.episodio?.titulo}`).join(" | "), "caiu", g.parecidos.caiu, "subiu", g.parecidos.subiu);
}

describe("Geral das abas com dados reais (retrato de 16/10/2026)", () => {
  for (const [id, aba] of Object.entries(GERAIS)) {
    it(id, () => {
      const g = aba.montar(dados, HOJE);
      mostrar(id, g);
      expect(g.frase).toBeTruthy();
      expect(g.relogio).not.toBeNull();
      expect(g.perguntas.length).toBeGreaterThanOrEqual(5);
      for (const p of g.perguntas) {
        expect(p.resposta, p.pergunta).not.toBe("Sem dados");
        expect(p.verMais.secoes.length, p.pergunta).toBeGreaterThan(0);
      }
      expect(g.decomposicao?.porPrazo[3].itens.length).toBeGreaterThan(1);
      expect(g.forcas?.itens.every((f) => f.valor !== null)).toBe(true);
      expect(g.parecidos.lista.length).toBe(5);
      for (const p of g.parecidos.lista) expect(p.trajetoria.length).toBeGreaterThan(18);
      // todos os ids que a aba lê existem no retrato exportado
      for (const s of aba.ids(2026)) expect(dados[s]?.length ?? 0, s).toBeGreaterThan(0);
    });
  }
});
