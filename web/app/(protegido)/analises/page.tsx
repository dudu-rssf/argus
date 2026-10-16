import { Info } from "@/components/info";
import type { Metadata } from "next";
import { AnalogosHistoricos } from "@/components/analises/analogos-historicos";
import { SecaoCopom } from "@/components/analises/secao-copom";
import { SecaoPostura } from "@/components/analises/secao-postura";
import { SecaoTaylor } from "@/components/analises/secao-taylor";
import { GraficoAlinhado, type CicloAlinhado } from "@/components/analises/grafico-alinhado";
import { TabelaCiclos } from "@/components/analises/tabela-ciclos";
import { analisarCiclos, analiseItem5, painelAnalogos, SERIES_CICLOS, SERIES_ITEM5, VARIAVEIS_ESTADO, type LinhaCiclo } from "@/lib/analises";
import { extrairVotos } from "@/lib/copom-votos";
import { lerEventos, lerSeries } from "@/lib/db";
import { duracao, fmtData, fmtNumero } from "@/lib/formato";
import { FORMULAS_ANALISES } from "@/lib/formulas";
import { mesesEntre } from "@/lib/ciclos";

export const metadata: Metadata = { title: "Análises" };

function hojeEmBrasilia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function alinhados(linhas: LinhaCiclo[], tipo: "corte" | "alta"): CicloAlinhado[] {
  const doTipo = linhas.filter((l) => l.tipo === tipo && l.trajetoria.length > 1);
  const ultimo = doTipo.at(-1);
  return doTipo.map((l) => ({
    rotulo: `${tipo === "corte" ? "Corte" : "Alta"} de ${fmtData(l.inicio)}${l.emAndamento ? " (em andamento)" : ` a ${fmtData(l.fim)}`}`,
    resumo: `${fmtNumero(l.selicInicial)}% → ${fmtNumero(l.selicFinal)}%, ${l.bps > 0 ? "+" : "−"}${Math.abs(l.bps)} bps em ${l.decisoes.length} ${l.decisoes.length === 1 ? "decisão" : "decisões"}, ${duracao(l.meses)}`,
    destaque: l === ultimo, pontos: l.trajetoria,
    decisoes: l.decisoes.map((d) => ({ t: mesesEntre(l.inicio, d.data), data: d.data, de: d.de, para: d.para })),
  }));
}

export default async function Analises() {
  const hoje = hojeEmBrasilia();
  const [dados, comunicados] = await Promise.all([
    lerSeries([...Object.values(SERIES_CICLOS), ...Object.values(SERIES_ITEM5)]),
    lerEventos("copom_comunicado", 1000),
  ]);
  const linhas = analisarCiclos(dados, hoje);
  const atual = linhas.at(-1);

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Análises</h1>
        <p className="mt-1 max-w-3xl text-sm text-texto-2">
          Única aba com interpretação. Cada análise mostra a regra usada; mudar a regra muda o resultado.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <h2 id="ciclos" className="flex scroll-mt-20 items-center gap-2 text-lg font-semibold tracking-tight">Ciclos de política monetária<Info titulo="Ciclos de política monetária">Cada episódio é um ciclo de corte, de alta ou um período de manutenção da Selic desde 1999. Clique numa linha da tabela para ver cada decisão (data, de quanto para quanto, bps) e as métricas no início e no fim. No gráfico alinhado, passe o mouse: aparecem a Selic de cada ciclo naquele mês, o total do ciclo e a decisão daquele mês.</Info></h2>

        {atual && (
          <div className="rounded-painel border border-ouro/40 bg-painel px-5 py-4">
            <p className="text-sm text-texto-2">Episódio atual</p>
            <p className="mt-1 text-lg text-texto">
              {atual.tipo === "corte" ? "Ciclo de corte" : atual.tipo === "alta" ? "Ciclo de alta" : "Manutenção"} desde{" "}
              {fmtData(atual.inicio, "Diária")}
              <span className="text-texto-2">, há {duracao(atual.meses)}</span>
            </p>
            <p className="num mt-1 text-sm text-texto-2">
              Selic {fmtNumero(atual.selicInicial)}% → {fmtNumero(atual.selicFinal)}%
              {atual.bps !== 0 && ` (${atual.bps > 0 ? "+" : "−"}${Math.abs(atual.bps)} bps em ${atual.decisoes.length} decisões)`}
            </p>
          </div>
        )}

        <TabelaCiclos linhas={linhas} />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <GraficoAlinhado titulo="Ciclos de corte, alinhados no início" ciclos={alinhados(linhas, "corte")} formula={FORMULAS_ANALISES.ciclos} />
          <GraficoAlinhado titulo="Ciclos de alta, alinhados no início" ciclos={alinhados(linhas, "alta")} formula={FORMULAS_ANALISES.ciclos} />
        </div>

      </div>

      <SecaoPostura
        juroReal={dados[SERIES_CICLOS.juroReal] ?? []}
        neutro={dados[SERIES_CICLOS.neutro] ?? []}
        postura={dados[SERIES_CICLOS.postura] ?? []}
      />

      <SecaoTaylor analise={analiseItem5(dados, hoje)} />

      <AnalogosHistoricos painel={painelAnalogos(dados, hoje)} variaveis={VARIAVEIS_ESTADO} />

      <SecaoCopom votos={comunicados.map(extrairVotos)} />
    </section>
  );
}
