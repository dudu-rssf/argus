import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EstadoAba, SeletorHorizonteAba } from "@/components/aba/estado-aba";
import { IndiceAba, ResumoAba } from "@/components/aba/resumo-aba";
import { PainelGrafico } from "@/components/grafico/painel-grafico";
import { PainelEventos } from "@/components/painel-eventos";
import { aba, resolverAno, resolverPainel } from "@/lib/config";
import { lerEventos, lerSeries, ultimasDivulgacoes } from "@/lib/db";
import { fichaResumo, maioresMudancas } from "@/lib/resumo";

type Props = { params: Promise<{ id: string }> };

const FONTE_EVENTOS: Record<string, string> = {
  copom_comunicado: "Banco Central do Brasil, comunicados do Copom (BR-058)",
  copom_ata: "Banco Central do Brasil, atas do Copom (BR-058)",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: aba((await params).id)?.titulo ?? "Aba" };
}

function hojeEmBrasilia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

/** Página genérica de aba: tudo vem de config/abas/<id>.yaml (decisão 0005). */
export default async function PaginaAba({ params }: Props) {
  const a = aba((await params).id);
  if (!a) notFound();
  const hoje = hojeEmBrasilia();
  const ano = Number(hoje.slice(0, 4));
  const paineis = a.paineis.map((p) => resolverPainel(p, ano));
  const resumo = a.resumo.map((r) => ({ ...r, dado: resolverAno(r.dado, ano), rotulo: resolverAno(r.rotulo, ano) }));
  const ids = [...new Set([...paineis.flatMap((p) => p.series.map((s) => s.dado)), ...resumo.map((r) => r.dado)])];
  const naoDiarias = [...new Set(paineis.flatMap((p) => p.series).filter((s) => !/di[áa]ria|semanal|cont[íi]nua/i.test(s.frequencia)).map((s) => s.dado))];
  const [dados, eventos, novidades] = await Promise.all([
    lerSeries(ids),
    Promise.all(paineis.map((p) => (p.eventos ? lerEventos(p.eventos, p.quantidade ?? 3) : Promise.resolve([])))),
    ultimasDivulgacoes(naoDiarias),
  ]);
  const novoDe = new Map(novidades.map((d) => [d.series_id, d.quando]));
  const novoDoPainel = (series: { dado: string }[]) =>
    series.map((s) => novoDe.get(s.dado)).filter((x): x is string => !!x).sort().at(-1) ?? null;

  return (
    <EstadoAba abaId={a.id}>
      <section className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{a.titulo}</h1>
          <SeletorHorizonteAba />
        </div>
        {resumo.length > 0 && (
          <ResumoAba
            titulo={a.titulo} descricao={a.descricao}
            fichas={resumo.map((r) => fichaResumo(r, dados[r.dado] ?? []))}
            mudancas={maioresMudancas(paineis, dados, hoje)}
          />
        )}
        <IndiceAba paineis={paineis} />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {paineis.map((p, i) =>
            p.eventos ? (
              <PainelEventos key={p.titulo} id={p.id} titulo={p.titulo} eventos={eventos[i]} fonte={FONTE_EVENTOS[p.eventos]} />
            ) : (
              <PainelGrafico
                key={p.titulo} painel={p} novo={novoDoPainel(p.series)}
                dados={Object.fromEntries(p.series.map((s) => [s.dado, dados[s.dado] ?? []]))}
              />
            ),
          )}
        </div>
      </section>
    </EstadoAba>
  );
}
