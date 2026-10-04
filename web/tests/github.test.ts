import { describe, expect, it, vi } from "vitest";
import { dispararColeta, estadoDaColeta } from "@/lib/github";

const resposta = (status: number, corpo?: unknown) =>
  new Response(corpo === undefined ? null : JSON.stringify(corpo), { status });
const run = (status: string) => ({ workflow_runs: [{ id: 7, status, conclusion: null, created_at: "2026-10-05T12:00:00Z", html_url: "https://github.com/x" }] });

describe("botão Atualizar", () => {
  it("sem token, não chama o GitHub", async () => {
    const f = vi.fn();
    expect(await estadoDaColeta(undefined, f)).toEqual({ estado: "sem_token" });
    expect(f).not.toHaveBeenCalled();
  });
  it("com coleta em andamento, não dispara outra", async () => {
    const f = vi.fn().mockResolvedValueOnce(resposta(200, run("in_progress")));
    const r = await dispararColeta("t", f);
    expect(r.estado).toBe("rodando");
    expect(r).not.toHaveProperty("disparou");
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("ocioso: dispara o workflow com gatilho 'botao'", async () => {
    const f = vi.fn().mockResolvedValueOnce(resposta(200, run("completed"))).mockResolvedValueOnce(resposta(204));
    const r = await dispararColeta("t", f);
    expect(r).toMatchObject({ estado: "rodando", disparou: true });
    const [url, init] = f.mock.calls[1];
    expect(url).toContain("/actions/workflows/coleta.yml/dispatches");
    expect(JSON.parse(init.body)).toEqual({ ref: "main", inputs: { gatilho: "botao" } });
  });
  it("erro do GitHub vira mensagem, sem quebrar o site", async () => {
    const f = vi.fn().mockResolvedValueOnce(resposta(401, {}));
    expect(await estadoDaColeta("t", f)).toEqual({ estado: "erro", mensagem: "GitHub respondeu 401" });
  });
});
