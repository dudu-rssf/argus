"use client";

/**
 * Gaveta lateral: um botão abre um painel à direita com conteúdo aprofundado (o "Ver mais").
 * Fecha no X, no Esc ou clicando fora. O conteúdo pode vir pronto do servidor (children).
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
  /** "botao" = botão "Ver mais"; "icone" = ícone compacto para linhas de tabela. */
  variante?: "botao" | "icone";
  rotulo?: string;
};

export function Gaveta({ titulo, subtitulo, children, variante = "botao", rotulo = "Ver mais" }: Props) {
  const [aberta, setAberta] = useState(false);
  const painel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberta) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAberta(false); };
    document.addEventListener("keydown", esc);
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    painel.current?.focus();
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = antes; };
  }, [aberta]);

  const gatilho = variante === "icone" ? (
    <button type="button" onClick={() => setAberta(true)} aria-label={`${rotulo}: ${titulo}`} title={rotulo}
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-linha-forte text-[11px] leading-none text-texto-3 transition-colors hover:border-ouro hover:text-ouro">
      ?
    </button>
  ) : (
    <button type="button" onClick={() => setAberta(true)} aria-label={`${rotulo}: ${titulo}`}
      className="inline-flex items-center gap-1 rounded-controle border border-linha-forte px-2 py-0.5 text-[11px] font-medium text-texto-2 transition-colors hover:border-ouro hover:text-ouro">
      {rotulo} <span aria-hidden>→</span>
    </button>
  );

  return (
    <>
      {gatilho}
      {aberta && createPortal(
        <div className="fixed inset-0 z-50 flex justify-end">
          <button type="button" aria-label="Fechar" tabIndex={-1} onClick={() => setAberta(false)} className="absolute inset-0 bg-fundo/70 backdrop-blur-[2px]" />
          <div ref={painel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={titulo}
            className="relative flex h-full w-full max-w-3xl flex-col border-l border-linha-forte bg-painel outline-none">
            <header className="flex items-start justify-between gap-4 border-b border-linha px-6 py-4">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold tracking-tight text-texto">{titulo}</h2>
                {subtitulo && <p className="mt-0.5 text-sm text-texto-2">{subtitulo}</p>}
              </div>
              <button type="button" onClick={() => setAberta(false)} aria-label="Fechar painel"
                className="shrink-0 whitespace-nowrap rounded-controle border border-linha-forte px-2 py-1 text-xs text-texto-2 hover:text-texto">Fechar ✕</button>
            </header>
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
