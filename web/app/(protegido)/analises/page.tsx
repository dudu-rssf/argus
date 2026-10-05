import type { Metadata } from "next";
import { AnalogosHistoricos } from "@/components/analises/analogos-historicos";
import { SecaoCopom } from "@/components/analises/secao-copom";
import { SecaoPostura } from "@/components/analises/secao-postura";
import { GraficoAlinhado, type CicloAlinhado } from "@/components/analises/grafico-alinhado";
import { TabelaCiclos } from "@/components/analises/tabela-ciclos";
import { analisarCiclos, painelAnalogos, SERIES_CICLOS, VARIAVEIS_ESTADO, type LinhaCiclo } from "@/lib/analises";
import { PAUSA_PADRAO_MESES } from "@/lib/ciclos";
import { extrairVotos } from "@/lib/copom-votos";
import { lerEventos, lerSeries } from "@/lib/db";
import { duracao, fmtData, fmtNumero } from "@/lib/formato";

export const metadata: Metadata = { title: "Análises" };

function hojeEmBrasilia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function alinhados(linhas: LinhaCiclo[], tipo: "corte" | "alta"): CicloAlinhado[] {
  const doTipo = linhas.filter((l) => l.tipo === tipo && l.trajetoria.length > 1);
  const ultimo = doTipo.at(-1);
  return doTipo.map((l) => ({
    rotulo: `${tipo === "corte" ? "Corte" : "Alta"} de ${fmtData(l.inicio)}${l.emAndamento ? " (em andamento)" : ` a ${fmtData(l.fim)}`}`,
    destaque: l === ultimo, pontos: l.trajetoria,
  }));
}

export default async function Analises() {
  const hoje = hojeEmBrasilia();
  const [dados, comunicados] = await Promise.all([
    lerSeries(Object.values(SERIES_CICLOS)),
    lerEventos("copom_comunicado", 1000),
  ]);
  const linhas = analisarCiclos(dados, hoje);
  const atual = linhas.at(-1);

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Análises</h1>
        <p className="mt-1 max-w-3xl text-sm text-texto-2">
          Única aba com interpretação. Cada análise mostra a regra usada; mudar a regra muda o resultado.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Ciclos de política monetária</h2>

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
          <GraficoAlinhado titulo="Ciclos de corte, alinhados no início" ciclos={alinhados(linhas, "corte")} />
          <GraficoAlinhado titulo="Ciclos de alta, alinhados no início" ciclos={alinhados(linhas, "alta")} />
        </div>

        <details className="rounded-painel border border-linha bg-painel px-5 py-4 text-sm text-texto-2">
          <summary className="cursor-pointer text-texto">Como os episódios são definidos</summary>
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            <li>Fonte: meta Selic definida pelo Copom (BCB SGS 432), desde março de 1999. Cada mudança é uma decisão, na data em que passa a valer.</li>
            <li>Ciclo de corte ou de alta: movimentos na mesma direção com menos de {PAUSA_PADRAO_MESES} meses entre um e outro. Termina no último movimento antes de uma inversão ou de uma pausa de {PAUSA_PADRAO_MESES} meses ou mais.</li>
            <li>Manutenção: todo intervalo sem mudança entre dois ciclos. Nunca há manutenção no meio de um ciclo.</li>
            <li>Métricas no início e no fim usam o último dado disponível até a data, pela data de referência do dado, não pela data em que foi divulgado.</li>
            <li>Desocupação só existe desde 2012 (PNAD Contínua), Focus 12 meses desde 2001 e Ibovespa desde 1998. Sem dado, o campo aparece vazio.</li>
            <li>Variações: em pontos percentuais para taxas; em % para dólar e Ibovespa.</li>
          </ul>
        </details>
      </div>

      <SecaoPostura
        juroReal={dados[SERIES_CICLOS.juroReal] ?? []}
        neutro={dados[SERIES_CICLOS.neutro] ?? []}
        postura={dados[SERIES_CICLOS.postura] ?? []}
      />

      <AnalogosHistoricos painel={painelAnalogos(dados, hoje)} variaveis={VARIAVEIS_ESTADO} />

      <SecaoCopom votos={comunicados.map(extrairVotos)} />
    </section>
  );
}
