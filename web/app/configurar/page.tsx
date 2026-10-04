import type { Metadata } from "next";
import { Marca } from "@/components/marca";
import { lerConfigAuth } from "@/lib/auth/config";
import { Gerador } from "./gerador";

export const metadata: Metadata = { title: "Configurar acesso" };
export const dynamic = "force-dynamic";

export default function Configurar() {
  const cfg = lerConfigAuth();
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <Marca tamanho={28} />
      <h1 className="mt-10 text-xl font-semibold">O acesso ao Argus ainda não está configurado</h1>
      <p className="mt-3 text-texto-2">
        Por segurança, o site fica bloqueado até a senha ser configurada na Vercel.
        {!cfg.ok && <> Falta: <span className="text-alerta">{cfg.motivo}</span>.</>}
      </p>
      <ol className="mt-6 list-decimal space-y-2 pl-5 text-sm text-texto-2">
        <li>Gere os dois valores abaixo. A senha não sai deste navegador.</li>
        <li>Na Vercel, em Settings → Environment Variables, cadastre cada nome com o valor gerado.</li>
        <li>Em Deployments, clique em Redeploy. Depois disso, esta página leva ao login.</li>
      </ol>
      <div className="mt-8 rounded-painel border border-linha bg-painel p-5">
        <Gerador />
      </div>
    </main>
  );
}
