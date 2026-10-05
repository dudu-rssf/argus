import { PainelGrafico } from "@/components/grafico/painel-grafico";
import type { Painel, SerieDoPainel } from "@/lib/config";
import { fmtData, fmtNumero } from "@/lib/formato";
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
    titulo: "Juro real ex-ante e neutro implícito", transformacao: "nivel", combinado: null, eventos: null,
    series: [serie("BR-055:derivado", "BR-055", "Juro real ex-ante", "Diária"), serie("BR-117:derivado", "BR-117", "Neutro implícito (Focus t+3)", "Semanal")],
  };
  const painelGap: Painel = {
    titulo: "Juro real menos neutro (p.p.)", transformacao: "nivel", combinado: null, eventos: null,
    series: [serie("BR-118:derivado", "BR-118", "Diferença", "Diária")],
  };
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-medium">Postura monetária</h2>
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
        <PainelGrafico painel={painelGap} dados={{ "BR-118:derivado": postura }} />
      </div>
      <details className="rounded-painel border border-linha bg-painel px-5 py-4 text-sm text-texto-2">
        <summary className="cursor-pointer text-texto">Como a postura é medida</summary>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>Juro real ex-ante: meta Selic vigente deflacionada pela expectativa de IPCA 12 meses à frente do Focus, pela fórmula de Fisher: (1 + Selic) / (1 + IPCA esperado) − 1.</li>
          <li>Neutro implícito: Selic e IPCA esperados pelo Focus para daqui a 3 anos, na mesma pesquisa, pela mesma fórmula. É o juro real que o mercado espera quando os efeitos de curto prazo já passaram; uma leitura de mercado, não uma estimativa estrutural do neutro.</li>
          <li>Diferença positiva: política acima do neutro implícito (contracionista por essa régua). Negativa: abaixo.</li>
          <li>As estimativas de neutro do próprio Banco Central entram depois, digitadas dos relatórios, com a fonte.</li>
        </ul>
      </details>
    </div>
  );
}
