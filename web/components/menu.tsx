"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Marca } from "./marca";

export type GrupoMenu = { titulo: string; itens: { rotulo: string; href: string }[] };

export function Menu({ grupos }: { grupos: GrupoMenu[] }) {
  const atual = usePathname();
  return (
    <nav aria-label="Abas" className="flex h-full flex-col gap-7 px-4 py-5">
      <Link href="/" className="px-2"><Marca /></Link>
      {grupos.map((g) => (
        <div key={g.titulo}>
          <p className="mb-1.5 px-2 text-xs text-texto-3">{g.titulo}</p>
          <ul className="flex flex-col">
            {g.itens.map((i) => {
              const ativo = i.href === "/" ? atual === "/" : atual.startsWith(i.href);
              return (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    aria-current={ativo ? "page" : undefined}
                    className={`block rounded-controle border-l-2 px-2 py-1.5 text-sm ${
                      ativo ? "border-ouro bg-ouro-tenue text-texto" : "border-transparent text-texto-2 hover:text-texto"
                    }`}
                  >
                    {i.rotulo}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
