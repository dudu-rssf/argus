/**
 * Item 5: hiato do produto, regra de Taylor e curva de Phillips (descritiva).
 * Componente de servidor: recebe tudo calculado e só exibe.
 */
import { Info } from "@/components/info";
import { PainelGrafico } from "@/components/grafico/painel-grafico";
import { GraficoDispersao, type Periodo } from "@/components/analises/grafico-dispersao";
import { GraficoFaixa } from "@/components/analises/grafico-faixa";
import type { AnaliseItem5 } from "@/lib/analises";
import type { Painel, SerieDoPainel } from "@/lib/config";
import { fmtData, fmtNumero } from "@/lib/formato";
import { FORMULAS_ANALISES } from "@/lib/formulas";
import { ESPECIFICACOES, rotuloEspecificacao } from "@/lib/taylor";

const PERIODOS: Periodo[] = [
  { rotulo: "1999–2005", de: "1999-01-01", ate: "2005-12-31" },
  { rotulo: "2006–2012", de: "2006-01-01", ate: "2012-12-31" },
  { rotulo: "2013–2019", de: "2013-01-01", ate: "2019-12-31" },
  { rotulo: "2020 em diante", de: "2020-01-01", ate: "9999-12-31" },
];

const serieHiato = (dado: string, rotulo: string): SerieDoPainel => ({
  dado, serie: "Argus", rotulo, tipo: "Taxa", frequencia: "Trimestral", unidade: "% do PIB tendencial",
  fonte: "Argus (IBGE SIDRA 1621, PIB com ajuste sazonal)", codigo: "derivado",
});

const sinal = (v: number) => `${v >= 0 ? "+" : "−"}${fmtNumero(Math.abs(v))}`;
const inicioDoTrimestre = (mes: string) =>
  `${mes.slice(0, 4)}-${String(Math.floor((Number(mes.slice(5, 7)) - 1) / 3) * 3 + 1).padStart(2, "0")}-01`;
const trimestre = (data: string) => `${Math.floor((Number(data.slice(5, 7)) - 1) / 3) + 1}º tri ${data.slice(0, 4)}`;

