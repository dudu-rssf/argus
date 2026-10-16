/**
 * Protótipo A — Perguntas: cada bloco responde uma pergunta com uma frase de leitura,
 * um gráfico principal e "Aprofundar" (fechado) com os detalhes.
 */
import { PainelGrafico } from "@/components/grafico/painel-grafico";
import { Info } from "@/components/info";
import type { Painel } from "@/lib/config";
import type { Medida } from "@/lib/prototipos";
import type { Ponto } from "@/lib/transform";

export type BlocoPergunta = {
  id: string; pergunta: string; explica: string;
  principal: Medida; apoio: Medida[];
  grafico: Painel; aprofundar: Painel[];
};

export function ModeloPerguntas({ blocos, dados }: { blocos: BlocoPergunta[]; dados: Record<string, Ponto[]> }) {
  const sub = (p: Painel) => Object.fromEntries(p.series.map((s) => [s.dado, dados[s.dado] ?? []]));
  return (
    <div className="flex flex-col gap-8">
      {blocos.map((b) => (
        <section key={b.id} id={b.id} aria-labelledby={`${b.id}-t`} className="scroll-mt-20">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div className="flex flex-col gap-3">
              <h2 id={`${b.id}-t`} className="flex items-start gap-2 text-xl font-semibold leading-snug tracking-tight">
                {b.pergunta}<span className="mt-1.5"><Info titulo={b.pergunta}>{b.explica}</Info></span>
              </h2>
              <p className="text-base leading-relaxed text-texto">{b.principal.frase ?? "Sem dados no banco."}</p>
              {b.apoio.length > 0 && (
                <ul className="flex flex-col gap-2 border-l border-linha-forte pl-3 text-sm leading-relaxed text-texto-2">
                  {b.apoio.map((m) => <li key={m.id}>{m.frase ?? `${m.rotulo}: sem dados no banco.`}</li>)}
                </ul>
              )}
            </div>
            <PainelGrafico painel={b.grafico} dados={sub(b.grafico)} />
          </div>
          {b.aprofundar.length > 0 && (
            <details className="group mt-3 rounded-painel border border-linha">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-sm text-texto-2 hover:text-texto">
                <span aria-hidden className="text-texto-3 transition-transform group-open:rotate-90">›</span>
                Aprofundar: {b.aprofundar.map((p) => p.titulo).join(" · ")}
              </summary>
              <div className="grid grid-cols-1 gap-4 border-t border-linha p-4 xl:grid-cols-2">
                {b.aprofundar.map((p) => <PainelGrafico key={p.titulo} painel={p} dados={sub(p)} />)}
              </div>
            </details>
          )}
        </section>
      ))}
    </div>
  );
}
