import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EstadoAba, SeletorHorizonteAba } from "@/components/aba/estado-aba";
import { IndiceAba, ResumoAba } from "@/components/aba/resumo-aba";
import { PainelGrafico } from "@/components/grafico/painel-grafico";
import { PainelEventos } from "@/components/painel-eventos";
import { aba, resolverAno, resolverPainel } from "@/lib/config";
import { lerEventos, lerSeries, ultimasDivulgacoes } from "@/lib/db";
import { fichaResumo, maioresMudancas } from "@/lib/resumo";
import Link from "next/link";
import { GeralInflacaoView } from "@/components/geral/geral-inflacao";
import { calcularFatos, frase } from "@/lib/fatos";
import ipcaGerado from "@/lib/gerado/ipca.json";
import type { Classificacao } from "@/lib/geral/composicao";
import { desdeSubitens, geralInflacao, idsGeralInflacao, idsSubitens, SERIES_GERAL_INFLACAO } from "@/lib/geral/inflacao";

const IPCA = { subitens: ipcaGerado.subitens, classificacao: ipcaGerado.classificacao as Classificacao };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ver?: string }> };

/** Abas que já têm a seção Geral (Fase 6d). As outras abrem direto nos dados. */
const COM_GERAL = new Set(["inflacao"]);

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
export default async function PaginaAba({ params, searchParams }: Props) {
  const a = aba((await params).id);
  if (!a) notFound();
  const temGeral = COM_GERAL.has(a.id);
  const ver = temGeral && (await searchParams).ver !== "dados" ? "geral" : "dados";
  const hoje = hojeEmBrasilia();
  const ano = Number(hoje.slice(0, 4));
  const paineis = a.paineis.map((p) => resolverPainel(p, ano));
  const resumo = a.resumo.map((r) => ({ ...r, dado: resolverAno(r.dado, ano), rotulo: resolverAno(r.rotulo, ano) }));
  const ids = ver === "geral"
    ? idsGeralInflacao(ano)
    : [...new Set([...paineis.flatMap((p) => p.series.map((s) => s.dado)), ...resumo.map((r) => r.dado)])];
  const naoDiarias = [...new Set(paineis.flatMap((p) => p.series).filter((s) => !/di[áa]ria|semanal|cont[íi]nua/i.test(s.frequencia)).map((s) => s.dado))];
  const [dados, subitens, eventos, novidades] = await Promise.all([
    lerSeries(ids),
    ver === "geral" ? lerSeries(idsSubitens(IPCA.subitens), desdeSubitens(hoje)) : Promise.resolve({}),
    Promise.all(paineis.map((p) => (p.eventos && ver === "dados" ? lerEventos(p.eventos, p.quantidade ?? 3) : Promise.resolve([])))),
    ver === "dados" ? ultimasDivulgacoes(naoDiarias) : Promise.resolve([]),
  ]);
  const novoDe = new Map(novidades.map((d) => [d.series_id, d.quando]));
  const novoDoPainel = (series: { dado: string }[]) =>
    series.map((s) => novoDe.get(s.dado)).filter((x): x is string => !!x).sort().at(-1) ?? null;

  const seletor = temGeral && (
    <nav aria-label="Seção da aba" className="flex rounded-controle border border-linha p-0.5">
      {(["geral", "dados"] as const).map((v) => (
        <Link key={v} href={v === "geral" ? `/aba/${a.id}` : `/aba/${a.id}?ver=dados`} aria-current={ver === v ? "page" : undefined}
          className={`rounded-controle px-4 py-1.5 text-sm ${ver === v ? "bg-ouro-tenue font-medium text-ouro" : "text-texto-2 hover:text-texto"}`}>
          {v === "geral" ? "Geral" : "Todos os dados"}
        </Link>
      ))}
    </nav>
  );

  if (ver === "geral") {
    const ipca12 = dados[SERIES_GERAL_INFLACAO.ipca12] ?? [];
    const fatos = calcularFatos(ipca12, { emPontos: true, frequencia: "Mensal", meta: dados[SERIES_GERAL_INFLACAO.meta] ?? [] });
    return (
      <section className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{a.titulo}</h1>
            {a.descricao && <p className="mt-1 max-w-2xl text-sm text-texto-3">{a.descricao}</p>}
          </div>
          {seletor}
        </div>
        <GeralInflacaoView g={geralInflacao({ ...dados, ...subitens }, hoje, IPCA)} frase={fatos ? frase("IPCA 12 meses", fatos, { unidade: "%", frequencia: "Mensal" }) : null} />
      </section>
    );
  }

  return (
    <EstadoAba abaId={a.id}>
      <section className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{a.titulo}</h1>
          <div className="flex flex-wrap items-center gap-4">{seletor}<SeletorHorizonteAba /></div>
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
