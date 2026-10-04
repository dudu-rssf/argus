import { fmtData, fmtNumero } from "@/lib/formato";
import type { Leitura, Movimento } from "@/lib/leitura";

const SETA = { subiu: "↑", caiu: "↓", estavel: "→" } as const;
const VERBO = { subiu: "Subiu", caiu: "Caiu", estavel: "Estável" } as const;

function Mov({ titulo, m, emPontos, freq }: { titulo: string; m: Movimento | null; emPontos: boolean; freq: string }) {
  return (
    <div className="min-w-0">
      <div className="whitespace-nowrap text-xs text-texto-3">{titulo}</div>
      {m ? (
        <div className="text-sm">
          <div className="whitespace-nowrap">
            <span aria-hidden className="mr-1 text-ouro">{SETA[m.direcao]}</span>
            <span className="text-texto">{VERBO[m.direcao]}</span>{" "}
            <span className="num text-texto-2">
              {m.delta > 0 ? "+" : m.delta < 0 ? "−" : ""}{fmtNumero(Math.abs(m.delta))}{emPontos ? "\u00a0p.p." : "%"}
            </span>
          </div>
          <div className="text-xs text-texto-3">desde {fmtData(m.referencia.data, freq)}</div>
        </div>
      ) : <div className="text-sm text-texto-3">Sem dado para comparar</div>}
    </div>
  );
}

/** Curto (3 meses), médio (12 meses) e longo (10 anos), sem juízo de bom ou ruim (decisão 0013). */
export function FaixaLeitura({ rotulo, leitura, freq, casas }: { rotulo?: string; leitura: Leitura; freq: string; casas: number }) {
  const { longo } = leitura;
  return (
    <div className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
      {rotulo && <div className="text-xs font-medium text-texto-2 sm:col-span-3">{rotulo}</div>}
      <Mov titulo="Curto prazo (3 meses)" m={leitura.curto} emPontos={leitura.emPontos} freq={freq} />
      <Mov titulo="Médio prazo (12 meses)" m={leitura.medio} emPontos={leitura.emPontos} freq={freq} />
      <div className="min-w-0">
        <div className="text-xs text-texto-3">
          Longo prazo ({longo ? `${longo.anos} ${longo.anos === 1 ? "ano" : "anos"}` : "10 anos"})
        </div>
        {longo ? (
          <div className="text-sm">
            <span className="text-texto">Acima de {longo.percentil}% do histórico</span>
            <div className="text-xs text-texto-3">média: <span className="num">{fmtNumero(longo.media, casas)}</span></div>
          </div>
        ) : <div className="text-sm text-texto-3">Histórico curto demais</div>}
      </div>
    </div>
  );
}
