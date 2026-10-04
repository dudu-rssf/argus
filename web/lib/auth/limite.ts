/**
 * Limite de tentativas de login: 5 erros em 15 minutos bloqueiam por 15 minutos.
 * Fica na memória de cada instância do servidor; é uma barreira contra tentativa
 * repetida, somada ao custo do bcrypt, não uma garantia distribuída.
 */
export const MAX_ERROS = 5;
export const JANELA_MS = 15 * 60 * 1000;

const erros = new Map<string, number[]>();

export function bloqueado(chave: string, agora = Date.now()): boolean {
  const recentes = (erros.get(chave) ?? []).filter((t) => agora - t < JANELA_MS);
  erros.set(chave, recentes);
  return recentes.length >= MAX_ERROS;
}

export function registrarErro(chave: string, agora = Date.now()): void {
  erros.set(chave, [...(erros.get(chave) ?? []), agora]);
}

export function limparErros(chave: string): void {
  erros.delete(chave);
}
