/**
 * "IPCA por área de influência": o IPCA dividido em quatro cestas que somam o índice
 * (classificação do Banco Central), cada uma ligada ao que mais a move, mais três lentes
 * complementares. Barras do acumulado em 12 meses; contribuição em pontos do IPCA.
 */
import { Gaveta } from "@/components/gaveta";
import { Minicurva } from "@/components/minicurva";
import { fmtData, fmtNumero } from "@/lib/formato";
import type { Area, GeralInflacao } from "@/lib/geral/inflacao";

const sinal = (v: number, c = 2) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${fmtNumero(Math.abs(v), c)}`;
const cor = (v: number | null) => (v === null ? "text-texto-3" : v > 0 ? "text-alta" : v < 0 ? "text-baixa" : "text-texto-3");

function Linha({ a, max, ipca, mostrarContrib }: { a: Area; max: number; ipca: number | null; mostrarContrib: boolean }) {
  const largura = (v: number) => `${(Math.max(0, v) / max) * 100}%`;
  return (
    <li className="grid grid-cols-1 items-center gap-x-4 gap-y-1 border-t border-linha py-3 first:border-t-0 md:grid-cols-[220px_minmax(0,1fr)_170px_120px]">
      <div className="min-w-0">
        <p className="text-sm font-medium text-texto">{a.nome}</p>
        <p className="text-xs text-ouro">{a.influencia}</p>
      </div>
      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="h-4 rounded-sm bg-ouro/70" style={{ width: a.var12 === null ? 0 : largura(a.var12) }} />
          <span className="num text-sm text-texto">{a.var12 === null ? "—" : `${fmtNumero(a.var12)}%`}</span>
        </div>
        {ipca !== null && <span aria-hidden className="absolute -top-1 bottom-[-4px] border-l border-dashed border-texto-3" style={{ left: largura(ipca) }} />}
      </div>
      <div className="num whitespace-nowrap text-xs">
        <p className={cor(a.d3)}>{a.d3 === null ? "—" : `${sinal(a.d3)} p.p.`} <span className="font-sans text-texto-3">em 3m</span></p>
        {mostrarContrib && a.contrib12 !== null && <p className="text-texto-2">{fmtNumero(a.contrib12)} p.p. <span className="font-sans text-texto-3">do IPCA</span></p>}
      </div>
      <div className="w-full max-w-[120px]"><Minicurva pontos={a.serie12} /></div>
    </li>
  );
}

export function AreasInfluencia({ areas }: { areas: GeralInflacao["areas"] }) {
  const todos = [...areas.itens, ...areas.lentes].map((a) => a.var12 ?? 0);
  const max = Math.max(0.5, areas.ipca12 ?? 0, ...todos) * 1.1;
  const somaContrib = areas.itens.reduce((s, a) => s + (a.contrib12 ?? 0), 0);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-texto-3">
          Alta em 12 meses de cada cesta (barra) · linha tracejada = IPCA de 12 meses{areas.ipca12 !== null ? ` (${fmtNumero(areas.ipca12)}%)` : ""} · mudança em 3 meses · contribuição para o IPCA · últimos 3 anos
        </p>
        <Gaveta titulo="Como o IPCA foi agrupado por influência" subtitulo="Racional de cada cesta e como conferimos a conta">
          <p className="mb-4 text-sm leading-relaxed text-texto-2">
            Os 377 subitens do IPCA foram separados nas quatro cestas que o Banco Central usa para analisar a inflação. Elas não se sobrepõem e, juntas, formam 100% do índice. Cada cesta tem uma força dominante que mexe nos seus preços; é ela que dá nome à área.
          </p>
          <ul className="flex flex-col gap-3">
            {areas.itens.map((a) => (
              <li key={a.id} className="rounded-controle border border-linha bg-fundo/40 p-3">
                <p className="text-sm font-medium text-texto">{a.nome} <span className="text-ouro">→ {a.influencia}</span></p>
                {a.peso !== null && <p className="num mt-0.5 text-xs text-texto-3">{fmtNumero(a.peso, 1)}% do IPCA{areas.data ? ` em ${fmtData(areas.data)}` : ""}</p>}
                <p className="mt-2 text-sm leading-relaxed text-texto-2">{a.racional}</p>
              </li>
            ))}
          </ul>
          <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-texto-3">Lentes complementares</h3>
          <p className="text-sm leading-relaxed text-texto-2">
            Outra forma de olhar, que corta o IPCA de lado e se sobrepõe às cestas acima: <b className="text-texto">comercializáveis</b> (bens com preço formado no mercado internacional, portanto expostos ao câmbio), <b className="text-texto">não comercializáveis</b> (serviços e bens que dependem da demanda interna) e <b className="text-texto">bens duráveis</b> (carros, eletrodomésticos e móveis, comprados a prazo e sensíveis a juros e crédito).
          </p>
          <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-texto-3">Limites</h3>
          <ul className="list-disc pl-5 text-sm leading-relaxed text-texto-2">
            <li>A influência é a dominante, não a única: alimentos também respondem ao câmbio, e serviços também têm reajustes por contrato.</li>
            <li>As altas em 12 meses vêm das séries oficiais do BCB. As contribuições vêm dos subitens do IBGE (peso × variação); a separação reproduz as séries do BCB com diferença média de até 0,012 p.p. por mês desde 2023.</li>
          </ul>
        </Gaveta>
      </div>
      <ul>
        {areas.itens.map((a) => <Linha key={a.id} a={a} max={max} ipca={areas.ipca12} mostrarContrib />)}
      </ul>
      {somaContrib > 0 && <p className="text-[11px] text-texto-3">As quatro cestas somam {fmtNumero(somaContrib)} p.p. de contribuição em 12 meses{areas.data ? ` até ${fmtData(areas.data)}` : ""}.</p>}
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-texto-3">Lentes complementares (se sobrepõem às cestas)</p>
        <ul>{areas.lentes.map((a) => <Linha key={a.id} a={a} max={max} ipca={areas.ipca12} mostrarContrib={false} />)}</ul>
      </div>
    </div>
  );
}
