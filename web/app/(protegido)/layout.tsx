import { Menu, type GrupoMenu } from "@/components/menu";
import { exigirSessao } from "@/lib/auth/servidor";
import { sair } from "../login/acoes";

export const dynamic = "force-dynamic";

const GRUPOS: GrupoMenu[] = [
  { titulo: "Visão geral", itens: [{ rotulo: "Central", href: "/" }] },
  { titulo: "Sistema", itens: [{ rotulo: "Saúde dos dados", href: "/dados" }] },
];

export default async function LayoutProtegido({ children }: { children: React.ReactNode }) {
  await exigirSessao();
  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[var(--largura-menu)_1fr]">
      <aside className="border-b border-linha bg-painel md:border-b-0 md:border-r">
        <Menu grupos={GRUPOS} />
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="flex h-14 items-center justify-end gap-4 border-b border-linha px-6">
          <form action={sair}>
            <button className="text-sm text-texto-2 hover:text-texto">Sair</button>
          </form>
        </header>
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
