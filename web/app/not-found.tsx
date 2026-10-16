import Link from "next/link";

/** Página não encontrada, no visual do Argus (em vez da página branca padrão). */
export default function NaoEncontrada() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="num text-5xl font-semibold text-ouro">404</p>
        <h1 className="mt-3 text-xl font-semibold tracking-tight">Esta página não existe (ou mudou de lugar)</h1>
        <p className="mt-2 text-sm text-texto-2">Use o menu ou a busca (Ctrl K) para achar o que procura.</p>
        <Link href="/" className="mt-6 inline-block rounded-controle border border-ouro px-4 py-2 text-sm text-ouro hover:bg-ouro-tenue">
          Ir para a Central
        </Link>
      </div>
    </main>
  );
}
