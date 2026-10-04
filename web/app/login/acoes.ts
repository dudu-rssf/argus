"use server";

import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { lerConfigAuth } from "@/lib/auth/config";
import { destinoSeguro } from "@/lib/auth/destino";
import { bloqueado, limparErros, registrarErro } from "@/lib/auth/limite";
import { COOKIE_SESSAO, DURACAO_SEGUNDOS, criarToken } from "@/lib/auth/sessao";

export type EstadoLogin = { erro?: string };

export async function entrar(_: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const cfg = lerConfigAuth();
  if (!cfg.ok) redirect("/configurar");

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (bloqueado(ip)) return { erro: "Muitas tentativas erradas. Tente de novo em 15 minutos." };

  const senha = String(form.get("senha") ?? "");
  if (!senha || !(await bcrypt.compare(senha, cfg.hash))) {
    registrarErro(ip);
    return { erro: "Senha incorreta." };
  }

  limparErros(ip);
  (await cookies()).set(COOKIE_SESSAO, await criarToken(cfg.segredo), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACAO_SEGUNDOS,
  });
  redirect(destinoSeguro(String(form.get("de") ?? "/")));
}

export async function sair(): Promise<void> {
  (await cookies()).delete(COOKIE_SESSAO);
  redirect("/login");
}
