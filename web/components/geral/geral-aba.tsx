/**
 * Seção Geral genérica (Fase 6f): frase, relógio do ciclo, perguntas rápidas com "Ver mais",
 * decomposição por prazo, forças e períodos parecidos. Mesmo formato da Inflação, montado
 * pelo motor comum (lib/geral/motor.ts). Componente de servidor.
 */
import { RodapeFormula } from "@/components/formula";
import { Gaveta, PainelVerMais } from "@/components/gaveta";
import { DecomposicaoInterativa } from "@/components/geral/decomposicao-interativa";
import { Parecidos } from "@/components/geral/parecidos";
import { RelogioCiclo } from "@/components/geral/relogio-ciclo";
import { VerMaisGenerico } from "@/components/geral/ver-mais-generico";
import { Info } from "@/components/info";
import { Minicurva } from "@/components/minicurva";
import { fmtData, fmtNumero } from "@/lib/formato";
import { FORMULAS_GERAL, type Formula } from "@/lib/formulas";
import type { BlocoForcas, GeralAba } from "@/lib/geral/motor";
import type { Resposta } from "@/lib/geral/checklist";
import { FASES } from "@/lib/geral/relogio";

const sinal = (v: number, c = 2) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${fmtNumero(Math.abs(v), c)}`;
const cor = (v: number | null) => (v === null ? "text-texto-3" : v > 0 ? "text-alta" : v < 0 ? "text-baixa" : "text-texto-3");
const SELO: Record<Resposta, string> = {
  Sim: "border-ouro text-ouro",
  Não: "border-texto-3 text-texto-2",
  Parcial: "border-texto-3 text-texto-2 border-dashed",
  "Sem dados": "border-linha text-texto-3",
};

function Bloco({ titulo, explica, children, formula }: { titulo: string; explica: string; children: React.ReactNode; formula: Formula }) {
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

function Forcas({ f }: { f: BlocoForcas }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-texto-3">{f.legenda}</p>
        <Gaveta alvo="ver-mais-forcas" titulo={f.titulo} subtitulo="O que cada força representa">
          <p className="mb-4 text-sm leading-relaxed text-texto-2">{f.racionalGeral}</p>
          <ul className="flex flex-col gap-3">
            {f.itens.map((i) => (
              <li key={i.id} className="rounded-controle border border-linha bg-fundo/40 p-3">
                <p className="text-sm font-medium text-texto">{i.nome} <span className="text-ouro">→ {i.influencia}</span></p>
                <p className="mt-1 text-sm leading-relaxed text-texto-2">{i.racional}</p>
              </li>
            ))}
          </ul>
        </Gaveta>
      </div>
      <PainelVerMais id="ver-mais-forcas" />
      <ul>
        {f.itens.map((i) => (
          <li key={i.id} className="grid grid-cols-1 items-center gap-x-4 gap-y-1 border-t border-linha py-3 first:border-t-0 md:grid-cols-[240px_120px_150px_minmax(0,1fr)]">
            <div className="min-w-0">
              <p className="text-sm font-medium text-texto">{i.nome}</p>
              <p className="text-xs text-ouro">{i.influencia}</p>
            </div>
            <p className="num text-lg font-semibold text-texto">{i.valor === null ? "—" : `${fmtNumero(i.valor, i.casas ?? 2)}${i.unidade}`}</p>
            <p className={`num whitespace-nowrap text-xs ${cor(i.d3)}`}>{i.d3 === null ? "—" : `${sinal(i.d3, i.casas ?? 2)}${i.unidade === "%" ? " p.p." : i.unidade}`} <span className="font-sans text-texto-3">{i.rotuloD3}</span></p>
            <div className="w-full max-w-[220px]"><Minicurva pontos={i.serie} /></div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GeralAbaView({ g }: { g: GeralAba }) {
  const r = g.relogio;
  const fase = r ? FASES.find((f) => f.id === r.relogio.atual.fase)! : null;
  const dUnid = r?.unidade === "%" ? " p.p." : r?.unidade ? ` ${r.unidade}` : "";
  return (
    <div className="flex flex-col gap-5">
      {g.frase && <p className="max-w-4xl text-xl leading-snug tracking-tight text-texto md:text-2xl">{g.frase}</p>}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {r && fase ? (
          <Bloco titulo="Em que fase do ciclo está" formula={r.formula} explica={r.explica}>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <RelogioCiclo relogio={r.relogio} rotulo={r.rotulo} referencia={r.referencia} nomes={r.nomes} unidade={r.unidade} meses={r.mesesDirecao} />
              <div className="flex min-w-0 flex-col gap-3 sm:pt-4">
                <div>
                  <p className="text-xs text-texto-3">Fase atual</p>
                  <p className="text-2xl font-semibold tracking-tight text-ouro">{r.nomes[fase.id]}</p>
                  <p className="text-sm text-texto-2">{r.descricoes[fase.id]}, há {r.relogio.mesesNaFase} {r.relogio.mesesNaFase === 1 ? "mês" : "meses"}</p>
                </div>
                <dl className="num grid grid-cols-[auto_auto] justify-start gap-x-4 gap-y-1 whitespace-nowrap text-xs">
                  <dt className="font-sans text-texto-3">{r.rotulo}</dt><dd className="text-texto">{fmtNumero(r.relogio.atual.valor)}{r.unidade === "%" ? "%" : dUnid}</dd>
                  <dt className="font-sans text-texto-3">vs {r.referencia}</dt><dd className="text-texto">{sinal(r.relogio.atual.nivel)}{dUnid}</dd>
                  <dt className="font-sans text-texto-3">Δ {r.mesesDirecao} meses</dt><dd className="text-texto">{sinal(r.relogio.atual.direcao)}{dUnid}</dd>
                  <dt className="font-sans text-texto-3">Dado de</dt><dd className="text-texto">{fmtData(r.relogio.atual.data)}</dd>
                </dl>
                <ol className="flex flex-col gap-1 text-xs text-texto-3" aria-label="Fases, no sentido do ciclo">
                  {FASES.map((f) => (
                    <li key={f.id} className={f.id === fase.id ? "text-ouro" : ""}>{f.id === fase.id ? "● " : "○ "}{r.nomes[f.id]}: {r.descricoes[f.id]}</li>
                  ))}
                </ol>
              </div>
            </div>
          </Bloco>
        ) : (
          <Bloco titulo="Em que fase do ciclo está" formula={FORMULAS_GERAL.relogio} explica="Histórico insuficiente."><p className="text-sm text-texto-3">Histórico insuficiente no banco.</p></Bloco>
        )}

        <Bloco titulo="Perguntas rápidas" formula={{ titulo: "Perguntas rápidas", formula: g.perguntas.map((p) => `${p.pergunta} ${p.explica}`), variaveis: ["Séries listadas em cada pergunta"], metodologia: ["As respostas são fatos sobre os dados, por regra fixa, não julgamento (decisão 0017)."] }}
          explica="Perguntas que se faz para entender o tema, cada uma respondida por uma regra fixa sobre os dados, com a evidência embaixo. Sim e Não são fatos, não julgamento de bom ou ruim. Ver mais abre a explicação completa com gráficos.">
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {g.perguntas.map((i) => (
              <li key={i.id} className="flex gap-3 rounded-controle border border-linha bg-fundo/40 p-3">
                <span className={`num flex h-9 min-w-14 shrink-0 items-center justify-center rounded-controle border px-2 text-xs font-semibold ${SELO[i.resposta]}`}>{i.resposta}</span>
                <div className="min-w-0">
                  <p className="flex items-start gap-1.5 text-sm font-medium text-texto">
                    {i.pergunta}
                    {i.explica && <span className="mt-0.5"><Info titulo={i.pergunta} lado="direita">{i.explica}</Info></span>}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-texto-2">{i.evidencia}</p>
                  {i.resposta !== "Sem dados" && i.verMais.secoes.length > 0 && (
                    <div className="mt-2">
                      <Gaveta alvo="ver-mais-perguntas" titulo={i.pergunta} subtitulo={`Resposta: ${i.resposta}. ${i.evidencia}`}>
                        <VerMaisGenerico v={i.verMais} />
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

      {g.curvaReunioes && (
        <Bloco titulo="O que o mercado espera em cada reunião do Copom" formula={FORMULAS_GERAL.curvaReunioes}
          explica="Mediana do Focus para a Selic decidida em cada uma das próximas reuniões do Copom. A barra mostra o nível esperado; ao lado, quanto o mercado espera de mudança em cada reunião e como a expectativa mudou nas últimas 4 semanas. É expectativa de analistas, não promessa do Banco Central.">
          <div className="flex flex-col gap-2">
            <p className="text-xs text-texto-3">Pesquisa Focus de {fmtData(g.curvaReunioes.pesquisa, "Diária")} · Selic hoje {fmtNumero(g.curvaReunioes.selicHoje)}%</p>
            <ul className="flex flex-col gap-1.5">
              {(() => {
                const c = g.curvaReunioes!;
                const vals = [c.selicHoje, ...c.itens.map((i) => i.mediana)];
                const min = Math.min(...vals) - 0.5, max = Math.max(...vals);
                const w = (v: number) => `${((v - min) / (max - min || 1)) * 100}%`;
                return c.itens.map((i) => (
                  <li key={i.reuniao} className="grid grid-cols-[110px_minmax(0,1fr)_64px_96px_110px] items-center gap-3 text-xs">
                    <span className="num text-texto-2">{fmtData(i.data, "Diária")}</span>
                    <span className="h-3 rounded-sm bg-ouro/70" style={{ width: w(i.mediana) }} />
                    <span className="num text-right text-sm font-semibold text-texto">{fmtNumero(i.mediana)}%</span>
                    <span className={`num text-right ${cor(i.mudanca)}`}>{Math.abs(i.mudanca) < 0.005 ? "manutenção" : `${i.mudanca > 0 ? "+" : "−"}${Math.round(Math.abs(i.mudanca) * 100)} bps`}</span>
                    <span className={`num text-right ${cor(i.antes4 === null ? null : i.mediana - i.antes4)}`}>{i.antes4 === null ? "—" : `${sinal(i.mediana - i.antes4)} p.p. em 4 sem.`}</span>
                  </li>
                ));
              })()}
            </ul>
          </div>
        </Bloco>
      )}

      {g.decomposicao && <DecomposicaoInterativa d={g.decomposicao} />}

      {g.forcas && (
        <Bloco titulo={g.forcas.titulo} formula={g.forcas.formula} explica={g.forcas.explica}>
          <Forcas f={g.forcas} />
        </Bloco>
      )}

      <Bloco titulo="As outras vezes em que esteve assim" formula={g.formulaParecidos}
        explica="Os 5 meses do passado mais parecidos com hoje, comparando vários números ao mesmo tempo. Para cada um: o que acontecia na economia, como estavam os dados e o que veio 12 meses depois. É contexto histórico, não previsão.">
        <Parecidos d={g.parecidos} />
      </Bloco>
    </div>
  );
}
