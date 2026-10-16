/**
 * Seção Geral da Inflação: em 2 minutos, onde a inflação está, o que a move e o que
 * aconteceu nas outras vezes em que esteve assim. Componente de servidor.
 */
import { RodapeFormula } from "@/components/formula";
import { Info } from "@/components/info";
import { RelogioCiclo } from "@/components/geral/relogio-ciclo";
import { fmtData, fmtNumero } from "@/lib/formato";
import { FORMULAS_GERAL } from "@/lib/formulas";
import type { GeralInflacao } from "@/lib/geral/inflacao";
import { VARIAVEIS_PARECIDAS } from "@/lib/geral/inflacao";
import { FASES } from "@/lib/geral/relogio";
import type { Resposta } from "@/lib/geral/checklist";

const sinal = (v: number, c = 2) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${fmtNumero(Math.abs(v), c)}`;

const SELO: Record<Resposta, string> = {
  Sim: "border-ouro text-ouro",
  Não: "border-texto-3 text-texto-2",
  Parcial: "border-texto-3 text-texto-2 border-dashed",
  "Sem dados": "border-linha text-texto-3",
};

function Bloco({ titulo, explica, children, formula }: {
  titulo: string; explica: string; children: React.ReactNode; formula: Parameters<typeof RodapeFormula>[0]["formulas"][number];
}) {
  return (
    <article className="flex flex-col rounded-painel border border-linha bg-painel">
      <header className="flex items-center gap-2 px-5 pt-4">
        <h2 className="text-base font-semibold tracking-tight">{titulo}</h2>
        <Info titulo={titulo}>{explica}</Info>
      </header>
      <div className="flex-1 px-5 py-4">{children}</div>
      <RodapeFormula formulas={[formula]} />
    </article>
  );
}

export function GeralInflacaoView({ g, frase }: { g: GeralInflacao; frase: string | null }) {
  const r = g.relogio;
  const fase = r ? FASES.find((f) => f.id === r.atual.fase)! : null;
  const maxDelta = Math.max(0.01, ...g.cabo.itens.map((i) => Math.abs(i.delta)));
  const maxAtual = Math.max(0.01, ...g.cabo.itens.map((i) => Math.abs(i.atual)));
  const somaDelta = g.cabo.itens.reduce((s, i) => s + i.delta, 0);

  return (
    <div className="flex flex-col gap-5">
      {frase && (
        <p className="max-w-4xl text-xl leading-snug tracking-tight text-texto md:text-2xl">{frase}</p>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Bloco titulo="Em que fase do ciclo a inflação está" formula={FORMULAS_GERAL.relogio}
          explica="Cruza duas perguntas num desenho só: a inflação está acima ou abaixo da meta (eixo horizontal) e está subindo ou caindo nos últimos 6 meses (eixo vertical). O ponto dourado é hoje; a linha é o caminho dos últimos 24 meses. O ciclo costuma girar no sentido horário.">
          {r && fase ? (
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <RelogioCiclo relogio={r} rotulo="IPCA 12 meses" referencia="meta" />
              <div className="flex min-w-0 flex-col gap-3 sm:pt-4">
                <div>
                  <p className="text-xs text-texto-3">Fase atual</p>
                  <p className="text-2xl font-semibold tracking-tight text-ouro">{fase.nome}</p>
                  <p className="text-sm text-texto-2">{fase.descricao.replace("referência", "meta")}, há {r.mesesNaFase} {r.mesesNaFase === 1 ? "mês" : "meses"}</p>
                </div>
                <dl className="num grid grid-cols-[auto_auto] justify-start gap-x-4 gap-y-1 whitespace-nowrap text-xs">
                  <dt className="font-sans text-texto-3">IPCA 12m</dt><dd className="text-texto">{fmtNumero(r.atual.valor)}%</dd>
                  <dt className="font-sans text-texto-3">vs meta</dt><dd className="text-texto">{sinal(r.atual.nivel)} p.p.</dd>
                  <dt className="font-sans text-texto-3">Δ 6 meses</dt><dd className="text-texto">{sinal(r.atual.direcao)} p.p.</dd>
                  <dt className="font-sans text-texto-3">Dado de</dt><dd className="text-texto">{fmtData(r.atual.data)}</dd>
                </dl>
                <ol className="flex flex-col gap-1 text-xs text-texto-3" aria-label="Fases, no sentido do ciclo">
                  {FASES.map((f) => (
                    <li key={f.id} className={f.id === fase.id ? "text-ouro" : ""}>
                      {f.id === fase.id ? "● " : "○ "}{f.nome}: {f.descricao.replace("referência", "meta")}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ) : <p className="text-sm text-texto-3">Histórico insuficiente no banco.</p>}
        </Bloco>

        <Bloco titulo="Perguntas rápidas" formula={FORMULAS_GERAL.checklist}
          explica="Seis perguntas que se faz para entender a inflação, cada uma respondida por uma regra fixa sobre os dados, com a evidência embaixo. Sim e Não são fatos, não julgamento de bom ou ruim.">
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {g.checklist.map((i) => (
              <li key={i.pergunta} className="flex gap-3 rounded-controle border border-linha bg-fundo/40 p-3">
                <span className={`num flex h-9 min-w-14 shrink-0 items-center justify-center rounded-controle border px-2 text-xs font-semibold ${SELO[i.resposta]}`}>
                  {i.resposta}
                </span>
                <div className="min-w-0">
                  <p className="flex items-start gap-1.5 text-sm font-medium text-texto">
                    {i.pergunta}
                    {i.explica && <span className="mt-0.5"><Info titulo={i.pergunta} lado="direita">{i.explica}</Info></span>}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-texto-2">{i.evidencia}</p>
                </div>
              </li>
            ))}
          </ul>
        </Bloco>
      </div>

      <Bloco titulo="O que está mexendo no IPCA" formula={FORMULAS_GERAL.cabo}
        explica="Quanto cada um dos 9 grupos do IPCA contribui para a inflação de 12 meses (peso × variação). À esquerda, o cabo de guerra: quem empurrou o número para cima e quem puxou para baixo nos últimos 3 meses. À direita, de onde vem cada ponto do número de hoje.">
        {g.cabo.itens.length ? (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div>
              <p className="text-xs text-texto-3">Mudança da contribuição em 3 meses (p.p.) · total {sinal(somaDelta)} p.p.</p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {g.cabo.itens.map((i) => (
                  <li key={i.id} className="grid grid-cols-[170px_minmax(0,1fr)_minmax(0,1fr)_56px] items-center gap-2 text-xs">
                    <span className="truncate text-texto-2" title={i.nome}>{i.nome}</span>
                    <span className="flex justify-end">
                      {i.delta < 0 && <span className="h-3 rounded-l-sm bg-baixa/80" style={{ width: `${(Math.abs(i.delta) / maxDelta) * 100}%` }} />}
                    </span>
                    <span className="flex border-l border-linha-forte">
                      {i.delta > 0 && <span className="h-3 rounded-r-sm bg-alta/80" style={{ width: `${(i.delta / maxDelta) * 100}%` }} />}
                    </span>
                    <span className={`num text-right ${i.delta > 0 ? "text-alta" : i.delta < 0 ? "text-baixa" : "text-texto-3"}`}>{sinal(i.delta)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 flex justify-between text-[11px] text-texto-3"><span>← puxou para baixo</span><span>empurrou para cima →</span></p>
            </div>
            <div>
              <p className="text-xs text-texto-3">
                De onde vem o IPCA de 12 meses ({fmtData(g.cabo.data!)}): soma {fmtNumero(g.cabo.total)}%
                {g.cabo.oficial && <> · oficial {fmtNumero(g.cabo.oficial.valor)}% (diferença de {fmtNumero(Math.abs(g.cabo.oficial.valor - g.cabo.total))} p.p. por ser soma, não composto)</>}
              </p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {[...g.cabo.itens].sort((a, b) => b.atual - a.atual).map((i) => (
                  <li key={i.id} className="grid grid-cols-[170px_minmax(0,1fr)_56px] items-center gap-2 text-xs">
                    <span className="truncate text-texto-2" title={i.nome}>{i.nome}</span>
                    <span className="h-3 rounded-sm bg-ouro/70" style={{ width: `${(Math.max(0, i.atual) / maxAtual) * 100}%` }} />
                    <span className="num text-right text-texto">{fmtNumero(i.atual)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : <p className="text-sm text-texto-3">Sem dados de grupos do IPCA no banco.</p>}
      </Bloco>

      <Bloco titulo="As outras vezes em que esteve assim" formula={FORMULAS_GERAL.parecidos}
        explica="Os 5 meses do passado mais parecidos com hoje, comparando IPCA, núcleos, serviços, expectativas e Selic ao mesmo tempo. Para cada um: como estavam os dados naquele mês e 12 meses depois. É contexto histórico, não previsão.">
        {g.parecidos.lista.length && g.parecidos.atual ? (
          <>
            <p className="text-sm text-texto">
              Nos {g.parecidos.lista.length} períodos mais parecidos, o IPCA de 12 meses caiu nos 12 meses seguintes em {g.parecidos.caiu} e subiu em {g.parecidos.subiu}
              {g.parecidos.medianaIpca !== null && <> (mediana {sinal(g.parecidos.medianaIpca)} p.p.)</>}.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="num w-full whitespace-nowrap text-xs">
                <thead className="text-left text-texto-3">
                  <tr>
                    <th className="py-2 pr-4 font-sans font-normal">Período</th>
                    <th className="py-2 pr-4 text-right font-normal">Semelhança</th>
                    {VARIAVEIS_PARECIDAS.map((v) => <th key={v.id} className="py-2 pr-4 text-right font-sans font-normal">{v.rotulo}<br /><span className="text-[10px]">então → 12m depois</span></th>)}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-linha bg-ouro-tenue">
                    <td className="py-2 pr-4 font-sans text-ouro">Hoje ({fmtData(`${g.parecidos.atual.mes}-01`)})</td>
                    <td className="py-2 pr-4 text-right text-texto-3">—</td>
                    {VARIAVEIS_PARECIDAS.map((v) => <td key={v.id} className="py-2 pr-4 text-right text-texto">{g.parecidos.atual!.valores[v.id] == null ? "—" : `${fmtNumero(g.parecidos.atual!.valores[v.id]!)}%`}</td>)}
                  </tr>
                  {g.parecidos.lista.map((p) => (
                    <tr key={p.mes} className="border-t border-linha">
                      <td className="py-2 pr-4 font-sans text-texto">{fmtData(`${p.mes}-01`)}</td>
                      <td className="py-2 pr-4 text-right text-texto-2">{p.semelhanca}%</td>
                      {VARIAVEIS_PARECIDAS.map((v) => {
                        const a = p.entao[v.id], b = p.depois[v.id];
                        return (
                          <td key={v.id} className="py-2 pr-4 text-right">
                            <span className="text-texto-2">{a == null ? "—" : fmtNumero(a)}</span>
                            <span className="text-texto-3"> → </span>
                            <span className="text-texto">{b == null ? "—" : fmtNumero(b)}</span>
                            {a != null && b != null && <span className={`ml-1 ${b - a > 0 ? "text-alta" : b - a < 0 ? "text-baixa" : "text-texto-3"}`}>({sinal(b - a)})</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : <p className="text-sm text-texto-3">Histórico insuficiente no banco.</p>}
      </Bloco>
    </div>
  );
}
