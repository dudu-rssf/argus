import type { Metadata } from "next";
import Link from "next/link";
import { saudeDasSeries, ultimasExecucoes, type SaudeSerie } from "@/lib/db";
import { fmtMomento } from "@/lib/formato";

export const metadata: Metadata = { title: "Saúde dos dados" };

const GATILHO: Record<string, string> = { agenda: "Agenda", botao: "Botão", manual: "Manual", teste: "Teste" };
const STATUS: Record<string, { texto: string; cor: string }> = {
  ok: { texto: "Concluída", cor: "text-alta" },
  parcial: { texto: "Com falhas", cor: "text-alerta" },
  erro: { texto: "Falhou", cor: "text-baixa" },
  rodando: { texto: "Rodando", cor: "text-ouro" },
  sem_novidade: { texto: "Sem novidade", cor: "text-texto-2" },
};

function diasDesde(iso: string | null): number | null {
  if (!iso) return null;
  return Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86_400_000));
}

function problema(s: SaudeSerie): boolean {
  return s.status === "erro";
}

export default async function SaudeDosDados({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  const { filtro } = await searchParams;
  const [execucoes, series] = await Promise.all([ultimasExecucoes(10), saudeDasSeries()]);
  const comProblema = series.filter(problema);
  const lista = filtro === "problema" ? comProblema : series;

  return (
    <section className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">Saúde dos dados</h1>
        <p className="mt-1 text-sm text-texto-2">
          {series.length} séries de dados no banco; {comProblema.length === 0
            ? "nenhuma falhou na última coleta."
            : comProblema.length === 1 ? "1 falhou na última coleta." : `${comProblema.length} falharam na última coleta.`}
        </p>
      </div>

      <div>
        <h2 className="mb-2 font-medium">Últimas coletas</h2>
        <div className="overflow-x-auto rounded-painel border border-linha">
          <table className="w-full text-sm">
            <thead className="bg-painel text-left text-texto-3">
              <tr>
                <th className="px-3 py-2 font-normal">Início</th>
                <th className="px-3 py-2 font-normal">Gatilho</th>
                <th className="px-3 py-2 font-normal">Resultado</th>
                <th className="px-3 py-2 text-right font-normal">Com dado novo</th>
                <th className="px-3 py-2 text-right font-normal">Sem novidade</th>
                <th className="px-3 py-2 text-right font-normal">Falhas</th>
              </tr>
            </thead>
            <tbody>
              {execucoes.map((e) => (
                <tr key={e.id} className="border-t border-linha">
                  <td className="num px-3 py-2">{fmtMomento(e.iniciado_em)}</td>
                  <td className="px-3 py-2 text-texto-2">{GATILHO[e.gatilho] ?? e.gatilho}</td>
                  <td className={`px-3 py-2 ${STATUS[e.status]?.cor ?? ""}`}>{STATUS[e.status]?.texto ?? e.status}</td>
                  <td className="num px-3 py-2 text-right">{e.ok}</td>
                  <td className="num px-3 py-2 text-right text-texto-2">{e.sem_novidade}</td>
                  <td className={`num px-3 py-2 text-right ${e.erro ? "text-baixa" : "text-texto-3"}`}>{e.erro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-medium">Por série</h2>
          <nav className="flex gap-3 text-sm">
            <Link href="/dados" aria-current={filtro !== "problema" ? "page" : undefined}
              className={filtro !== "problema" ? "text-ouro" : "text-texto-2 hover:text-texto"}>Todas</Link>
            <Link href="/dados?filtro=problema" aria-current={filtro === "problema" ? "page" : undefined}
              className={filtro === "problema" ? "text-ouro" : "text-texto-2 hover:text-texto"}>
              Só com problema ({comProblema.length})
            </Link>
          </nav>
        </div>
        {lista.length === 0 ? (
          <p className="rounded-painel border border-linha px-4 py-8 text-center text-sm text-texto-2">
            Nenhuma série com problema na última coleta.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-painel border border-linha">
            <table className="w-full text-sm">
              <thead className="bg-painel text-left text-texto-3">
                <tr>
                  <th className="px-3 py-2 font-normal">Série</th>
                  <th className="px-3 py-2 font-normal">Fonte</th>
                  <th className="px-3 py-2 font-normal">Último dado</th>
                  <th className="px-3 py-2 text-right font-normal">Observações</th>
                  <th className="px-3 py-2 font-normal">Última coleta</th>
                  <th className="px-3 py-2 text-right font-normal">Dias sem dado novo</th>
                  <th className="px-3 py-2 font-normal">Erro</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((s) => {
                  const dias = diasDesde(s.ultimo_dado_novo);
                  return (
                    <tr key={s.series_id} className="border-t border-linha align-top">
                      <td className="px-3 py-2">
                        <div className="text-texto">{s.indicador}</div>
                        <div className="break-all text-xs text-texto-3">{s.series_id}</div>
                      </td>
                      <td className="px-3 py-2 text-texto-2">{s.fonte}</td>
                      <td className="num px-3 py-2">{s.ultima_obs ?? "—"}</td>
                      <td className="num px-3 py-2 text-right text-texto-2">{s.n.toLocaleString("pt-BR")}</td>
                      <td className="px-3 py-2">
                        <span className={STATUS[s.status ?? ""]?.cor ?? "text-texto-3"}>
                          {s.status === "erro" ? "Falhou" : s.status === "ok" ? "Dado novo" : s.status === "sem_novidade" ? "Sem novidade" : "—"}
                        </span>
                        <div className="num text-xs text-texto-3">{fmtMomento(s.ultima_coleta)}</div>
                      </td>
                      <td className="num px-3 py-2 text-right text-texto-2">{dias ?? "—"}</td>
                      <td className="max-w-xs px-3 py-2 text-xs text-baixa">{s.erro ?? ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
