/**
 * Porteiro do site: toda requisição passa aqui antes de qualquer página.
 * Falha fechada (decisões 0004 e 0012): sem configuração de acesso válida,
 * nada abre; só a página /configurar, que ajuda a gerar a configuração.
 */
import { NextResponse, type NextRequest } from "next/server";
import { lerConfigAuth } from "@/lib/auth/config";
import { COOKIE_SESSAO, tokenValido } from "@/lib/auth/sessao";

export async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname, search } = req.nextUrl;
  const cfg = lerConfigAuth();

  if (!cfg.ok) {
    if (pathname === "/configurar") return NextResponse.next();
    if (pathname.startsWith("/api/"))
      return NextResponse.json({ erro: "acesso não configurado" }, { status: 503 });
    return NextResponse.redirect(new URL("/configurar", req.url));
  }

  if (pathname === "/configurar") return NextResponse.redirect(new URL("/login", req.url));
  if (pathname === "/login") return NextResponse.next();

  if (await tokenValido(req.cookies.get(COOKIE_SESSAO)?.value, cfg.segredo)) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ erro: "não autenticado" }, { status: 401 });
  const login = new URL("/login", req.url);
  login.searchParams.set("de", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt).*)"],
};
