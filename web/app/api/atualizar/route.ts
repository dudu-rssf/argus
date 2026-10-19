import { NextResponse, type NextRequest } from "next/server";
import { estadoPeloBanco, registrarPedido } from "@/lib/db";
import { dispararColeta, estadoDaColeta, estadoDoBanco } from "@/lib/github";

// O proxy já exige sessão em /api/*; aqui só conferimos que o pedido veio do próprio site.
function mesmaOrigem(req: NextRequest): boolean {
  const origem = req.headers.get("origin");
  return !origem || new URL(origem).host === req.headers.get("host");
}

const token = () => process.env.GITHUB_TOKEN;

export async function GET() {
  if (token()) return NextResponse.json(await estadoDaColeta(token()));
  return NextResponse.json(estadoDoBanco(await estadoPeloBanco()));
}

export async function POST(req: NextRequest) {
  if (!mesmaOrigem(req)) return NextResponse.json({ estado: "erro", mensagem: "origem recusada" }, { status: 403 });
  if (token()) return NextResponse.json(await dispararColeta(token()));
  // Sem token (decisão 0018): grava o pedido; o workflow "Relógio" dispara a coleta.
  await registrarPedido();
  return NextResponse.json({ ...estadoDoBanco(await estadoPeloBanco()), estado: "rodando", disparou: true });
}
