"use client";

/**
 * "Ver mais" integrado à aba: um botão abre o conteúdo aprofundado dentro da própria página,
 * num painel que se abre no lugar indicado por `alvo` (o id de um <PainelVerMais />), logo
 * abaixo do bloco. Só um painel aberto por alvo: abrir outro fecha o anterior. Fecha no
 * botão "Fechar", no Esc ou clicando de novo no mesmo botão. O conteúdo vem pronto do servidor.
 */
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
  /** id do <PainelVerMais /> onde o conteúdo aparece. */
  alvo: string;
  /** "botao" = botão "Ver mais"; "icone" = ícone compacto para linhas de tabela. */
  variante?: "botao" | "icone";
  rotulo?: string;
};

const EVENTO = "argus-ver-mais";

/** Lugar da página onde os "Ver mais" de um bloco se abrem. */
export function PainelVerMais({ id, className = "" }: { id: string; className?: string }) {
  return <div id={id} className={`empty:hidden ${className}`} />;
}

export function Gaveta({ titulo, subtitulo, children, alvo, variante = "botao", rotulo = "Ver mais" }: Props) {
  const [aberta, setAberta] = useState(false);
  const [destino, setDestino] = useState<HTMLElement | null>(null);
  const meu = useId();
  const painel = useRef<HTMLElement>(null);

  useEffect(() => {
    const outro = (e: Event) => {
      const d = (e as CustomEvent<{ alvo: string; id: string }>).detail;
      if (d.alvo === alvo && d.id !== meu) setAberta(false);
    };
    window.addEventListener(EVENTO, outro);
    return () => window.removeEventListener(EVENTO, outro);
  }, [alvo, meu]);

  useEffect(() => {
    if (!aberta) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAberta(false); };
    document.addEventListener("keydown", esc);
    painel.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    return () => document.removeEventListener("keydown", esc);
  }, [aberta]);

  function alternar() {
    if (aberta) { setAberta(false); return; }
    setDestino(document.getElementById(alvo));
    window.dispatchEvent(new CustomEvent(EVENTO, { detail: { alvo, id: meu } }));
    setAberta(true);
  }

  const gatilho = variante === "icone" ? (
    <button type="button" onClick={alternar} aria-label={`${rotulo}: ${titulo}`} aria-expanded={aberta} title={rotulo}
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] leading-none transition-colors ${
        aberta ? "border-ouro bg-ouro-tenue text-ouro" : "border-linha-forte text-texto-3 hover:border-ouro hover:text-ouro"}`}>
      ?
    </button>
  ) : (
    <button type="button" onClick={alternar} aria-label={`${rotulo}: ${titulo}`} aria-expanded={aberta}
      className={`inline-flex items-center gap-1 rounded-controle border px-2 py-0.5 text-[11px] font-medium transition-colors ${
        aberta ? "border-ouro bg-ouro-tenue text-ouro" : "border-linha-forte text-texto-2 hover:border-ouro hover:text-ouro"}`}>
      {aberta ? "Fechar" : rotulo} <span aria-hidden>{aberta ? "↑" : "↓"}</span>
    </button>
  );

  const conteudo = (
    <section ref={painel} role="region" aria-label={titulo}
      className="scroll-mt-4 rounded-painel border border-ouro/40 bg-painel">
      <header className="flex items-start justify-between gap-4 border-b border-linha px-5 py-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-texto">{titulo}</h2>
          {subtitulo && <p className="mt-0.5 text-sm text-texto-2">{subtitulo}</p>}
        </div>
        <button type="button" onClick={() => setAberta(false)} aria-label="Fechar painel"
          className="shrink-0 whitespace-nowrap rounded-controle border border-linha-forte px-2 py-1 text-xs text-texto-2 hover:text-texto">Fechar ✕</button>
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );

  return (
    <>
      {gatilho}
      {aberta && destino && createPortal(conteudo, destino)}
    </>
  );
}
