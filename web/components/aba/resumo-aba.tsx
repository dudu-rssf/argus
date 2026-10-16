/**
 * Topo de cada aba (Fase 6b): fichas dos indicadores principais com minicurva e o que
 * mais mudou. Componente de servidor; o "i" e a Fórmula são interativos.
 */
import { RodapeFormula } from "@/components/formula";
import { Info } from "@/components/info";
import { Minicurva } from "@/components/minicurva";
import { fmtData, fmtNumero } from "@/lib/formato";
import { FORMULA_TRAJETORIA, FORMULAS_RESUMO } from "@/lib/formulas";
import type { Direcao } from "@/lib/leitura";
import type { FichaResumo, Mudanca } from "@/lib/resumo";

const SETA: Record<Direcao, { s: string; t: string }> = {
  subiu: { s: "↗", t: "subiu" }, caiu: { s: "↘", t: "caiu" }, estavel: { s: "→", t: "estável" },
};

function casas(unidade: string, medida: string) {
  return medida === "Nível" && /mil|postos|pessoas|R\$|US\$|pontos/i.test(unidade) ? 0 : 2;
}

const sinal = (v: number, c = 2) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${fmtNumero(Math.abs(v), c)}`;

export function ResumoAba({ titulo, descricao, fichas, mudancas }: {
  titulo: string; descricao?: string | null; fichas: FichaResumo[]; mudancas: Mudanca[];
}) {
  return (
    <article aria-label={`Resumo: ${titulo}`} className="rounded-painel border border-linha bg-painel">
      <header className="flex flex-wrap items-baseline justify-between gap-2 px-4 pt-3">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
          Resumo
          <Info titulo={`Resumo de ${titulo}`}>
            Os indicadores principais da aba, cada um na medida indicada embaixo do nome, com a diferença para o período
            anterior, a minicurva dos últimos 24 meses e a direção em 3 e 12 meses. Embaixo, os painéis em que o último
            movimento foi maior que o normal da própria série.
          </Info>
        </h2>
        {descricao && <p className="max-w-2xl text-xs text-texto-3">{descricao}</p>}
      </header>
      <div className="mt-3 grid grid-cols-2 gap-px border-y border-linha bg-linha sm:grid-cols-3 xl:grid-cols-6">
        {fichas.map((f) => {
          const c = casas(f.item.unidade, f.medida);
          return (
            <div key={f.item.dado} className="flex min-w-0 flex-col gap-1 bg-painel px-3 py-3">
              <div className="flex items-center justify-between gap-1">
                <span className="truncate text-xs font-medium text-texto-2">{f.item.rotulo}</span>
                <Info titulo={f.item.rotulo} lado="direita">
                  <span className="block text-texto">{f.item.indicador}</span>
                  <span className="block">Fonte: {f.item.fonte} · código {f.item.codigo === "derivado" ? "calculado pelo Argus" : f.item.codigo}</span>
                  <span className="block">{f.item.frequencia} · {f.item.unidade}</span>
                  <span className="block">Mostrando: {f.medida.toLowerCase()}.</span>
                  {f.item.observacao && <span className="block">{f.item.observacao}</span>}
                </Info>
              </div>
              <span className="truncate text-[11px] text-texto-3">{f.medida}</span>
              {f.ultimo ? (
                <>
                  <span className="num text-xl font-medium text-texto">{fmtNumero(f.ultimo.valor, c)}</span>
                  <span className="num flex items-center gap-2 text-[11px]">
                    {f.delta !== null && (
                      <span className={f.delta > 0 ? "text-alta" : f.delta < 0 ? "text-baixa" : "text-texto-3"}>
                        {f.delta > 0 ? "▲" : f.delta < 0 ? "▼" : "■"} {sinal(f.delta, f.emPontos ? 2 : 1)}{f.emPontos ? " p.p." : "%"}
                      </span>
                    )}
                    <span className="text-texto-3">{fmtData(f.ultimo.data, f.item.frequencia)}</span>
                  </span>
                  <Minicurva pontos={f.minicurva} />
                  <span className="text-[11px] text-texto-3">
                    3m {f.curto ? <span title={SETA[f.curto].t} className="text-texto-2">{SETA[f.curto].s} {SETA[f.curto].t}</span> : "—"}
                    {"  ·  "}12m {f.medio ? <span title={SETA[f.medio].t} className="text-texto-2">{SETA[f.medio].s} {SETA[f.medio].t}</span> : "—"}
                  </span>
                </>
              ) : <span className="text-sm text-texto-3">Sem dados no banco.</span>}
            </div>
          );
        })}
      </div>
      {mudancas.length > 0 && (
        <div className="px-4 py-3">
          <p className="text-xs text-texto-3">O que mais mudou no último dado</p>
          <ul className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
            {mudancas.map((m) => (
              <li key={m.painelId}>
                <a href={`#${m.painelId}`} className="group block rounded-controle border border-linha px-3 py-2 hover:border-linha-forte hover:bg-realce">
                  <span className="block truncate text-sm text-texto group-hover:text-ouro">{m.titulo}</span>
                  <span className="num block text-xs text-texto-2">
                    {m.rotulo}: <span className={m.delta > 0 ? "text-alta" : "text-baixa"}>{sinal(m.delta)}{m.emPontos ? " p.p." : "%"}</span>
                    {" "}em {fmtData(m.ultimo.data, m.frequencia)}
                  </span>
                  <span className="num block text-xs text-texto-3">{fmtNumero(m.razao, 1)}× o movimento típico ({fmtNumero(m.tipico)})</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <RodapeFormula formulas={[FORMULAS_RESUMO.fichas, FORMULAS_RESUMO.mudancas, FORMULA_TRAJETORIA]} />
    </article>
  );
}

/** Índice da aba: atalhos para cada painel. */
export function IndiceAba({ paineis }: { paineis: { id?: string; titulo: string }[] }) {
  return (
    <nav aria-label="Painéis desta aba" className="flex flex-wrap gap-1.5">
      {paineis.filter((p) => p.id).map((p) => (
        <a key={p.id} href={`#${p.id}`}
          className="rounded-controle border border-linha px-2 py-1 text-xs text-texto-2 hover:border-linha-forte hover:text-texto">
          {p.titulo}
        </a>
      ))}
    </nav>
  );
}
