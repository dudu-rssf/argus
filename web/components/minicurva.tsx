import type { Ponto } from "@/lib/transform";

/** Minicurva em SVG puro: linha fina e o último ponto marcado. */
export function Minicurva({ pontos }: { pontos: Ponto[] }) {
  if (pontos.length < 2) return null;
  const L = 120, A = 32;
  const ys = pontos.map((p) => p.valor);
  const min = Math.min(...ys), max = Math.max(...ys), amp = max - min || 1;
  const xy = pontos.map((p, i) => [(i / (pontos.length - 1)) * L, A - 3 - ((p.valor - min) / amp) * (A - 6)] as const);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const [ux, uy] = xy[xy.length - 1];
  return (
    <svg viewBox={`0 0 ${L + 4} ${A}`} className="h-8 w-full" preserveAspectRatio="none" aria-hidden>
      <path d={`${d}L${ux},${A}L0,${A}Z`} fill="var(--cor-ouro-tenue)" />
      <path d={d} fill="none" stroke="var(--cor-ouro)" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
      <circle cx={ux} cy={uy} r="2" fill="var(--cor-ouro-forte)" />
    </svg>
  );
}

