/**
 * "Ver mais" montado por dados (lib/geral/motor.ts): seções com parágrafos, minigráficos,
 * tabela e números. Usado pelas abas com o motor comum.
 */
import { MiniGrafico } from "@/components/geral/mini-grafico";
import type { VerMaisDados } from "@/lib/geral/motor";

export function VerMaisGenerico({ v }: { v: VerMaisDados }) {
  return (
    <>
      {v.secoes.map((s) => (
        <section key={s.titulo} className="mt-6 first:mt-0">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-texto-3">{s.titulo}</h3>
          {s.paragrafos?.map((p) => <p key={p} className="mb-2 text-sm leading-relaxed text-texto-2">{p}</p>)}
          {s.graficos && (
            <div className="grid gap-3 sm:grid-cols-2">
              {s.graficos.map((g) => <MiniGrafico key={g.titulo} {...g} />)}
            </div>
          )}
          {s.tabela && (
            <table className="num w-full text-xs">
              <thead className="text-left text-texto-3">
                <tr>{s.tabela.colunas.map((c, i) => <th key={c} className={`py-1 font-normal ${i ? "text-right" : "font-sans"}`}>{c}</th>)}</tr>
              </thead>
              <tbody>
                {s.tabela.linhas.map((l, i) => (
                  <tr key={i} className="border-t border-linha">
                    {l.map((c, j) => <td key={j} className={`py-1.5 ${j ? "text-right" : "font-sans text-texto"}`}>{c ?? "—"}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {s.numeros && (
            <dl className="num grid max-w-md gap-2 rounded-controle border border-linha bg-fundo/40 p-3 text-sm">
              {s.numeros.map(([k, val]) => (
                <div key={k} className="flex justify-between gap-4"><dt className="font-sans text-texto-2">{k}</dt><dd>{val}</dd></div>
              ))}
            </dl>
          )}
        </section>
      ))}
    </>
  );
}
