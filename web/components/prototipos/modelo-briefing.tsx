/**
 * Protótipo C — Briefing: leitura primeiro. As 5 frases mais relevantes do momento, depois
 * os números do mês e dois gráficos.
 */
import { RodapeFormula } from "@/components/formula";
import { PainelGrafico } from "@/components/grafico/painel-grafico";
import { Info } from "@/components/info";
import { Minicurva } from "@/components/minicurva";
import type { Painel } from "@/lib/config";
import { fmtData, fmtNumero } from "@/lib/formato";
import { FORMULA_FATOS, FORMULAS_PROTOTIPOS } from "@/lib/formulas";
import type { Medida } from "@/lib/prototipos";
import type { Ponto } from "@/lib/transform";

const sinal = (v: number | null) => (v === null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${fmtNumero(Math.abs(v))}`);

export function ModeloBriefing({ medidas, graficos, dados }: { medidas: Medida[]; graficos: Painel[]; dados: Record<string, Ponto[]> }) {
  const destaques = medidas.filter((m) => m.fatos && m.frase).sort((a, b) => b.fatos!.relevancia - a.fatos!.relevancia).slice(0, 5);
  const ipca = medidas.find((m) => m.id === "ipca12");
  const sub = (p: Painel) => Object.fromEntries(p.series.map((s) => [s.dado, dados[s.dado] ?? []]));
  return (
    <div className="flex flex-col gap-6">
      <article className="rounded-painel border border-linha bg-painel">
        <header className="px-5 pt-4">
          <p className="text-xs text-texto-3">
            Leitura de {ipca?.fatos ? fmtData(ipca.fatos.ultimo.data) : "—"}
          </p>
          <h2 className="mt-1 text-2xl font-semibold leading-snug tracking-tight">
            {ipca?.frase ?? "Sem dados de IPCA no banco."}
          </h2>
        </header>
        <div className="mt-4 flex items-center gap-2 px-5 text-xs text-texto-3">
          O que mais se moveu
          <Info titulo="O que mais se moveu">As medidas ordenadas pelo tamanho do movimento recente contra o normal da própria série, por sequências longas e por "maior/menor desde". O botão Fórmula tem a regra.</Info>
        </div>
        <ol className="mt-2 divide-y divide-linha border-y border-linha">
          {destaques.map((m) => {
            const corte = `${Number(m.fatos!.ultimo.data.slice(0, 4)) - 2}${m.fatos!.ultimo.data.slice(4)}`;
            return (
              <li key={m.id} className="grid grid-cols-[minmax(0,1fr)_140px] items-center gap-4 px-5 py-3">
                <p className="text-[15px] leading-relaxed text-texto">{m.frase}</p>
                <Minicurva pontos={m.serie.filter((p) => p.data > corte)} />
              </li>
            );
          })}
        </ol>
        <RodapeFormula formulas={[FORMULA_FATOS, FORMULAS_PROTOTIPOS.relevancia]} />
      </article>

      <article className="rounded-painel border border-linha bg-painel">
        <header className="px-5 pt-4"><h2 className="text-[15px] font-semibold tracking-tight">Os números</h2></header>
        <div className="mt-2 overflow-x-auto">
          <table className="num w-full whitespace-nowrap text-xs">
            <thead className="text-left text-texto-3">
              <tr><th className="px-5 py-2 font-sans font-normal">Medida</th><th className="px-3 py-2 text-right font-normal">Último</th>
                <th className="px-3 py-2 text-right font-normal">Δ 3m</th><th className="px-3 py-2 text-right font-normal">Δ 12m</th>
                <th className="px-5 py-2 text-right font-normal">vs meta</th></tr>
            </thead>
            <tbody>
              {medidas.map((m) => (
                <tr key={m.id} className="border-t border-linha">
                  <td className="px-5 py-1.5 font-sans text-sm text-texto-2">{m.rotulo}</td>
                  <td className="px-3 py-1.5 text-right text-texto">{m.fatos ? fmtNumero(m.fatos.ultimo.valor) : "—"}</td>
                  <td className="px-3 py-1.5 text-right text-texto-2">{sinal(m.fatos?.d3 ?? null)}</td>
                  <td className="px-3 py-1.5 text-right text-texto-2">{sinal(m.fatos?.d12 ?? null)}</td>
                  <td className="px-5 py-1.5 text-right text-texto-2">{m.fatos?.vsMeta == null ? "—" : sinal(m.fatos.vsMeta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <RodapeFormula formulas={[FORMULA_FATOS]} />
      </article>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {graficos.map((p) => <PainelGrafico key={p.titulo} painel={p} dados={sub(p)} />)}
      </div>
    </div>
  );
}
