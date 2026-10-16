"use client";

/**
 * Botão "i": um clique abre uma explicação curta ao lado do título; clique fora ou Esc fecha.
 */
import { useEffect, useId, useRef, useState } from "react";

export function Info({ titulo, children, lado = "esquerda" }: { titulo: string; children: React.ReactNode; lado?: "esquerda" | "direita" }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", fora); document.removeEventListener("keydown", esc); };
  }, [aberto]);
  return (
    <span ref={ref} className="relative inline-flex align-middle">
      <button
        type="button" onClick={() => setAberto((a) => !a)} aria-expanded={aberto} aria-controls={id}
        aria-label={`Sobre: ${titulo}`}
        className={`inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] font-semibold leading-none transition-colors ${
          aberto ? "border-ouro bg-ouro-tenue text-ouro" : "border-linha-forte text-texto-3 hover:border-texto-3 hover:text-texto"}`}
      >
        i
      </button>
      {aberto && (
        <span
          id={id} role="dialog" aria-label={titulo}
          className={`absolute top-6 z-40 block w-80 max-w-[85vw] rounded-controle border border-linha-forte bg-painel-alto p-3 text-left text-xs font-normal leading-relaxed text-texto-2 ${lado === "esquerda" ? "left-0" : "right-0"}`}
        >
          <span className="mb-1 block text-sm font-medium text-texto">{titulo}</span>
          {children}
        </span>
      )}
    </span>
  );
}
