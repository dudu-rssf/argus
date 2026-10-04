"use client";

import bcrypt from "bcryptjs";
import { useState } from "react";

function segredoAleatorio(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(36));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_");
}

function Campo({ nome, valor }: { nome: string; valor: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="rounded-controle border border-linha bg-fundo p-3">
      <div className="mb-1 flex items-center justify-between">
        <code className="text-sm text-ouro">{nome}</code>
        <button
          type="button"
          onClick={async () => { await navigator.clipboard.writeText(valor); setCopiado(true); }}
          className="text-xs text-texto-2 hover:text-texto"
        >
          {copiado ? "Copiado" : "Copiar valor"}
        </button>
      </div>
      <code className="num block break-all text-xs text-texto">{valor}</code>
    </div>
  );
}

/** Tudo acontece no navegador: a senha nunca é enviada a nenhum servidor. */
export function Gerador() {
  const [senha, setSenha] = useState("");
  const [hash, setHash] = useState("");
  const [segredo] = useState(segredoAleatorio);
  const [gerando, setGerando] = useState(false);

  async function gerar(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 12) return;
    setGerando(true);
    setHash(await bcrypt.hash(senha, 12));
    setSenha("");
    setGerando(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={gerar} className="flex flex-col gap-2">
        <label htmlFor="senha" className="text-sm text-texto-2">
          Escolha a senha do Argus (mínimo 12 caracteres)
        </label>
        <div className="flex gap-2">
          <input
            id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
            minLength={12} autoComplete="new-password"
            className="h-10 flex-1 rounded-controle border border-linha-forte bg-fundo px-3 outline-none focus:border-ouro"
          />
          <button
            type="submit" disabled={senha.length < 12 || gerando}
            className="h-10 rounded-controle bg-ouro px-4 font-medium text-fundo disabled:opacity-50"
          >
            {gerando ? "Gerando…" : "Gerar hash"}
          </button>
        </div>
      </form>
      {hash && <Campo nome="ARGUS_SENHA_HASH" valor={hash} />}
      <Campo nome="AUTH_SECRET" valor={segredo} />
    </div>
  );
}
