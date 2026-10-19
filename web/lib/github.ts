/**
 * Botão "Atualizar" (decisões 0008 e 0018). Com GITHUB_TOKEN na Vercel, o site dispara o
 * workflow "Coleta" pela API do GitHub. Sem token, grava um pedido no banco e o workflow
 * "Relógio" dispara a coleta em até 1 minuto. O site nunca fala com as fontes de dados.
 */
export const REPO = "dudu-rssf/argus";
export const WORKFLOW = "coleta.yml";

export type Execucao = {
  id: number; status: string; conclusao: string | null; criada_em: string; link: string;
};
export type EstadoColeta =
  | { estado: "sem_token" }
  | { estado: "erro"; mensagem: string }
  | { estado: "ocioso" | "rodando"; ultima: Execucao | null };

type Fetch = typeof fetch;

function cabecalhos(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "argus-site",
  };
}

export async function estadoDaColeta(token: string | undefined, f: Fetch = fetch): Promise<EstadoColeta> {
  if (!token) return { estado: "sem_token" };
  const r = await f(`https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/runs?per_page=1`, {
    headers: cabecalhos(token), cache: "no-store",
  });
  if (!r.ok) return { estado: "erro", mensagem: `GitHub respondeu ${r.status}` };
  const run = ((await r.json()) as { workflow_runs?: Record<string, unknown>[] }).workflow_runs?.[0];
  const ultima: Execucao | null = run ? {
    id: Number(run.id), status: String(run.status), conclusao: (run.conclusion as string | null) ?? null,
    criada_em: String(run.created_at), link: String(run.html_url),
  } : null;
  const rodando = !!ultima && ["queued", "in_progress", "waiting", "requested", "pending"].includes(ultima.status);
  return { estado: rodando ? "rodando" : "ocioso", ultima };
}

/** Dispara a coleta, a menos que uma já esteja em andamento (aí só devolve o estado). */
export async function dispararColeta(token: string | undefined, f: Fetch = fetch): Promise<EstadoColeta & { disparou?: boolean }> {
  const atual = await estadoDaColeta(token, f);
  if (atual.estado !== "ocioso") return atual;
  const r = await f(`https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`, {
    method: "POST", headers: cabecalhos(token!),
    body: JSON.stringify({ ref: "main", inputs: { gatilho: "botao" } }),
  });
  if (r.status !== 204) return { estado: "erro", mensagem: `GitHub recusou o disparo (${r.status})` };
  return { estado: "rodando", ultima: atual.ultima, disparou: true };
}

/** Estado no formato do botão, a partir do banco (caminho sem token). */
export function estadoDoBanco(b: { rodando: boolean; ultima: { id: number; status: string; iniciado_em: string } | null }): EstadoColeta {
  const ultima: Execucao | null = b.ultima ? {
    id: b.ultima.id, status: b.ultima.status === "rodando" ? "in_progress" : "completed",
    conclusao: b.ultima.status === "rodando" ? null : b.ultima.status === "ok" ? "success" : "failure",
    criada_em: b.ultima.iniciado_em, link: "/dados",
  } : null;
  return { estado: b.rodando ? "rodando" : "ocioso", ultima };
}
