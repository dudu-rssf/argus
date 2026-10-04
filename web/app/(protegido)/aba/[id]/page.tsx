import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PainelGrafico } from "@/components/grafico/painel-grafico";
import { PainelEventos } from "@/components/painel-eventos";
import { aba, resolverPainel } from "@/lib/config";
import { lerEventos, lerSeries } from "@/lib/db";

type Props = { params: Promise<{ id: string }> };

const FONTE_EVENTOS: Record<string, string> = {
  copom_comunicado: "Banco Central do Brasil, comunicados do Copom (BR-058)",
  copom_ata: "Banco Central do Brasil, atas do Copom (BR-058)",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: aba((await params).id)?.titulo ?? "Aba" };
}

function anoEmBrasilia(): number {
  return Number(new Intl.DateTimeFormat("en", { timeZone: "America/Sao_Paulo", year: "numeric" }).format(new Date()));
}

/** Página genérica de aba: tudo vem de config/abas/<id>.yaml (decisão 0005). */
export default async function PaginaAba({ params }: Props) {
  const a = aba((await params).id);
  if (!a) notFound();
  const paineis = a.paineis.map((p) => resolverPainel(p, anoEmBrasilia()));
  const [dados, eventos] = await Promise.all([
    lerSeries([...new Set(paineis.flatMap((p) => p.series.map((s) => s.dado)))]),
    Promise.all(paineis.map((p) => (p.eventos ? lerEventos(p.eventos, p.quantidade ?? 3) : Promise.resolve([])))),
  ]);
  return (
    <section>
      <h1 className="text-xl font-semibold">{a.titulo}</h1>
      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {paineis.map((p, i) =>
          p.eventos ? (
            <PainelEventos key={p.titulo} titulo={p.titulo} eventos={eventos[i]} fonte={FONTE_EVENTOS[p.eventos]} />
          ) : (
            <PainelGrafico
              key={p.titulo} painel={p}
              dados={Object.fromEntries(p.series.map((s) => [s.dado, dados[s.dado] ?? []]))}
            />
          ),
        )}
      </div>
    </section>
  );
}
