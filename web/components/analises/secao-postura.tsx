import { Info } from "@/components/info";
import { PainelGrafico } from "@/components/grafico/painel-grafico";
import type { Painel, SerieDoPainel } from "@/lib/config";
import { fmtData, fmtNumero } from "@/lib/formato";
import { FORMULAS_ANALISES } from "@/lib/formulas";
import { lerTrajetoria } from "@/lib/leitura";
import type { Ponto } from "@/lib/transform";

const serie = (dado: string, serieId: string, rotulo: string, frequencia: string): SerieDoPainel => ({
  dado, serie: serieId, rotulo, tipo: "Taxa", frequencia, unidade: "% a.a.", fonte: "Argus (BCB SGS 432 e Focus)", codigo: "derivado",
});

/**
 * Postura monetária: juro real ex-ante contra o neutro implícito nas expectativas do Focus.
 * Leitura de mercado, não estimativa estrutural do neutro.
 */
export function SecaoPostura({ juroReal, neutro, postura }: { juroReal: Ponto[]; neutro: Ponto[]; postura: Ponto[] }) {
  const ultimo = { real: juroReal.at(-1), neutro: neutro.at(-1), gap: postura.at(-1) };
  const leitura = lerTrajetoria(postura, true, "Diária");
  const painelNivel: Painel = {
    titulo: "Juro real ex-ante e neutro implícito", transformacao: "nivel",
    descricao: "Juro real: a Selic de hoje descontada da inflação que o mercado espera para os próximos 12 meses. Neutro implícito: o juro real que o mercado espera para daqui a 3 anos, quando os efeitos de curto prazo já passaram.", combinado: null, eventos: null,
    series: [serie("BR-055:derivado", "BR-055", "Juro real ex-ante", "Diária"), serie("BR-117:derivado", "BR-117", "Neutro implícito (Focus t+3)", "Semanal")],
  };
  const painelGap: Painel = {
    titulo: "Juro real menos neutro (p.p.)", transformacao: "nivel",
    descricao: "A distância entre os dois: positiva quando o juro real está acima do neutro implícito (política apertada por essa régua), negativa quando está abaixo.", combinado: null, eventos: null,
    series: [serie("BR-118:derivado", "BR-118", "Diferença", "Diária")],
  };
  return (
    <div className="flex flex-col gap-4">
      <h2 id="postura" className="flex scroll-mt-20 items-center gap-2 text-lg font-semibold tracking-tight">Postura monetária<Info titulo="Postura monetária">Compara o juro real de hoje (Selic descontada da inflação esperada para 12 meses) com o juro neutro que o mercado embute no Focus para daqui a 3 anos. Acima do neutro, a política está apertada por essa régua; abaixo, frouxa. É leitura de mercado, não estimativa oficial do neutro.</Info></h2>
      {ultimo.real && ultimo.neutro && ultimo.gap && (
        <div className="rounded-painel border border-linha bg-painel px-5 py-4">
          <p className="text-sm text-texto-2">Em {fmtData(ultimo.gap.data, "Diária")}</p>
          <p className="mt-1 text-lg text-texto">
            Juro real ex-ante de <span className="num">{fmtNumero(ultimo.real.valor)}%</span> contra neutro implícito de{" "}
            <span className="num">{fmtNumero(ultimo.neutro.valor)}%</span>:{" "}
            <span className="num text-ouro">{fmtNumero(Math.abs(ultimo.gap.valor))} p.p. {ultimo.gap.valor >= 0 ? "acima" : "abaixo"}</span> do neutro
          </p>
          {leitura?.longo && (
            <p className="mt-1 text-sm text-texto-2">
              Essa diferença é maior que {leitura.longo.percentil}% das observações dos últimos {leitura.longo.anos} anos
              (média do período: {fmtNumero(leitura.longo.media)} p.p.).
            </p>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <PainelGrafico painel={painelNivel} dados={{ "BR-055:derivado": juroReal, "BR-117:derivado": neutro }} />
        <PainelGrafico painel={painelGap} formulasExtras={[FORMULAS_ANALISES.postura]} dados={{ "BR-118:derivado": postura }} />
      </div>
    </div>
  );
}