export function SecaoTaylor({ analise }: { analise: AnaliseItem5 }) {
  const { hiatos, faixa, phillipsDesocupacao, phillipsHiato } = analise;
  const serie = (k: "hp" | "hpTempoReal" | "hamilton") =>
    hiatos.filter((l) => l[k] !== null).map((l) => ({ data: l.data, valor: l[k] as number }));
  const painelHiato: Painel = {
    titulo: "Hiato do produto, três estimativas (% do PIB tendencial)", transformacao: "nivel",
    descricao: "Quanto o PIB está acima (positivo) ou abaixo (negativo) da sua tendência. Como a tendência não é observável, aparecem três estimativas: HP com a amostra inteira, HP só com o que se sabia em cada momento, e Hamilton.", combinado: null, eventos: null,
    series: [serieHiato("hiato:hp", "HP, amostra inteira"), serieHiato("hiato:tr", "HP, tempo real"), serieHiato("hiato:ham", "Hamilton")],
  };
  const ultimoHiato = hiatos.at(-1);
  const hoje = [...faixa].reverse().find((l) => l.mediana !== null);

  return (
    <div className="flex flex-col gap-4">
      <h2 id="taylor" className="flex scroll-mt-20 items-center gap-2 text-lg font-semibold tracking-tight">Hiato do produto, regra de Taylor e curva de Phillips<Info titulo="Hiato do produto, regra de Taylor e curva de Phillips">Hiato: quanto o PIB está acima ou abaixo da sua tendência, por três métodos (não é observável, por isso a faixa). Regra de Taylor: a Selic que uma fórmula convencional daria com a inflação, a meta, o neutro e o hiato de hoje, em 16 variações de peso; a faixa mostra a menor e a maior. Phillips: a relação entre inflação e folga da economia, só como dispersão. Passe o mouse nos gráficos para ver cada mês; o botão Fórmula tem as contas.</Info></h2>

      {ultimoHiato && hoje && (
        <div className="rounded-painel border border-linha bg-painel px-5 py-4">
          <p className="text-sm text-texto-2">
            Hiato no {trimestre(ultimoHiato.data)}: {" "}
            <span className="num text-texto">
              HP {sinal(ultimoHiato.hp!)}% · tempo real {sinal(ultimoHiato.hpTempoReal!)}% · Hamilton{" "}
              {ultimoHiato.hamilton === null ? "—" : `${sinal(ultimoHiato.hamilton)}%`}
            </span>
          </p>
          <p className="mt-1 text-lg text-texto">
            Em {fmtData(`${hoje.mes}-01`)}, Selic de <span className="num">{fmtNumero(hoje.selic ?? NaN)}%</span> contra a regra de Taylor
            entre <span className="num">{fmtNumero(hoje.minimo!)}%</span> e <span className="num">{fmtNumero(hoje.maximo!)}%</span>{" "}
            <span className="text-texto-2">(mediana <span className="num text-ouro">{fmtNumero(hoje.mediana!)}%</span>)</span>
          </p>
          {hoje.hiatoDe && hoje.hiatoDe < inicioDoTrimestre(hoje.mes) && (
            <p className="mt-1 text-xs text-texto-3">
              O PIB deste trimestre ainda não saiu: a regra usa o hiato do {trimestre(hoje.hiatoDe)}, o último conhecido.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <PainelGrafico painel={painelHiato} formulasExtras={[FORMULAS_ANALISES.hiato]} dados={{ "hiato:hp": serie("hp"), "hiato:tr": serie("hpTempoReal"), "hiato:ham": serie("hamilton") }} />
        <GraficoFaixa titulo="Selic efetiva e regra de Taylor" pontos={faixa} formula={FORMULAS_ANALISES.taylor} />
      </div>

      {hoje && (
        <details className="rounded-painel border border-linha bg-painel px-5 py-4 text-sm text-texto-2">
          <summary className="cursor-pointer text-texto">As 16 especificações em {fmtData(`${hoje.mes}-01`)}</summary>
          <table className="mt-3 w-full max-w-2xl text-sm">
            <thead><tr className="text-left text-texto-3"><th className="py-1 font-normal">Especificação</th><th className="py-1 text-right font-normal">Selic da regra</th><th className="py-1 text-right font-normal">Selic efetiva − regra</th></tr></thead>
            <tbody>
              {ESPECIFICACOES.map((e, i) => ({ e, v: hoje.especificacoes[i] }))
                .sort((a, b) => (a.v ?? 0) - (b.v ?? 0))
                .map(({ e, v }) => (
                  <tr key={rotuloEspecificacao(e)} className="border-t border-linha">
                    <td className="py-1">{rotuloEspecificacao(e)}</td>
                    <td className="num py-1 text-right text-texto">{v === null ? "—" : `${fmtNumero(v)}%`}</td>
                    <td className="num py-1 text-right">{v === null || hoje.selic === null ? "—" : `${sinal(hoje.selic - v)} p.p.`}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </details>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <GraficoDispersao
          titulo="Inflação e desocupação" subtitulo="IPCA 12 meses contra a taxa de desocupação, mês a mês, desde 2012 (PNAD Contínua)."
          pontos={phillipsDesocupacao} periodos={PERIODOS} formula={FORMULAS_ANALISES.phillipsDesocupacao} eixoX="Desocupação (%)" eixoY="IPCA 12 meses (%)" frequencia="Mensal" />
        <GraficoDispersao
          titulo="Inflação acima da meta e hiato" subtitulo="IPCA 12 meses menos a meta do ano contra o hiato (HP), por trimestre, desde 1999."
          pontos={phillipsHiato} periodos={PERIODOS} formula={FORMULAS_ANALISES.phillipsHiato} eixoX="Hiato HP (% do PIB)" eixoY="IPCA 12m − meta (p.p.)" frequencia="Trimestral" />
      </div>

    </div>
  );
}
