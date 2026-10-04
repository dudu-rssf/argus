import { NextResponse, type NextRequest } from "next/server";
import { dispararColeta, estadoDaColeta } from "@/lib/github";

// O proxy já exige sessão em /api/*; aqui só conferimos que o pedido veio do próprio site.
function mesmaOrigem(req: NextRequest): boolean {
  const origem = req.headers.get("origin");
  return !origem || new URL(origem).host === req.headers.get("host");
}

export async function GET() {
  return NextResponse.json(await estadoDaColeta(process.env.GITHUB_TOKEN));
}

export async function POST(req: NextRequest) {
  if (!mesmaOrigem(req)) return NextResponse.json({ estado: "erro", mensagem: "origem recusada" }, { status: 403 });
  return NextResponse.json(await dispararColeta(process.env.GITHUB_TOKEN));
}
