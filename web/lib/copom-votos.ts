/**
 * Votos do Copom extraídos dos comunicados (Análises, item 4). Funções puras.
 *
 * Três formatos aparecem nos textos oficiais:
 * - desde ~2012: "Votaram por essa decisão os seguintes membros do Comitê: A (presidente), B e C."
 * - decisão dividida: um parágrafo "Votaram por <proposta> os seguintes membros: ..." por grupo;
 * - antes: só "por unanimidade", "por sete votos a dois" ou "por seis votos a favor e três
 *   votos pela redução de ...", sem nomes.
 * Quando o texto não diz, o campo fica vazio (nunca supomos unanimidade).
 */

export type GrupoVoto = { proposta: string; membros: string[] };
export type VotoReuniao = {
  id: string;
  data: string;
  titulo: string;
  numero: number | null;
  unanime: boolean | null;
  placar: [number, number] | null; // [maioria, minoria]
  grupos: GrupoVoto[];
  vencidos: string[];
  presidente: string | null;
};

const NUMEROS: Record<string, number> = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9 };

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Chave de identidade de um nome: sem acentos, partículas e maiúsculas ("Roberto de Oliveira Campos Neto" = "Roberto Oliveira Campos Neto"). */
export function chaveNome(nome: string): string {
  return semAcento(nome).toLowerCase().replace(/\([^)]*\)/g, " ")
    .split(/\s+/).filter((p) => p && !["de", "da", "do", "das", "dos", "e"].includes(p)).join(" ");
}

function separarNomes(lista: string): string[] {
  // 2012: "Alexandre Antonio Tombini, Presidente, Aldo ..." → "Alexandre Antonio Tombini (presidente)"
  lista = lista.replace(/,\s*Presidente\s*,/g, " (presidente),");
  return lista.replace(/[\s."”]+$/, "").split(/,\s*(?:e\s+)?|\s+e\s+/).map((n) => n.replace(/[\s."”]+$/, "").trim()).filter(Boolean);
}

export function extrairVotos(ev: { id: string; data_ref: string; titulo: string; texto: string }): VotoReuniao {
  const texto = ev.texto.replace(/\s+/g, " ");
  const numero = Number(ev.id.match(/(\d+)$/)?.[1] ?? NaN);
  const grupos: GrupoVoto[] = [];
  const re = /Votaram (?:por|pela|pelo|a favor d[aeo]s?)\s+(.+?)\s+os seguintes membros(?: do Comitê)?:\s*(.+?\.)(?=\s+Votaram|\s*\*|\s*$|\s+[A-ZÁÉÍÓÚ])/g;
  for (const m of texto.matchAll(re)) grupos.push({ proposta: m[1].trim(), membros: separarNomes(m[2]) });

  let presidente: string | null = null;
  for (const g of grupos) {
    const p = g.membros.find((n) => /\(presidente\)/i.test(n));
    if (p) presidente = p.replace(/\s*\(presidente\)/i, "").trim();
    g.membros = g.membros.map((n) => n.replace(/\s*\(presidente\)/i, "").trim());
  }

  let unanime: boolean | null = null;
  let placar: [number, number] | null = null;
  let vencidos: string[] = [];
  if (grupos.length === 1) {
    unanime = true;
    placar = [grupos[0].membros.length, 0];
  } else if (grupos.length > 1) {
    const ordenados = [...grupos].sort((a, b) => b.membros.length - a.membros.length);
    unanime = false;
    placar = [ordenados[0].membros.length, ordenados.slice(1).reduce((s, g) => s + g.membros.length, 0)];
    vencidos = ordenados.slice(1).flatMap((g) => g.membros);
  } else if (/por unanimidade|decis[ãa]o foi un[âa]nime/i.test(texto)) {
    unanime = true;
  } else {
    const m = semAcento(texto).toLowerCase().match(/por (\w+) votos (?:a favor )?(?:a|e) (\w+)(?: votos?)?/);
    const num = (x: string) => (/^\d+$/.test(x) ? Number(x) : NUMEROS[x]);
    if (m && num(m[1]) && num(m[2]) !== undefined) {
      placar = [num(m[1]), num(m[2])];
      unanime = placar[1] === 0;
    }
  }
  return { id: ev.id, data: ev.data_ref, titulo: ev.titulo, numero: Number.isFinite(numero) ? numero : null, unanime, placar, grupos, vencidos, presidente };
}

export type Diretor = {
  chave: string; nome: string; primeira: string; ultima: string; reunioes: number; vencido: number; presidiu: number;
};

/** Um registro por membro, a partir das reuniões com nomes. Nome exibido: a grafia mais recente. */
export function diretores(votos: VotoReuniao[]): Diretor[] {
  const mapa = new Map<string, Diretor>();
  for (const v of [...votos].sort((a, b) => a.data.localeCompare(b.data))) {
    const vencidos = new Set(v.vencidos.map(chaveNome));
    const pres = v.presidente ? chaveNome(v.presidente) : null;
    for (const nome of v.grupos.flatMap((g) => g.membros)) {
      const k = chaveNome(nome);
      const d = mapa.get(k) ?? { chave: k, nome, primeira: v.data, ultima: v.data, reunioes: 0, vencido: 0, presidiu: 0 };
      d.nome = nome; d.ultima = v.data; d.reunioes += 1;
      if (vencidos.has(k)) d.vencido += 1;
      if (pres === k) d.presidiu += 1;
      mapa.set(k, d);
    }
  }
  return [...mapa.values()].sort((a, b) => b.ultima.localeCompare(a.ultima) || a.nome.localeCompare(b.nome));
}
