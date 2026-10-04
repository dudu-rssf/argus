import type { Evento } from "@/lib/db";
import { fmtData } from "@/lib/formato";

/** Textos oficiais (ex.: comunicados do Copom), na íntegra, como a fonte publicou. */
export function PainelEventos({ titulo, eventos, fonte }: { titulo: string; eventos: Evento[]; fonte: string }) {
  return (
    <article className="flex flex-col rounded-painel border border-linha bg-painel">
      <header className="border-b border-linha px-4 py-3">
        <h2 className="font-medium text-texto">{titulo}</h2>
      </header>
      {eventos.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-texto-2">Nenhum texto no banco ainda. Confira a página Saúde dos dados.</p>
      ) : (
        <ul className="divide-y divide-linha">
          {eventos.map((e, i) => (
            <li key={e.id}>
              <details open={i === 0} className="group px-4 py-3">
                <summary className="flex cursor-pointer list-none items-baseline justify-between gap-3">
                  <span className="text-sm text-texto">{e.titulo}</span>
                  <span className="num shrink-0 text-xs text-texto-3">{fmtData(e.data_ref, "Diária")}</span>
                </summary>
                {e.texto ? (
                  <div className="mt-3 max-h-96 overflow-auto whitespace-pre-line text-sm leading-relaxed text-texto-2">{e.texto}</div>
                ) : (
                  <p className="mt-3 text-sm text-texto-3">A fonte não publica o texto desta reunião; só o PDF.</p>
                )}
                {e.url && <a href={e.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-ouro hover:underline">Abrir PDF oficial</a>}
              </details>
            </li>
          ))}
        </ul>
      )}
      <footer className="mt-auto border-t border-linha px-4 py-2 text-xs text-texto-3">Fonte: {fonte}</footer>
    </article>
  );
}
