/** Sessão em cookie assinado (JWT HS256). Funciona no proxy e no servidor. */
import { SignJWT, jwtVerify } from "jose";

export const COOKIE_SESSAO = "argus_sessao";
export const DURACAO_SEGUNDOS = 60 * 60 * 24 * 30;

export async function criarToken(segredo: Uint8Array, agora = Date.now()): Promise<string> {
  const emitido = Math.floor(agora / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("argus")
    .setIssuedAt(emitido)
    .setExpirationTime(emitido + DURACAO_SEGUNDOS)
    .sign(segredo);
}

export async function tokenValido(token: string | undefined, segredo: Uint8Array): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, segredo, { algorithms: ["HS256"], subject: "argus" });
    return typeof payload.exp === "number";
  } catch {
    return false;
  }
}
