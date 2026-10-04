import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PainelGrafico } from "@/components/grafico/painel-grafico";
import { aba } from "@/lib/config";
import { lerSeries } from "@/lib/db";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: aba((await params).id)?.titulo ?? "Aba" };
}

/** Página genérica de aba: tudo vem de config/abas/<id>.yaml (decisão 0005). */
export default async function PaginaAba({ params }: Props) {
  const a = aba((await params).id);
  if (!a) notFound();
  const dados = await lerSeries([...new Set(a.paineis.flatMap((p) => p.series.map((s) => s.dado)))]);
  return (
    <section>
      <h1 className="text-xl font-semibold">{a.titulo}</h1>
      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {a.paineis.map((p) => (
          <PainelGrafico
            key={p.titulo} painel={p}
            dados={Object.fromEntries(p.series.map((s) => [s.dado, dados[s.dado] ?? []]))}
          />
        ))}
      </div>
    </section>
  );
}
