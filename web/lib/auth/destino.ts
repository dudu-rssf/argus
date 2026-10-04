/** Para onde voltar depois do login: só caminhos internos (evita redirecionar para fora). */
export function destinoSeguro(de: string | null | undefined): string {
  if (!de || !de.startsWith("/") || de.startsWith("//") || de.startsWith("/\\")) return "/";
  if (de.startsWith("/login") || de.startsWith("/configurar")) return "/";
  return de;
}
