/**
 * Minigráfico para os painéis "Ver mais": título, último valor, variação no período,
 * linha (ou barras) em SVG puro, com referência tracejada opcional (ex.: meta) e as
 * datas e extremos nas bordas. Sem interação; serve para ler a forma da série.
 */
import { fmtData, fmtNumero } from "@/lib/formato";
import type { Ponto } from "@/lib/transform";

type Props = {
  titulo: string;
  pontos: Ponto[];
  unidade?: string;
  referencia?: Ponto[] | number | null;
  rotuloReferencia?: string;
  barras?: boolean;
  casas?: number;
  nota?: string;
  destaque?: boolean;
};

const L = 300, A = 84, M = 4;

export function MiniGrafico({ titulo, pontos, unidade = "%", referencia, rotuloReferencia, barras, casas = 2, nota, destaque }: Props) {
  if (pontos.length < 2) {
    return (
      <figure className="rounded-controle border border-linha bg-fundo/40 p-3">
        <figcaption className="text-xs text-texto-2">{titulo}</figcaption>
        <p className="mt-2 text-xs text-texto-3">Sem dados no banco.</p>
      </figure>
    );
  }
  const ref = typeof referencia === "number" ? pontos.map((p) => ({ data: p.data, valor: referencia })) : referencia ?? [];
  const valores = [...pontos.map((p) => p.valor), ...ref.map((p) => p.valor), ...(barras ? [0] : [])];
  const min = Math.min(...valores), max = Math.max(...valores), amp = max - min || 1;
  const x = (i: number) => M + (i / (pontos.length - 1)) * (L - 2 * M);
  const xData = (data: string) => {
    const i = pontos.findIndex((p) => p.data >= data);
    return x(i < 0 ? pontos.length - 1 : i);
  };
  const y = (v: number) => A - M - ((v - min) / amp) * (A - 2 * M);
  const u = pontos.at(-1)!, p0 = pontos[0];
  const d = pontos.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join("");
  const dRef = ref.filter((r) => r.data >= p0.data).map((r, i) => `${i ? "L" : "M"}${xData(r.data).toFixed(1)},${y(r.valor).toFixed(1)}`).join("");
  const largura = ((L - 2 * M) / pontos.length) * 0.7;
  const variacao = u.valor - p0.valor;
  const fmt = (v: number) => `${fmtNumero(v, casas)}${unidade}`;

  return (
    <figure className={`rounded-controle border p-3 ${destaque ? "border-ouro/40 bg-ouro-tenue" : "border-linha bg-fundo/40"}`}>
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-xs text-texto-2" title={titulo}>{titulo}</span>
        <span className="num shrink-0 text-sm font-semibold text-texto">{fmt(u.valor)}</span>
      </figcaption>
      <svg viewBox={`0 0 ${L} ${A}`} preserveAspectRatio="none" className="mt-2 h-20 w-full" role="img"
        aria-label={`${titulo}: de ${fmt(p0.valor)} em ${fmtData(p0.data)} para ${fmt(u.valor)} em ${fmtData(u.data)}`}>
        {barras ? (
          <>
            <line x1={0} x2={L} y1={y(0)} y2={y(0)} stroke="var(--cor-linha-forte)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            {pontos.map((p, i) => (
              <rect key={p.data} x={x(i) - largura / 2} width={largura} y={Math.min(y(p.valor), y(0))} height={Math.max(0.5, Math.abs(y(p.valor) - y(0)))}
                fill={p.valor >= 0 ? "var(--cor-alta)" : "var(--cor-baixa)"} opacity={i === pontos.length - 1 ? 1 : 0.6} />
            ))}
          </>
        ) : (
          <>
            <path d={`${d}L${x(pontos.length - 1)},${A}L${x(0)},${A}Z`} fill="var(--cor-ouro-tenue)" />
            <path d={d} fill="none" stroke="var(--cor-ouro)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          </>
        )}
        {dRef && <path d={dRef} fill="none" stroke="var(--cor-texto-3)" strokeWidth={1} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />}
      </svg>
      <div className="num mt-1 flex justify-between text-[10px] text-texto-3">
        <span>{fmtData(p0.data)}</span>
        <span>mín {fmtNumero(Math.min(...pontos.map((p) => p.valor)), casas)} · máx {fmtNumero(Math.max(...pontos.map((p) => p.valor)), casas)}</span>
        <span>{fmtData(u.data)}</span>
      </div>
      <p className="mt-1 text-[11px] text-texto-3">
        {barras ? null : <>No período: <span className={variacao > 0 ? "text-alta" : variacao < 0 ? "text-baixa" : ""}>{variacao > 0 ? "+" : variacao < 0 ? "−" : ""}{fmtNumero(Math.abs(variacao), casas)} {unidade === "%" ? "p.p." : unidade}</span></>}
        {dRef && rotuloReferencia ? <>{barras ? "" : " · "}<span className="text-texto-3">- - {rotuloReferencia}</span></> : null}
        {nota ? <> · {nota}</> : null}
      </p>
    </figure>
  );
}
