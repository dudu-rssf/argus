/**
 * Configuração do login (decisões 0004 e 0012). Falha fechada: sem senha ou sem
 * segredo válidos, `ok` é falso e o site inteiro fica bloqueado.
 */
export type ConfigAuth =
  | { ok: true; segredo: Uint8Array; hash: string }
  | { ok: false; motivo: string };

export const TAMANHO_MINIMO_SEGREDO = 32;

export function lerConfigAuth(env: Record<string, string | undefined> = process.env): ConfigAuth {
  const segredo = env.AUTH_SECRET?.trim();
  const hash = env.ARGUS_SENHA_HASH?.trim();
  if (!segredo) return { ok: false, motivo: "AUTH_SECRET não configurado" };
  if (segredo.length < TAMANHO_MINIMO_SEGREDO)
    return { ok: false, motivo: `AUTH_SECRET com menos de ${TAMANHO_MINIMO_SEGREDO} caracteres` };
  if (!hash) return { ok: false, motivo: "ARGUS_SENHA_HASH não configurado" };
  if (!/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(hash))
    return { ok: false, motivo: "ARGUS_SENHA_HASH não é um hash bcrypt válido" };
  return { ok: true, segredo: new TextEncoder().encode(segredo), hash };
}
