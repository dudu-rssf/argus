import { afterEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { lerConfigAuth } from "@/lib/auth/config";
import { COOKIE_SESSAO, criarToken, tokenValido } from "@/lib/auth/sessao";
import { bloqueado, limparErros, MAX_ERROS, registrarErro } from "@/lib/auth/limite";
import { destinoSeguro } from "@/lib/auth/destino";
import { proxy } from "@/proxy";

const SEGREDO = "s".repeat(40);
const HASH = bcrypt.hashSync("senha-de-teste", 4);

function req(caminho: string, cookie?: string) {
  const r = new NextRequest(new URL(caminho, "https://argus.test"));
  if (cookie) r.cookies.set(COOKIE_SESSAO, cookie);
  return r;
}

afterEach(() => vi.unstubAllEnvs());

describe("configuração do acesso (falha fechada)", () => {
  it("bloqueia sem segredo, com segredo curto, sem hash ou com hash inválido", () => {
    expect(lerConfigAuth({ ARGUS_SENHA_HASH: HASH }).ok).toBe(false);
    expect(lerConfigAuth({ AUTH_SECRET: "curto", ARGUS_SENHA_HASH: HASH }).ok).toBe(false);
    expect(lerConfigAuth({ AUTH_SECRET: SEGREDO }).ok).toBe(false);
    expect(lerConfigAuth({ AUTH_SECRET: SEGREDO, ARGUS_SENHA_HASH: "minhasenha" }).ok).toBe(false);
  });
  it("libera só com as duas variáveis válidas", () => {
    expect(lerConfigAuth({ AUTH_SECRET: SEGREDO, ARGUS_SENHA_HASH: HASH }).ok).toBe(true);
  });
});

describe("sessão", () => {
  const chave = new TextEncoder().encode(SEGREDO);
  it("aceita token assinado com o segredo", async () => {
    expect(await tokenValido(await criarToken(chave), chave)).toBe(true);
  });
  it("recusa token de outro segredo, adulterado, vencido ou ausente", async () => {
    const outro = new TextEncoder().encode("x".repeat(40));
    expect(await tokenValido(await criarToken(outro), chave)).toBe(false);
    expect(await tokenValido((await criarToken(chave)) + "a", chave)).toBe(false);
    expect(await tokenValido(await criarToken(chave, Date.now() - 31 * 864e5), chave)).toBe(false);
    expect(await tokenValido(undefined, chave)).toBe(false);
  });
});

describe("limite de tentativas", () => {
  it("bloqueia após 5 erros e libera depois de 15 minutos", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < MAX_ERROS; i++) registrarErro("ip-1", t0);
    expect(bloqueado("ip-1", t0 + 1000)).toBe(true);
    expect(bloqueado("ip-1", t0 + 15 * 60 * 1000 + 1)).toBe(false);
    limparErros("ip-1");
  });
});

describe("destino depois do login", () => {
  it("só aceita caminhos internos", () => {
    expect(destinoSeguro("/dados")).toBe("/dados");
    expect(destinoSeguro("//evil.com")).toBe("/");
    expect(destinoSeguro("https://evil.com")).toBe("/");
    expect(destinoSeguro("/\\evil.com")).toBe("/");
    expect(destinoSeguro(null)).toBe("/");
  });
});

describe("proxy", () => {
  it("sem configuração, manda tudo para /configurar e bloqueia a API", async () => {
    vi.stubEnv("AUTH_SECRET", "");
    vi.stubEnv("ARGUS_SENHA_HASH", "");
    expect((await proxy(req("/"))).headers.get("location")).toBe("https://argus.test/configurar");
    expect((await proxy(req("/login"))).headers.get("location")).toBe("https://argus.test/configurar");
    expect((await proxy(req("/api/atualizar"))).status).toBe(503);
    expect((await proxy(req("/configurar"))).headers.get("location")).toBeNull();
  });

  it("configurado e sem sessão, redireciona ao login guardando o destino", async () => {
    vi.stubEnv("AUTH_SECRET", SEGREDO);
    vi.stubEnv("ARGUS_SENHA_HASH", HASH);
    const r = await proxy(req("/dados?filtro=erro"));
    expect(r.headers.get("location")).toBe("https://argus.test/login?de=%2Fdados%3Ffiltro%3Derro");
    expect((await proxy(req("/api/atualizar"))).status).toBe(401);
    expect((await proxy(req("/configurar"))).headers.get("location")).toBe("https://argus.test/login");
  });

  it("configurado e com sessão válida, deixa passar", async () => {
    vi.stubEnv("AUTH_SECRET", SEGREDO);
    vi.stubEnv("ARGUS_SENHA_HASH", HASH);
    const token = await criarToken(new TextEncoder().encode(SEGREDO));
    const r = await proxy(req("/dados", token));
    expect(r.headers.get("location")).toBeNull();
    expect(r.status).toBe(200);
  });
});
