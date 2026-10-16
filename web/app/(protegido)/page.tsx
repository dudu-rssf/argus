import Link from "next/link";
import { RodapeFormula } from "@/components/formula";
import { analisarCiclos, analiseItem5, SERIES_CICLOS, SERIES_ITEM5 } from "@/lib/analises";
import { direcoes, faixaMercado, seriesDivulgadas, SERIES_MERCADO, type Ficha } from "@/lib/central";
import { abas } from "@/lib/config";
import { lerSeries, ultimasDivulgacoes } from "@/lib/db";
import { duracao, fmtData, fmtMomento, fmtNumero } from "@/lib/formato";
import { FORMULA_TRAJETORIA, FORMULAS_ANALISES, FORMULAS_CENTRAL } from "@/lib/formulas";
import type { Direcao } from "@/lib/leitura";

export const dynamic = "force-dynamic";

function hojeEmBrasilia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

const sinal = (v: number, casas = 2) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${fmtNumero(Math.abs(v), casas)}`;
const SETA: Record<Direcao, string> = { subiu: "↑ subiu", caiu: "↓ caiu", estavel: "→ estável" };

function textoComparacao(f: Ficha): string {
  if (!f.referencia) return "";
  switch (f.comparacao) {
    case "decisao": return `na última decisão (${fmtData(f.referencia.data, "Diária")})`;
    case "diaAnterior": return `contra ${fmtData(f.referencia.data, "Diária")}`;
    case "mesAnterior": return `contra ${fmtData(f.referencia.data)}`;
    case "quatroSemanas": return `em 4 semanas (desde ${fmtData(f.referencia.data, "Diária")})`;
  }
}

function FichaMercado({ f }: { f: Ficha }) {
  return (
    <div className="flex flex-col gap-1 bg-painel px-4 py-3">
      <p className="text-xs text-texto-3">{f.rotulo}</p>
      {f.ultimo ? (
        <>
          <p className="num text-2xl text-texto">
            {fmtNumero(f.ultimo.valor, f.casas)}<span className="ml-1 text-xs text-texto-3">{f.unidade}</span>
          </p>
          {f.delta !== null && (
            <p className="num text-sm text-texto-2">
              {f.deltaUnidade === "bps" ? `${sinal(f.delta, 0)} bps` : `${sinal(f.delta)}${f.deltaUnidade === "%" ? "%" : " p.p."}`}{" "}
              <span className="text-xs text-texto-3">{textoComparacao(f)}</span>
            </p>
          )}
          <p className="text-xs text-texto-3">dado de {fmtData(f.ultimo.data, f.frequencia)}</p>
        </>
      ) : (
        <p className="text-sm text-texto-3">Sem dados no banco.</p>
      )}
    </div>
  );
}

export default async function Central() {
  const hoje = hojeEmBrasilia();
  const divulgaveis = seriesDivulgadas(abas(), Number(hoje.slice(0, 4)));
  const [dados, divulgacoes] = await Promise.all([
    lerSeries([...new Set([...Object.values(SERIES_MERCADO), ...Object.values(SERIES_CICLOS), ...Object.values(SERIES_ITEM5)])]),
    ultimasDivulgacoes(divulgaveis.map((s) => s.dado)),
  ]);
  const fichas = faixaMercado(dados);
  const episodio = analisarCiclos(dados, hoje).at(-1);
  const item5 = analiseItem5(dados, hoje);
  const taylor = [...item5.faixa].reverse().find((l) => l.mediana !== null);
  const hiato = item5.hiatos.at(-1);
  const postura = dados[SERIES_CICLOS.postura]?.at(-1);
  const dirs = direcoes(dados);
  const porDado = new Map(divulgaveis.map((s) => [s.dado, s]));

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Central</h1>
        <p className="mt-1 text-sm text-texto-2">O essencial do dia: mercado, o que mudou nas análises e o que acabou de ser divulgado.</p>
      </div>

      <article className="rounded-painel border border-linha bg-painel" aria-label="Faixa de mercado">
        <header className="border-b border-linha px-4 py-3"><h2 className="font-medium text-texto">Mercado</h2></header>
        <div className="grid grid-cols-2 gap-px bg-linha md:grid-cols-3 xl:grid-cols-6">
          {fichas.map((f) => <FichaMercado key={f.id} f={f} />)}
        </div>
        <RodapeFormula formulas={[FORMULAS_CENTRAL.faixa]} />
      </article>

      <article className="rounded-painel border border-linha bg-painel" aria-label="Resumo das análises">
        <header className="flex items-baseline justify-between gap-3 border-b border-linha px-4 py-3">
          <h2 className="font-medium text-texto">Resumo das análises</h2>
          <Link href="/analises" className="text-sm text-ouro hover:text-ouro-forte">Ver na aba Análises →</Link>
        </header>
        <div className="grid grid-cols-1 gap-px bg-linha md:grid-cols-2 xl:grid-cols-4">
          <div className="bg-painel px-4 py-3">
            <p className="text-xs text-texto-3">Copom</p>
            {episodio ? (
              <>
                <p className="mt-1 text-texto">
                  {episodio.tipo === "corte" ? "Ciclo de corte" : episodio.tipo === "alta" ? "Ciclo de alta" : "Manutenção"} há {duracao(episodio.meses)}
                </p>
                <p className="num text-sm text-texto-2">
                  Selic {fmtNumero(episodio.selicInicial)}% → {fmtNumero(episodio.selicFinal)}%
                  {episodio.bps !== 0 && ` (${sinal(episodio.bps, 0)} bps em ${episodio.decisoes.length} decisões)`}
                </p>
              </>
            ) : <p className="text-sm text-texto-3">Sem dados.</p>}
          </div>
          <div className="bg-painel px-4 py-3">
            <p className="text-xs text-texto-3">Postura monetária</p>
            {postura ? (
              <>
                <p className="num mt-1 text-texto">{sinal(postura.valor)} p.p. {postura.valor >= 0 ? "acima" : "abaixo"} do neutro</p>
                <p className="text-sm text-texto-2">juro real ex-ante menos neutro implícito no Focus, {fmtData(postura.data, "Diária")}</p>
              </>
            ) : <p className="text-sm text-texto-3">Sem dados.</p>}
          </div>
          <div className="bg-painel px-4 py-3">
            <p className="text-xs text-texto-3">Regra de Taylor</p>
            {taylor ? (
              <>
                <p className="num mt-1 text-texto">Selic {fmtNumero(taylor.selic ?? NaN)}% · regra {fmtNumero(taylor.minimo!)}–{fmtNumero(taylor.maximo!)}%</p>
                <p className="num text-sm text-texto-2">mediana {fmtNumero(taylor.mediana!)}%, {fmtData(`${taylor.mes}-01`)}</p>
              </>
            ) : <p className="text-sm text-texto-3">Sem dados.</p>}
          </div>
          <div className="bg-painel px-4 py-3">
            <p className="text-xs text-texto-3">Hiato do produto</p>
            {hiato?.hp != null ? (
              <>
                <p className="num mt-1 text-texto">HP {sinal(hiato.hp)}% · Hamilton {hiato.hamilton === null ? "—" : `${sinal(hiato.hamilton)}%`}</p>
                <p className="text-sm text-texto-2">{fmtData(hiato.data, "Trimestral")}, % do PIB tendencial</p>
              </>
            ) : <p className="text-sm text-texto-3">Sem dados.</p>}
          </div>
        </div>
        <div className="border-t border-linha px-4 py-3">
          <p className="text-xs text-texto-3">Direção (3 e 12 meses)</p>
          <ul className="mt-2 grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
            {dirs.map((d) => (
              <li key={d.id}>
                <span className="text-texto">{d.rotulo}</span>
                {d.ultimo ? (
                  <span className="num block text-texto-2">
                    {fmtNumero(d.ultimo.valor)}% em {fmtData(d.ultimo.data, d.frequencia)} · 3m {d.curto ? SETA[d.curto] : "—"} · 12m {d.medio ? SETA[d.medio] : "—"}
                  </span>
                ) : <span className="block text-texto-3">Sem dados.</span>}
              </li>
            ))}
          </ul>
        </div>
        <RodapeFormula formulas={[FORMULAS_ANALISES.ciclos, FORMULAS_ANALISES.postura, FORMULAS_ANALISES.taylor, FORMULAS_ANALISES.hiato, FORMULA_TRAJETORIA]} />
      </article>

      <article className="rounded-painel border border-linha bg-painel" aria-label="Últimas divulgações">
        <header className="border-b border-linha px-4 py-3">
          <h2 className="font-medium text-texto">Últimas divulgações</h2>
          <p className="text-xs text-texto-3">Dados mensais, trimestrais e anuais que entraram no banco nos últimos 7 dias.</p>
        </header>
        {divulgacoes.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-texto-3">
                <tr>
                  <th className="px-4 py-2 font-normal">Indicador</th>
                  <th className="px-4 py-2 font-normal">Referência</th>
                  <th className="px-4 py-2 text-right font-normal">Valor</th>
                  <th className="px-4 py-2 text-right font-normal">Anterior</th>
                  <th className="px-4 py-2 text-right font-normal">Δ</th>
                  <th className="px-4 py-2 font-normal">Entrou em</th>
                </tr>
              </thead>
              <tbody>
                {divulgacoes.map((d) => {
                  const s = porDado.get(d.series_id)!;
                  const emPontos = /%/.test(s.unidade) || s.tipo === "Taxa" || s.tipo === "Var % mensal";
                  const delta = d.anterior === null ? null : emPontos ? d.valor - d.anterior : d.anterior ? (d.valor / d.anterior - 1) * 100 : null;
                  return (
                    <tr key={d.series_id} className="border-t border-linha">
                      <td className="px-4 py-2">
                        <Link href={`/aba/${s.abaId}`} className="text-texto hover:text-ouro">{s.rotulo}</Link>
                        <span className="block text-xs text-texto-3">{s.aba} · {s.painel}</span>
                      </td>
                      <td className="px-4 py-2 text-texto-2">{fmtData(d.data, s.frequencia)}</td>
                      <td className="num px-4 py-2 text-right text-texto">{fmtNumero(d.valor)}</td>
                      <td className="num px-4 py-2 text-right text-texto-2">{d.anterior === null ? "—" : fmtNumero(d.anterior)}</td>
                      <td className="num px-4 py-2 text-right text-texto-2">{delta === null ? "—" : `${sinal(delta)}${emPontos ? " p.p." : "%"}`}</td>
                      <td className="px-4 py-2 text-texto-3">{fmtMomento(d.quando)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-texto-2">Nenhuma divulgação nova nos últimos 7 dias.</p>
        )}
        <RodapeFormula formulas={[FORMULAS_CENTRAL.divulgacoes]} />
      </article>

      <p className="text-xs text-texto-3">
        Agenda de divulgações e notícias entram na próxima etapa. Situação de cada série: <Link href="/dados" className="text-ouro hover:text-ouro-forte">Saúde dos dados</Link>.
      </p>
    </section>
  );
}
