/**
 * Conteúdo do "Ver mais" de cada pergunta rápida da Inflação: explicação aprofundada,
 * minigráficos das séries envolvidas e os números. Componente de servidor; a gaveta
 * (cliente) só exibe.
 */
import { RodapeFormula } from "@/components/formula";
import { MiniGrafico } from "@/components/geral/mini-grafico";
import { FORMULAS_GERAL } from "@/lib/formulas";
import { fmtData, fmtNumero } from "@/lib/formato";
import type { VerMais } from "@/lib/geral/inflacao";

const sinal = (v: number, c = 2) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${fmtNumero(Math.abs(v), c)}`;
const corSinal = (v: number | null) => (v === null ? "text-texto-3" : v > 0 ? "text-alta" : v < 0 ? "text-baixa" : "text-texto-3");

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 first:mt-0">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-texto-3">{titulo}</h3>
      {children}
    </section>
  );
}
const P = ({ children }: { children: React.ReactNode }) => <p className="mb-2 text-sm leading-relaxed text-texto-2">{children}</p>;

export function VerMaisInflacao({ id, v }: { id: keyof VerMais; v: VerMais }) {
  switch (id) {
    case "meta": {
      const u = v.meta.ipca12.at(-1), m = v.meta.meta.at(-1);
      return (
        <>
          <Secao titulo="O que é">
            <P>A meta de inflação é definida pelo Conselho Monetário Nacional (CMN). Desde 2025 ela é <b className="text-texto">contínua</b>: 3% ao ano, com intervalo de tolerância de 1,5 ponto para cima e para baixo (1,5% a 4,5%). O Banco Central não persegue o IPCA de um ano-calendário, e sim o acumulado em 12 meses de qualquer mês.</P>
            <P>A meta é considerada descumprida quando o IPCA de 12 meses fica fora do intervalo por 6 meses seguidos. Nesse caso, o presidente do BC escreve uma carta pública explicando os motivos e o prazo para voltar.</P>
          </Secao>
          <Secao titulo="Os números">
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniGrafico titulo="IPCA 12 meses × meta" pontos={v.meta.ipca12} referencia={v.meta.meta} rotuloReferencia="meta" destaque />
              <div className="num grid content-start gap-2 rounded-controle border border-linha bg-fundo/40 p-3 text-sm">
                {u && m && <>
                  <p className="flex justify-between"><span className="font-sans text-texto-2">IPCA 12 meses ({fmtData(u.data)})</span><span>{fmtNumero(u.valor)}%</span></p>
                  <p className="flex justify-between"><span className="font-sans text-texto-2">Meta</span><span>{fmtNumero(m.valor)}%</span></p>
                  <p className="flex justify-between"><span className="font-sans text-texto-2">Teto do intervalo</span><span>{fmtNumero(m.valor + v.meta.banda)}%</span></p>
                  <p className="flex justify-between"><span className="font-sans text-texto-2">Distância da meta</span><span className={corSinal(u.valor - m.valor)}>{sinal(u.valor - m.valor)} p.p.</span></p>
                  <p className="flex justify-between"><span className="font-sans text-texto-2">Distância do teto</span><span className={corSinal(u.valor - m.valor - v.meta.banda)}>{sinal(u.valor - m.valor - v.meta.banda)} p.p.</span></p>
                  <p className="flex justify-between"><span className="font-sans text-texto-2">Meses seguidos acima da meta</span><span>{v.meta.mesesAcima}</span></p>
                </>}
              </div>
            </div>
          </Secao>
        </>
      );
    }
    case "aceleracao": {
      const a = v.aceleracao;
      return (
        <>
          <Secao titulo="Como ler">
            <P>O IPCA de 12 meses sobe quando o mês que <b className="text-texto">entra</b> na conta é maior que o mês que <b className="text-texto">sai</b> (o mesmo mês do ano anterior), e cai quando é menor. Por isso, o acumulado pode subir mesmo com a inflação do mês baixa, se o mês que sai foi ainda mais baixo. Esse é o chamado efeito base.</P>
            <P>Os meses que vão sair da conta já são conhecidos. Olhar para eles ajuda a entender para onde o acumulado vai se os próximos meses vierem normais.</P>
          </Secao>
          <Secao titulo="Gráficos">
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniGrafico titulo="IPCA no mês (24 meses)" pontos={a.mensal} barras />
              <MiniGrafico titulo="IPCA 12 meses" pontos={a.ipca12} destaque />
            </div>
          </Secao>
          <Secao titulo="Mês que entra × mês que sai">
            <table className="num w-full text-xs">
              <thead className="text-left text-texto-3"><tr><th className="py-1 font-sans font-normal">Mês</th><th className="py-1 text-right font-normal">Entrou</th><th className="py-1 text-right font-normal">Saiu (ano anterior)</th><th className="py-1 text-right font-normal">Efeito no 12 meses</th></tr></thead>
              <tbody>
                {a.troca.map((t) => (
                  <tr key={t.entra.data} className="border-t border-linha">
                    <td className="py-1.5 font-sans text-texto-2">{fmtData(t.entra.data)}</td>
                    <td className="py-1.5 text-right">{fmtNumero(t.entra.valor)}%</td>
                    <td className="py-1.5 text-right text-texto-2">{t.sai ? `${fmtNumero(t.sai.valor)}%` : "—"}</td>
                    <td className={`py-1.5 text-right ${corSinal(t.sai ? t.entra.valor - t.sai.valor : null)}`}>{t.sai ? `≈ ${sinal(t.entra.valor - t.sai.valor)} p.p.` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {a.saem.length > 0 && (
              <p className="mt-3 text-sm text-texto-2">
                Próximos meses a sair da conta: {a.saem.map((p, i) => <span key={p.data}>{i ? ", " : ""}<span className="num text-texto">{fmtData(p.data)} ({fmtNumero(p.valor)}%)</span></span>)}.
                {" "}Se os novos meses vierem acima desses valores, o acumulado sobe; abaixo, cai.
              </p>
            )}
          </Secao>
        </>
      );
    }
    case "nucleos":
      return (
        <>
          <Secao titulo="Por que núcleos">
            <P>O IPCA cheio mistura tendência com choques passageiros: uma geada nos alimentos, uma bandeira tarifária na energia, um reajuste da gasolina. Os núcleos são medidas que tiram ou suavizam esses itens para mostrar a tendência. O Copom acompanha cinco deles; quando todos andam juntos, o movimento é mais confiável.</P>
          </Secao>
          <Secao titulo="Os cinco núcleos do Copom (acumulado em 12 meses)">
            <div className="grid gap-3 sm:grid-cols-2">
              {v.nucleos.map((n) => (
                <div key={n.k} className="flex flex-col gap-2">
                  <MiniGrafico titulo={`${n.sigla} · ${n.nome}`} pontos={n.serie12}
                    nota={n.d3 === null ? undefined : `3 meses: ${sinal(n.d3)} p.p.`} />
                  <p className="text-xs leading-relaxed text-texto-3">{n.definicao}</p>
                </div>
              ))}
              <div className="flex flex-col gap-2">
                <MiniGrafico titulo="Média dos 5 núcleos" pontos={v.mediaNucleos} destaque />
                <p className="text-xs leading-relaxed text-texto-3">Média simples dos cinco, mês a mês, acumulada em 12 meses (cálculo do Argus, BR-127).</p>
              </div>
            </div>
          </Secao>
          <Secao titulo="Outro núcleo para comparar">
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniGrafico titulo="EX-FE · sem alimentos e energia" pontos={v.exfe} />
              <p className="text-xs leading-relaxed text-texto-3">Equivalente ao &quot;core&quot; americano: tira toda a alimentação e a energia. Não está entre os cinco do Copom, mas facilita comparar com outros países.</p>
            </div>
          </Secao>
        </>
      );
    case "servicos": {
      const s = v.servicos;
      const maxC = Math.max(0.01, ...s.composicao.map((c) => c.contrib12));
      return (
        <>
          <Secao titulo="Por que serviços importam">
            <P>Serviços são cerca de um terço do IPCA e quase não sofrem concorrência de importados. O preço acompanha salários, emprego e demanda: é a parte da inflação que mais responde aos juros e que demora mais para ceder. Por isso o Copom olha com lupa.</P>
            <P><b className="text-texto">Serviços subjacentes</b> é a medida do Banco Central que tira dos serviços os itens mais voláteis ou com dinâmica própria (como passagem aérea e turismo). Sobra a parte que reage a salários e atividade.</P>
          </Secao>
          <Secao titulo="Gráficos (acumulado em 12 meses)">
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniGrafico titulo="Serviços (BCB)" pontos={s.total12} />
              <MiniGrafico titulo="Serviços subjacentes" pontos={s.sub12} destaque />
            </div>
          </Secao>
          {s.composicao.length > 0 && (
            <Secao titulo={`De que são feitos os serviços (${s.data ? fmtData(s.data) : ""})`}>
              <P>Os serviços divididos em nove tipos, a partir dos subitens do IPCA. Contribuição = quantos pontos do IPCA de 12 meses vêm de cada tipo.</P>
              <table className="num w-full text-xs">
                <thead className="text-left text-texto-3">
                  <tr><th className="py-1 font-sans font-normal">Tipo de serviço</th><th className="py-1 text-right font-normal">Peso nos serviços</th><th className="py-1 text-right font-normal">Alta em 12m</th><th className="py-1 text-right font-normal">Δ 3 meses</th><th className="w-1/4 py-1 pl-3 font-sans font-normal">Contribuição para o IPCA 12m</th></tr>
                </thead>
                <tbody>
                  {s.composicao.map((c) => (
                    <tr key={c.nome} className="border-t border-linha">
                      <td className="py-1.5 font-sans text-texto">{c.nome}</td>
                      <td className="py-1.5 text-right text-texto-2">{fmtNumero(c.peso, 0)}%</td>
                      <td className="py-1.5 text-right">{c.var12 === null ? "—" : `${fmtNumero(c.var12, 1)}%`}</td>
                      <td className={`py-1.5 text-right ${corSinal(c.d3)}`}>{c.d3 === null ? "—" : `${sinal(c.d3, 1)} p.p.`}</td>
                      <td className="py-1.5 pl-3">
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 rounded-sm bg-ouro/70" style={{ width: `${(Math.max(0, c.contrib12) / maxC) * 70}%` }} />
                          <span>{fmtNumero(c.contrib12)}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {s.movimentos.length > 0 && (
                <>
                  <p className="mt-4 text-sm text-texto-2">Subitens de serviços que mais mudaram a contribuição em 3 meses:</p>
                  <ul className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
                    {s.movimentos.map((m) => (
                      <li key={m.id} className="flex justify-between gap-2 rounded-controle border border-linha px-2 py-1">
                        <span className="truncate text-texto-2">{m.nome} <span className="text-texto-3">({m.servico})</span></span>
                        <span className={`num shrink-0 ${corSinal(m.delta)}`}>{sinal(m.delta, 3)} p.p.</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <p className="mt-3 text-[11px] text-texto-3">Separação em tipos: curadoria do Argus sobre os subitens do IBGE (t7060). A cesta completa reproduz a série de serviços do BCB (SGS 10844) com diferença média de 0,005 p.p. por mês desde 2023.</p>
              <div className="mt-3 rounded-controle border border-linha"><RodapeFormula formulas={[FORMULAS_GERAL.servicos]} /></div>
            </Secao>
          )}
        </>
      );
    }
    case "difusao": {
      const d = v.difusao;
      return (
        <>
          <Secao titulo="O que é">
            <P>O índice de difusão mostra a porcentagem dos itens do IPCA que ficaram mais caros no mês. Uma difusão de 60% quer dizer que 6 em cada 10 itens subiram.</P>
            <P>Serve para separar uma alta concentrada (poucos itens subindo muito, como energia ou combustíveis) de uma alta espalhada pela economia, que costuma ser mais persistente. A série tem sazonalidade: é mais alta no começo do ano, por isso a comparação usa médias.</P>
          </Secao>
          <Secao titulo="Os números">
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniGrafico titulo="Difusão mensal" pontos={d.serie} referencia={d.media10} rotuloReferencia="média de 10 anos" casas={1} destaque />
              <div className="num grid content-start gap-2 rounded-controle border border-linha bg-fundo/40 p-3 text-sm">
                <p className="flex justify-between"><span className="font-sans text-texto-2">Último mês</span><span>{d.serie.at(-1) ? `${fmtNumero(d.serie.at(-1)!.valor, 1)}%` : "—"}</span></p>
                <p className="flex justify-between"><span className="font-sans text-texto-2">Média dos últimos 3 meses</span><span>{d.media3 === null ? "—" : `${fmtNumero(d.media3, 1)}%`}</span></p>
                <p className="flex justify-between"><span className="font-sans text-texto-2">Média de 10 anos</span><span>{d.media10 === null ? "—" : `${fmtNumero(d.media10, 1)}%`}</span></p>
              </div>
            </div>
          </Secao>
        </>
      );
    }
    case "expectativas": {
      const e = v.expectativas;
      return (
        <>
          <Secao titulo="O que é">
            <P>A pesquisa Focus, do Banco Central, reúne toda semana as projeções de cerca de 100 bancos, gestoras e consultorias. A mediana mostra o que o mercado espera para a inflação.</P>
            <P>Expectativas importam porque viram preço: quem espera inflação alta reajusta salários, aluguéis e contratos para cima. O Copom considera a inflação &quot;ancorada&quot; quando as projeções para os anos à frente ficam perto da meta.</P>
          </Secao>
          <Secao titulo="Os números">
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniGrafico titulo="Focus: IPCA dos próximos 12 meses" pontos={e.focus12} referencia={e.meta} rotuloReferencia="meta" destaque />
              <table className="num w-full self-start text-xs">
                <thead className="text-left text-texto-3"><tr><th className="py-1 font-sans font-normal">IPCA do ano</th><th className="py-1 text-right font-normal">Focus</th><th className="py-1 text-right font-normal">Δ 4 semanas</th><th className="py-1 text-right font-normal">vs meta</th></tr></thead>
                <tbody>
                  {e.anos.map((a) => (
                    <tr key={a.ano} className="border-t border-linha">
                      <td className="py-1.5 font-sans text-texto">{a.ano}</td>
                      <td className="py-1.5 text-right">{a.valor === null ? "—" : `${fmtNumero(a.valor)}%`}</td>
                      <td className={`py-1.5 text-right ${corSinal(a.d4)}`}>{a.d4 === null ? "—" : `${sinal(a.d4)} p.p.`}</td>
                      <td className={`py-1.5 text-right ${corSinal(a.valor !== null && a.meta !== null ? a.valor - a.meta : null)}`}>{a.valor !== null && a.meta !== null ? `${sinal(a.valor - a.meta)} p.p.` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Secao>
        </>
      );
    }
  }
}
