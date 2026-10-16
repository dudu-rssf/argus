"use client";

/**
 * Estado compartilhado por todos os gráficos de uma aba: o horizonte da aba inteira.
 * Mudar o horizonte da aba reposiciona todos os gráficos; cada gráfico ainda pode
 * escolher o seu depois. As escolhas ficam salvas no navegador (quando permitido).
 */
import { createContext, useContext, useEffect, useState } from "react";

export const HORIZONTES = [
  { id: "1A", anos: 1 }, { id: "3A", anos: 3 }, { id: "5A", anos: 5 }, { id: "10A", anos: 10 }, { id: "Máx", anos: 0 },
] as const;
export type IdHorizonte = (typeof HORIZONTES)[number]["id"];

type Estado = { abaId: string; horizonte: IdHorizonte; versao: number; definir: (h: IdHorizonte) => void };
const Contexto = createContext<Estado | null>(null);

export function lerSalvo<T>(chave: string): T | null {
  try { const v = localStorage.getItem(chave); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
}
export function salvar(chave: string, valor: unknown): void {
  try { localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* navegador sem armazenamento: segue sem lembrar */ }
}

export function EstadoAba({ abaId, children }: { abaId: string; children: React.ReactNode }) {
  const [horizonte, setHorizonte] = useState<IdHorizonte>("10A");
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    const h = lerSalvo<IdHorizonte>(`argus:${abaId}:horizonte`);
    if (h && HORIZONTES.some((x) => x.id === h)) setHorizonte(h);
  }, [abaId]);
  const definir = (h: IdHorizonte) => { setHorizonte(h); setVersao((v) => v + 1); salvar(`argus:${abaId}:horizonte`, h); };
  return <Contexto.Provider value={{ abaId, horizonte, versao, definir }}>{children}</Contexto.Provider>;
}

export const useEstadoAba = () => useContext(Contexto);

export function SeletorHorizonteAba() {
  const e = useEstadoAba();
  if (!e) return null;
  return (
    <div role="group" aria-label="Horizonte de todos os gráficos" className="flex items-center gap-1">
      <span className="mr-1 text-xs text-texto-3">Todos os gráficos</span>
      {HORIZONTES.map((h) => (
        <button key={h.id} type="button" onClick={() => e.definir(h.id)} aria-pressed={e.horizonte === h.id}
          className={`num h-7 rounded-controle px-2 text-xs ${e.horizonte === h.id ? "bg-ouro-tenue text-ouro" : "text-texto-2 hover:bg-realce hover:text-texto"}`}>
          {h.id}
        </button>
      ))}
    </div>
  );
}
