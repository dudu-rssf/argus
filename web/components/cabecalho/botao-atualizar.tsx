"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { EstadoColeta } from "@/lib/github";

/** Dispara a coleta completa e acompanha até terminar; então recarrega os dados da página. */
export function BotaoAtualizar() {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoColeta | null>(null);
  const [mensagem, setMensagem] = useState("");
  const acompanhando = useRef(false);

  const acompanhar = useCallback(async () => {
    if (acompanhando.current) return;
    acompanhando.current = true;
    try {
      for (let i = 0; i < 120; i++) {
        await new Promise((r) => setTimeout(r, 10_000));
        const e = (await (await fetch("/api/atualizar")).json()) as EstadoColeta;
        setEstado(e);
        if (e.estado !== "rodando") {
          const ok = e.estado === "ocioso" && e.ultima?.conclusao === "success";
          setMensagem(ok ? "Dados atualizados" : "A coleta terminou com falhas. Veja a Saúde dos dados.");
          router.refresh();
          return;
        }
      }
    } finally {
      acompanhando.current = false;
    }
  }, [router]);

  useEffect(() => {
    fetch("/api/atualizar").then((r) => r.json()).then((e: EstadoColeta) => {
      setEstado(e);
      if (e.estado === "rodando") acompanhar();
    }).catch(() => setEstado({ estado: "erro", mensagem: "sem resposta do servidor" }));
  }, [acompanhar]);

  async function atualizar() {
    setMensagem("");
    const e = (await (await fetch("/api/atualizar", { method: "POST" })).json()) as EstadoColeta;
    setEstado(e);
    if (e.estado === "rodando") acompanhar();
    if (e.estado === "erro") setMensagem(e.mensagem);
  }

  const rodando = estado?.estado === "rodando";
  const indisponivel = estado?.estado === "sem_token";
  return (
    <span className="flex items-center gap-3">
      {mensagem && <span role="status" className="text-texto-2">{mensagem}</span>}
      <button
        type="button" onClick={atualizar} disabled={rodando || indisponivel || !estado}
        title={indisponivel ? "Falta GITHUB_TOKEN nas variáveis da Vercel" : undefined}
        className="flex h-8 items-center gap-2 rounded-controle border border-ouro px-3 text-ouro hover:bg-ouro-tenue disabled:border-linha-forte disabled:text-texto-3"
      >
        {rodando && <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-ouro" />}
        {rodando ? "Atualizando… (alguns minutos)" : "Atualizar"}
      </button>
    </span>
  );
}
