import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { lerConfigAuth } from "./config";
import { COOKIE_SESSAO, tokenValido } from "./sessao";

/** Segunda checagem, dentro das páginas: o proxy já barrou, mas não confiamos só nele. */
export async function exigirSessao(): Promise<void> {
  // Ler o cookie primeiro torna a página dinâmica: nunca é pré-gerada no build.
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  const cfg = lerConfigAuth();
  if (!cfg.ok) redirect("/configurar");
  if (!(await tokenValido(token, cfg.segredo))) redirect("/login");
}
