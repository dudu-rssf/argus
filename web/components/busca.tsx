"use client";

/**
 * Busca rápida (Ctrl+K, ⌘K ou "/"): encontra qualquer painel de qualquer aba e as seções
 * da Central e da aba Análises. Setas para escolher, Enter para ir, Esc para fechar.
 */
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export type ItemBusca = { titulo: string; onde: string; href: string; termos?: string };

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function Busca({ itens }: { itens: ItemBusca[] }) {
  const [aberta, setAberta] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const entrada = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const digitando = /input|textarea|select/i.test((e.target as HTMLElement)?.tagName ?? "");
      if ((e.key === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !digitando)) {
        e.preventDefault(); setAberta(true);
      } else if (e.key === "Escape") setAberta(false);
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, []);
  useEffect(() => { if (aberta) { setQ(""); setSel(0); setTimeout(() => entrada.current?.focus(), 0); } }, [aberta]);

  const achados = useMemo(() => {
    const partes = normalizar(q).split(/\s+/).filter(Boolean);
    const lista = itens.filter((i) => partes.every((p) => normalizar(`${i.titulo} ${i.onde} ${i.termos ?? ""}`).includes(p)));
    return lista.slice(0, 40);
  }, [q, itens]);

  const ir = (i: ItemBusca) => { setAberta(false); router.push(i.href); };

  return (
    <>
      <button type="button" onClick={() => setAberta(true)}
        className="flex h-8 items-center gap-3 rounded-controle border border-linha px-3 text-texto-3 hover:border-linha-forte hover:text-texto-2">
        <span>Buscar indicador</span>
        <kbd className="num rounded-sm border border-linha px-1 text-[10px]">Ctrl K</kbd>
      </button>
      {aberta && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-fundo/80 px-4 pt-[12vh] backdrop-blur-sm" onClick={() => setAberta(false)}>
          <div role="dialog" aria-label="Buscar indicador" onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-painel border border-linha-forte bg-painel">
            <input
              ref={entrada} value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, achados.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
                if (e.key === "Enter" && achados[sel]) ir(achados[sel]);
              }}
              placeholder="IPCA, desocupação, dívida bruta, regra de Taylor…" aria-label="Buscar"
              className="w-full border-b border-linha bg-transparent px-4 py-3 text-base text-texto outline-none placeholder:text-texto-3"
            />
            <ul className="max-h-[50vh] overflow-auto py-1" role="listbox">
              {achados.length === 0 && <li className="px-4 py-6 text-center text-sm text-texto-3">Nada encontrado. Tente outro nome.</li>}
              {achados.map((i, k) => (
                <li key={i.href + i.titulo} role="option" aria-selected={k === sel}>
                  <button type="button" onMouseEnter={() => setSel(k)} onClick={() => ir(i)}
                    className={`flex w-full items-baseline justify-between gap-3 px-4 py-2 text-left text-sm ${k === sel ? "bg-ouro-tenue text-texto" : "text-texto-2"}`}>
                    <span className="truncate">{i.titulo}</span>
                    <span className="shrink-0 text-xs text-texto-3">{i.onde}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
