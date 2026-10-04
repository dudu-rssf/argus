"use client";

import { useActionState } from "react";
import { entrar, type EstadoLogin } from "./acoes";

export function FormularioLogin({ de }: { de: string }) {
  const [estado, acao, enviando] = useActionState<EstadoLogin, FormData>(entrar, {});
  return (
    <form action={acao} className="flex flex-col gap-3">
      <input type="hidden" name="de" value={de} />
      <label htmlFor="senha" className="text-sm text-texto-2">Senha</label>
      <input
        id="senha" name="senha" type="password" autoComplete="current-password" required autoFocus
        className="h-10 rounded-controle border border-linha-forte bg-fundo px-3 text-texto outline-none focus:border-ouro"
      />
      {estado.erro && <p role="alert" className="text-sm text-baixa">{estado.erro}</p>}
      <button
        type="submit" disabled={enviando}
        className="mt-2 h-10 rounded-controle bg-ouro font-medium text-fundo hover:bg-ouro-forte disabled:opacity-60"
      >
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
