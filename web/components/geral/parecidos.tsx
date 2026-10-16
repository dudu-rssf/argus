/**
 * "As outras vezes em que esteve assim" (Fases 6e e 6f): resposta em uma frase, gráfico com
 * o caminho da variável principal em cada período parecido e um cartão por período com o
 * contexto da época, os dados naquele mês e 12 meses depois. Contexto histórico, não previsão.
 * Genérico: serve à Inflação e às outras abas.
 */
import { GraficoTrajetorias } from "@/components/geral/grafico-trajetorias";
import { fmtData, fmtNumero } from "@/lib/formato";
import type { Parecido, ParecidosDados } from "@/lib/geral/motor";

const sinal = (v: number, c = 2) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${fmtNumero(Math.abs(v), c)}`;
const cor = (v: number | null) => (v === null ? "text-texto-3" : v > 0 ? "text-alta" : v < 0 ? "text-baixa" : "text-texto-3");
const curto = (mes: string) => fmtData(`${mes}-01`);
const dUnid = (u: string) => (u === "%" ? " p.p." : u ? ` ${u}` : "");

function Cartao({ p, hoje, d }: { p: Parecido; hoje: Record<string, number | null>; d: ParecidosDados }) {
  const t = d.trajetoria;
  const a0 = p.entao[t.id], a1 = p.depois[t.id];
  const dT = a0 != null && a1 != null ? a1 - a0 : null;
  const curtoDe = Object.fromEntries(d.variaveis.map((v) => [v.id, v.curto]));
  const mais = p.proximidade.slice(0, 2).map((x) => curtoDe[x.id]);
  const menos = p.proximidade.at(-1);
  return (
    <article className="flex flex-col rounded-controle border border-linha bg-fundo/40">
      <header className="border-b border-linha px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="num text-lg font-semibold tracking-tight text-texto">{curto(p.mes)}</h3>
          <span className="flex items-center gap-2 text-xs text-texto-3">
            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-linha"><span className="block h-full bg-ouro" style={{ width: `${p.semelhanca}%` }} /></span>
            <span className="num">{p.semelhanca}% parecido</span>
          </span>
        </div>
        {p.episodio && (
          <>
            <p className="mt-1 text-sm font-medium text-ouro">{p.episodio.titulo}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-texto-2">{p.episodio.texto}</p>
          </>
        )}
      </header>
      <div className="px-4 py-3">
        <p className={`text-sm ${cor(dT)}`}>
          {dT === null ? "Sem dado 12 meses depois." : <>12 meses depois, {t.rotulo.charAt(0).toLowerCase() + t.rotulo.slice(1)} {dT < 0 ? "caiu" : dT > 0 ? "subiu" : "ficou igual"}: <span className="num">{fmtNumero(a0!)}{t.unidade} → {fmtNumero(a1!)}{t.unidade}</span> ({sinal(dT)}{dUnid(t.unidade)})</>}
        </p>
        <table className="num mt-3 w-full whitespace-nowrap text-xs">
          <thead className="text-left text-texto-3">
            <tr><th className="pb-1 font-sans font-normal" /><th className="pb-1 pl-2 text-right font-sans font-normal">Hoje</th><th className="pb-1 pl-2 text-right font-sans font-normal">Então</th><th className="pb-1 pl-2 text-right font-sans font-normal">12m depois</th></tr>
          </thead>
          <tbody>
            {d.variaveis.map((v) => {
              const a = p.entao[v.id], b = p.depois[v.id], h = hoje[v.id];
              return (
                <tr key={v.id} className="border-t border-linha">
                  <td className="whitespace-normal py-1 pr-1 font-sans text-texto-2">{v.rotulo}</td>
                  <td className="py-1 pl-2 text-right text-texto-3">{h == null ? "—" : fmtNumero(h)}</td>
                  <td className="py-1 pl-2 text-right text-texto">{a == null ? "—" : fmtNumero(a)}</td>
                  <td className="py-1 pl-2 text-right">
                    <span className="text-texto">{b == null ? "—" : fmtNumero(b)}</span>
                    {a != null && b != null && <span className={`ml-1 ${cor(b - a)}`}>({sinal(b - a, 1)})</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <footer className="mt-auto border-t border-linha px-4 py-2 text-[11px] text-texto-3">
        Mais parecido em {mais.join(" e ")}{menos ? <>; mais diferente em {curtoDe[menos.id]}</> : null}.
      </footer>
    </article>
  );
}

export function Parecidos({ d }: { d: ParecidosDados }) {
  if (!d.lista.length || !d.atual) return <p className="text-sm text-texto-3">Histórico insuficiente no banco.</p>;
  const n = d.lista.length, t = d.trajetoria;
  const rotuloMin = t.rotulo.charAt(0).toLowerCase() + t.rotulo.slice(1);
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="max-w-3xl text-lg leading-snug tracking-tight text-texto">
          Hoje ({curto(d.atual.mes)}) se parece com {n} momentos do passado. Nos 12 meses seguintes, {rotuloMin} <span className="text-baixa">caiu em {d.caiu}</span> e <span className="text-alta">subiu em {d.subiu}</span>
          {d.mediana !== null && <> (mediana {sinal(d.mediana)}{dUnid(t.unidade)})</>}.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {d.lista.map((x) => {
            const a = x.entao[t.id], b = x.depois[t.id];
            const dd = a != null && b != null ? b - a : null;
            return (
              <li key={x.mes} className="num flex items-center gap-2 rounded-controle border border-linha px-2.5 py-1 text-xs">
                <span className="text-texto">{curto(x.mes)}</span>
                <span className={cor(dd)}>{dd === null ? "—" : `${dd < 0 ? "↓" : "↑"} ${sinal(dd)}${dUnid(t.unidade)}`}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-controle border border-linha bg-fundo/40 p-3">
        <p className="mb-1 text-xs text-texto-3">
          {t.rotulo} em cada período, de 12 meses antes a 12 meses depois. <span className="text-ouro">Dourado: hoje</span>; cinza: os períodos parecidos. O caminho até o zero mostra se o período chegou ao mesmo ponto pela mesma rota; o lado direito, o que veio depois.
        </p>
        <GraficoTrajetorias hoje={d.hoje} rotuloHoje="hoje" unidade={t.unidade} rotuloSerie={t.rotulo}
          passado={d.lista.map((x) => ({ rotulo: curto(x.mes), pontos: x.trajetoria }))} />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {d.lista.map((x) => <Cartao key={x.mes} p={x} hoje={d.atual!.valores} d={d} />)}
        <aside className="rounded-controle border border-dashed border-linha-forte p-4 text-xs leading-relaxed text-texto-2">
          <p className="mb-1 text-sm font-medium text-texto">Como os períodos são escolhidos</p>
          Para cada mês desde {curto(d.desde)}, o Argus compara {d.variaveis.length} números com os de hoje: {d.variaveis.map((v) => v.rotulo).join(", ")}. Cada número é medido em &quot;distância típica&quot; (desvio-padrão), para que nenhum pese mais que os outros só por variar mais. Os {n} meses com a menor diferença total são os mais parecidos, com pelo menos 12 meses entre eles e excluindo os últimos 2 anos.
          <p className="mt-2 text-texto-3">É contexto histórico, não previsão: o mesmo ponto de partida já levou a destinos diferentes. Semelhança baixa quer dizer que o momento atual tem poucos precedentes.</p>
        </aside>
      </div>
    </div>
  );
}
