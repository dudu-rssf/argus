import { diretores, type VotoReuniao } from "@/lib/copom-votos";
import { fmtData } from "@/lib/formato";

/** Copom por diretor: votos e dissidências extraídos dos comunicados oficiais. */
export function SecaoCopom({ votos }: { votos: VotoReuniao[] }) {
  const desde2003 = votos.filter((v) => v.data >= "2003-01-01");
  const divididas = votos.filter((v) => v.unanime === false).sort((a, b) => b.data.localeCompare(a.data));
  const unanimes = desde2003.filter((v) => v.unanime === true).length;
  const membros = diretores(votos);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-medium">Copom por diretor</h2>
      <div className="rounded-painel border border-linha bg-painel px-5 py-4">
        <p className="text-texto">
          Desde 2003: <span className="num">{desde2003.length}</span> reuniões,{" "}
          <span className="num">{unanimes}</span> unânimes e <span className="num text-ouro">{divididas.filter((v) => v.data >= "2003-01-01").length}</span> divididas.
        </p>
        {divididas[0] && (
          <p className="mt-1 text-sm text-texto-2">
            Última decisão dividida: {fmtData(divididas[0].data, "Diária")}
            {divididas[0].placar && <> ({divididas[0].placar[0]} × {divididas[0].placar[1]})</>}.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="rounded-painel border border-linha bg-painel">
          <header className="border-b border-linha px-4 py-3"><h3 className="font-medium text-texto">Decisões divididas</h3></header>
          <ul className="max-h-[32rem] divide-y divide-linha overflow-auto">
            {divididas.map((v) => (
              <li key={v.id} className="px-4 py-3 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-texto">{v.titulo.replace(/^Nota à Imprensa - /, "")}</span>
                  <span className="num shrink-0 text-xs text-texto-3">{fmtData(v.data, "Diária")}</span>
                </div>
                <div className="num mt-1 text-texto-2">{v.placar ? `${v.placar[0]} × ${v.placar[1]}` : "placar não informado"}</div>
                {v.grupos.length > 1 && (
                  <ul className="mt-2 space-y-1 text-xs text-texto-2">
                    {v.grupos.map((g) => (
                      <li key={g.proposta}>
                        <span className="text-texto-3">Por {g.proposta}:</span> {g.membros.join(", ")}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-painel border border-linha bg-painel">
          <header className="border-b border-linha px-4 py-3">
            <h3 className="font-medium text-texto">Membros do Copom</h3>
            <p className="text-xs text-texto-3">Desde 2012, quando os comunicados passaram a listar os votantes.</p>
          </header>
          <div className="max-h-[32rem] overflow-auto">
            <table className="w-full whitespace-nowrap text-sm">
              <thead className="sticky top-0 bg-painel text-left text-texto-3">
                <tr>
                  <th className="px-4 py-2 font-normal">Membro</th>
                  <th className="px-3 py-2 font-normal">Período</th>
                  <th className="px-3 py-2 text-right font-normal">Reuniões</th>
                  <th className="px-3 py-2 text-right font-normal">Vencido</th>
                  <th className="px-4 py-2 text-right font-normal">Presidiu</th>
                </tr>
              </thead>
              <tbody>
                {membros.map((d) => (
                  <tr key={d.chave} className="border-t border-linha">
                    <td className="px-4 py-1.5 text-texto">{d.nome}</td>
                    <td className="num px-3 py-1.5 text-texto-2">{fmtData(d.primeira)} a {fmtData(d.ultima)}</td>
                    <td className="num px-3 py-1.5 text-right">{d.reunioes}</td>
                    <td className={`num px-3 py-1.5 text-right ${d.vencido ? "text-ouro" : "text-texto-3"}`}>{d.vencido}</td>
                    <td className="num px-4 py-1.5 text-right text-texto-2">{d.presidiu || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      <details className="rounded-painel border border-linha bg-painel px-5 py-4 text-sm text-texto-2">
        <summary className="cursor-pointer text-texto">De onde vêm os votos</summary>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>Lidos dos comunicados oficiais do Copom (site do BCB), reunião a reunião.</li>
          <li>Desde 2012 o comunicado lista quem votou em cada proposta; "vencido" é quem votou na proposta minoritária.</li>
          <li>Antes disso o texto só informa "por unanimidade" ou o placar (ex.: "por seis votos a três"), sem nomes. Sem informação, a reunião fica sem placar.</li>
          <li>Mandato e quem indicou cada diretor entram depois, numa tabela curada com fonte.</li>
          <li>O tom dos discursos de cada diretor (mais duro ou mais brando) fica para uma fase futura, com metodologia validada.</li>
        </ul>
      </details>
    </div>
  );
}
