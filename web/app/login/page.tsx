import type { Metadata } from "next";
import { Marca } from "@/components/marca";
import { FormularioLogin } from "./formulario";

export const metadata: Metadata = { title: "Entrar" };

export default async function Login({ searchParams }: { searchParams: Promise<{ de?: string }> }) {
  const { de = "/" } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10"><Marca tamanho={28} /></div>
        <div className="rounded-painel border border-linha bg-painel p-6">
          <FormularioLogin de={de} />
        </div>
      </div>
    </main>
  );
}
