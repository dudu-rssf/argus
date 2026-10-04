import { BotaoAtualizar } from "@/components/cabecalho/botao-atualizar";
import { Menu, type GrupoMenu } from "@/components/menu";
import { exigirSessao } from "@/lib/auth/servidor";
import { abas } from "@/lib/config";
import { ultimaAtualizacao } from "@/lib/db";
import { fmtMomento } from "@/lib/formato";
import { sair } from "../login/acoes";

export const dynamic = "force-dynamic";

function grupos(): GrupoMenu[] {
  const porGrupo = new Map<string, GrupoMenu>();
  for (const a of abas()) {
    if (!porGrupo.has(a.grupo)) porGrupo.set(a.grupo, { titulo: a.grupo, itens: [] });
    porGrupo.get(a.grupo)!.itens.push({ rotulo: a.titulo, href: `/aba/${a.id}` });
  }
  return [
    { titulo: "Visão geral", itens: [{ rotulo: "Central", href: "/" }] },
    ...porGrupo.values(),
    { titulo: "Sistema", itens: [{ rotulo: "Saúde dos dados", href: "/dados" }] },
  ];
}

async function estadoDosDados() {
  try {
    return { ...(await ultimaAtualizacao()), erroBanco: null as string | null };
  } catch (e) {
    return { quando: null, falhas: 0, erroBanco: e instanceof Error ? e.message : "erro ao ler o banco" };
  }
}

export default async function LayoutProtegido({ children }: { children: React.ReactNode }) {
  await exigirSessao();
  const estado = await estadoDosDados();
  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[var(--largura-menu)_1fr]">
      <aside className="border-b border-linha bg-painel md:border-b-0 md:border-r">
        <Menu grupos={grupos()} />
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="flex min-h-14 flex-wrap items-center justify-end gap-x-5 gap-y-2 border-b border-linha px-6 py-2 text-sm">
          {estado.erroBanco ? (
            <span className="text-baixa">{estado.erroBanco}</span>
          ) : (
            <span className="text-texto-2">
              Dados atualizados em <span className="num text-texto">{fmtMomento(estado.quando)}</span>
              {estado.falhas > 0 && (
                <a href="/dados?filtro=problema" className="ml-3 text-alerta hover:underline">
                  {estado.falhas} {estado.falhas === 1 ? "série falhou" : "séries falharam"}
                </a>
              )}
            </span>
          )}
          <BotaoAtualizar />
          <form action={sair}>
            <button className="text-texto-2 hover:text-texto">Sair</button>
          </form>
        </header>
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
