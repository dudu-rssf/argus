import { Busca, type ItemBusca } from "@/components/busca";
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
  porGrupo.get("Brasil")?.itens.push({ rotulo: "Análises", href: "/analises" });
  return [
    { titulo: "Visão geral", itens: [{ rotulo: "Central", href: "/" }] },
    ...porGrupo.values(),
    { titulo: "Sistema", itens: [{ rotulo: "Saúde dos dados", href: "/dados" }] },
  ];
}

function itensBusca(): ItemBusca[] {
  const itens: ItemBusca[] = [
    { titulo: "Central", onde: "Visão geral", href: "/", termos: "mercado resumo divulgações" },
    { titulo: "Ciclos de política monetária", onde: "Análises", href: "/analises#ciclos", termos: "selic copom corte alta" },
    { titulo: "Postura monetária", onde: "Análises", href: "/analises#postura", termos: "juro real neutro" },
    { titulo: "Hiato, regra de Taylor e curva de Phillips", onde: "Análises", href: "/analises#taylor", termos: "hiato taylor phillips nairu" },
    { titulo: "Períodos históricos parecidos com hoje", onde: "Análises", href: "/analises#analogos", termos: "análogos" },
    { titulo: "Copom por diretor", onde: "Análises", href: "/analises#copom", termos: "votos diretores" },
    { titulo: "Saúde dos dados", onde: "Sistema", href: "/dados", termos: "coleta erro" },
  ];
  for (const a of abas()) {
    itens.push({ titulo: a.titulo, onde: "Aba", href: `/aba/${a.id}` });
    for (const p of a.paineis)
      itens.push({ titulo: p.titulo, onde: a.titulo, href: `/aba/${a.id}#${p.id}`, termos: p.series.map((s) => `${s.rotulo} ${s.indicador ?? ""}`).join(" ") });
  }
  return itens;
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
        <header className="sticky top-0 z-30 flex min-h-14 flex-wrap items-center justify-between gap-x-5 gap-y-2 border-b border-linha bg-fundo/90 px-6 py-2 text-sm backdrop-blur">
          <Busca itens={itensBusca()} />
          <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2">
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
          </div>
        </header>
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
