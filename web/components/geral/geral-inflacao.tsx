/**
 * Seção Geral da Inflação: em 2 minutos, onde a inflação está, o que a move e o que
 * aconteceu nas outras vezes em que esteve assim. Componente de servidor.
 */
import { RodapeFormula } from "@/components/formula";
import { Info } from "@/components/info";
import { AreasInfluencia } from "@/components/geral/areas-influencia";
import { CaboInterativo } from "@/components/geral/cabo-interativo";
import { Parecidos } from "@/components/geral/parecidos";
import { RelogioCiclo } from "@/components/geral/relogio-ciclo";
import { VerMaisInflacao } from "@/components/geral/ver-mais-inflacao";
import { Gaveta, PainelVerMais } from "@/components/gaveta";
import { fmtData, fmtNumero } from "@/lib/formato";
import { FORMULAS_GERAL } from "@/lib/formulas";
import type { GeralInflacao } from "@/lib/geral/inflacao";
import { VARIAVEIS_PARECIDAS } from "@/lib/geral/inflacao";
import { FASES } from "@/lib/geral/relogio";

const CURTO: Record<string, string> = { ipca12: "IPCA", nucleos: "núcleos", servicos: "serviços", focus12: "Focus", selic: "Selic" };
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
          explica="Seis perguntas que se faz para entender a inflação, cada uma respondida por uma regra fixa sobre os dados, com a evidência embaixo. Sim e Não são fatos, não julgamento de bom ou ruim. Em cada uma, Ver mais abre a explicação completa com gráficos.">
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
                  {i.resposta !== "Sem dados" && (
                    <div className="mt-2">
                      <Gaveta alvo="ver-mais-perguntas" titulo={i.pergunta} subtitulo={`Resposta: ${i.resposta}. ${i.evidencia}`}>
                        <VerMaisInflacao id={i.id} v={g.verMais} />
                      </Gaveta>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Bloco>
      </div>

      <PainelVerMais id="ver-mais-perguntas" />

      <CaboInterativo cabo={g.cabo} formula={FORMULAS_GERAL.cabo}
        explica="Quanto cada um dos 9 grupos do IPCA contribui para a inflação de 12 meses (peso × variação). À esquerda, o cabo de guerra: quem empurrou o número para cima e quem puxou para baixo no prazo escolhido (3, 6, 9 ou 12 meses). À direita, de onde vem cada ponto do número de hoje. O ? de cada grupo mostra os subitens por trás do movimento." />

      <Bloco titulo="IPCA por área de influência" formula={FORMULAS_GERAL.areas}
        explica="O IPCA dividido em quatro cestas que somam o índice inteiro, cada uma ligada à força que mais mexe nos seus preços: renda e trabalho (serviços), câmbio (bens industriais), clima e safra (alimentos em casa) e governo (monitorados). Mostra quais forças estão por trás do número de hoje.">
        <AreasInfluencia areas={g.areas} />
      </Bloco>

      <Bloco titulo="As outras vezes em que esteve assim" formula={FORMULAS_GERAL.parecidos}
        explica="Os 5 meses do passado mais parecidos com hoje, comparando IPCA, núcleos, serviços, expectativas e Selic ao mesmo tempo. Para cada um: o que acontecia na economia, como estavam os dados e o que veio 12 meses depois. É contexto histórico, não previsão.">
        <Parecidos d={{
          variaveis: VARIAVEIS_PARECIDAS.map((v) => ({ ...v, curto: CURTO[v.id] })), trajetoria: { id: "ipca12", rotulo: "IPCA 12 meses", unidade: "%" },
          atual: g.parecidos.atual, lista: g.parecidos.lista, caiu: g.parecidos.caiu, subiu: g.parecidos.subiu, mediana: g.parecidos.medianaIpca,
          hoje: g.parecidos.hoje, desde: "2002-01",
        }} />
      </Bloco>
    </div>
  );
}
