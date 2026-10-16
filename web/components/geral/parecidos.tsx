/**
 * "As outras vezes em que esteve assim" (Fase 6e): resposta em uma frase, gráfico com o
 * caminho do IPCA em cada período parecido e um cartão por período com o contexto da
 * época, os dados naquele mês e 12 meses depois. Contexto histórico, não previsão.
 */
import { GraficoTrajetorias } from "@/components/geral/grafico-trajetorias";
import { fmtData, fmtNumero } from "@/lib/formato";
import type { GeralInflacao, Parecido } from "@/lib/geral/inflacao";
import { VARIAVEIS_PARECIDAS } from "@/lib/geral/inflacao";

const sinal = (v: number, c = 2) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${fmtNumero(Math.abs(v), c)}`;
const cor = (v: number | null) => (v === null ? "text-texto-3" : v > 0 ? "text-alta" : v < 0 ? "text-baixa" : "text-texto-3");
const curto = (mes: string) => fmtData(`${mes}-01`);
const ROTULO = Object.fromEntries(VARIAVEIS_PARECIDAS.map((v) => [v.id, v.rotulo]));
const ROTULO_CURTO: Record<string, string> = { ipca12: "IPCA", nucleos: "núcleos", servicos: "serviços", focus12: "Focus", selic: "Selic" };

function Cartao({ p, hoje }: { p: Parecido; hoje: Record<string, number | null> }) {
  const dIpca = p.entao.ipca12 != null && p.depois.ipca12 != null ? p.depois.ipca12 - p.entao.ipca12 : null;
  const mais = p.proximidade.slice(0, 2).map((x) => ROTULO_CURTO[x.id]);
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
        <p className={`text-sm ${cor(dIpca)}`}>
          {dIpca === null ? "Sem dado 12 meses depois." : <>12 meses depois, o IPCA {dIpca < 0 ? "caiu" : dIpca > 0 ? "subiu" : "ficou igual"}: <span className="num">{fmtNumero(p.entao.ipca12!)}% → {fmtNumero(p.depois.ipca12!)}%</span> ({sinal(dIpca)} p.p.)</>}
        </p>
        <table className="num mt-3 w-full whitespace-nowrap text-xs">
          <thead className="text-left text-texto-3">
            <tr><th className="pb-1 font-sans font-normal" /><th className="pb-1 pl-2 text-right font-sans font-normal">Hoje</th><th className="pb-1 pl-2 text-right font-sans font-normal">Então</th><th className="pb-1 pl-2 text-right font-sans font-normal">12m depois</th></tr>
          </thead>
          <tbody>
            {VARIAVEIS_PARECIDAS.map((v) => {
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
        Mais parecido em {mais.join(" e ")}{menos ? <>; mais diferente em {ROTULO_CURTO[menos.id]}</> : null}.
      </footer>
    </article>
  );
}

export function Parecidos({ p }: { p: GeralInflacao["parecidos"] }) {
  if (!p.lista.length || !p.atual) return <p className="text-sm text-texto-3">Histórico insuficiente no banco.</p>;
  const n = p.lista.length;
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="max-w-3xl text-lg leading-snug tracking-tight text-texto">
          Hoje ({curto(p.atual.mes)}) se parece com {n} momentos do passado. Nos 12 meses seguintes, o IPCA <span className="text-baixa">caiu em {p.caiu}</span> e <span className="text-alta">subiu em {p.subiu}</span>
          {p.medianaIpca !== null && <> (mediana {sinal(p.medianaIpca)} p.p.)</>}.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {p.lista.map((x) => {
            const d = x.entao.ipca12 != null && x.depois.ipca12 != null ? x.depois.ipca12 - x.entao.ipca12 : null;
            return (
              <li key={x.mes} className="num flex items-center gap-2 rounded-controle border border-linha px-2.5 py-1 text-xs">
                <span className="text-texto">{curto(x.mes)}</span>
                <span className={cor(d)}>{d === null ? "—" : `${d < 0 ? "↓" : "↑"} ${sinal(d)} p.p.`}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-controle border border-linha bg-fundo/40 p-3">
        <p className="mb-1 text-xs text-texto-3">
          IPCA de 12 meses em cada período, de 12 meses antes a 12 meses depois. <span className="text-ouro">Dourado: hoje</span>; cinza: os períodos parecidos. O caminho até o zero mostra se o período chegou ao mesmo ponto pela mesma rota; o lado direito, o que veio depois.
        </p>
        <GraficoTrajetorias hoje={p.hoje} rotuloHoje="hoje" passado={p.lista.map((x) => ({ rotulo: curto(x.mes), pontos: x.trajetoria }))} />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {p.lista.map((x) => <Cartao key={x.mes} p={x} hoje={p.atual!.valores} />)}
        <aside className="rounded-controle border border-dashed border-linha-forte p-4 text-xs leading-relaxed text-texto-2">
          <p className="mb-1 text-sm font-medium text-texto">Como os períodos são escolhidos</p>
          Para cada mês desde 2002, o Argus compara cinco números com os de hoje: {VARIAVEIS_PARECIDAS.map((v) => ROTULO[v.id]).join(", ")}. Cada número é medido em &quot;distância típica&quot; (desvio-padrão), para que a Selic, que varia muito, não pese mais que os outros. Os {n} meses com a menor diferença total são os mais parecidos, com pelo menos 12 meses entre eles e excluindo os últimos 2 anos.
          <p className="mt-2 text-texto-3">É contexto histórico, não previsão: o mesmo ponto de partida já levou a destinos diferentes.</p>
        </aside>
      </div>
    </div>
  );
}
