/**
 * Lê config/series/** e config/abas/*.yaml, confere e grava lib/gerado/config.json,
 * que o site importa. Roda antes do build e dos testes. Qualquer erro de configuração
 * interrompe o build com uma mensagem clara (melhor que um gráfico vazio no ar).
 */
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..", "..");
const TIPOS = ["Índice", "Var % mensal", "Taxa", "Fluxo", "Estoque", "Derivado"];
const EVENTOS = ["copom_comunicado", "copom_ata"];
const TRANSF = ["nivel", "mom", "qoq", "yoy", "acum3", "acum6", "acum12", "anual3", "anual6",
  "dpp1", "dpp3", "dpp12", "soma3", "soma12"];

function yamls(pasta) {
  return readdirSync(pasta).flatMap((nome) => {
    const p = join(pasta, nome);
    if (statSync(p).isDirectory()) return yamls(p);
    return nome.endsWith(".yaml") ? [p] : [];
  });
}

/** Função pura (testada): devolve { catalogo, abas } ou lança erro descrevendo o problema. */
export function montarConfig(arquivosSeries, arquivosAbas) {
  const catalogo = {};
  for (const doc of arquivosSeries) {
    for (const s of doc.series ?? []) {
      catalogo[s.id] = {
        id: s.id, pais: doc.pais, aba: doc.aba, indicador: s.indicador, fonte: s.fonte, codigo: String(s.codigo),
        frequencia: s.frequencia, unidade: s.unidade, tipo: s.tipo, status: s.status,
      };
    }
  }
  const erros = [];
  const abas = arquivosAbas.map((a, i) => {
    const onde = `aba ${a.id ?? i}`;
    if (!a.id || !a.titulo || !a.grupo) erros.push(`${onde}: faltam id, titulo ou grupo`);
    const paineis = (a.paineis ?? []).map((p, j) => {
      const ondeP = `${onde}, painel ${j + 1} (${p.titulo ?? "sem título"})`;
      if (!p.titulo) erros.push(`${ondeP}: falta titulo`);
      const transf = [p.transformacao, p.combinado?.barras, p.combinado?.linha].filter(Boolean);
      for (const t of transf) if (!TRANSF.includes(t)) erros.push(`${ondeP}: transformação desconhecida "${t}"`);
      if (p.eventos) {
        if (!EVENTOS.includes(p.eventos)) erros.push(`${ondeP}: tipo de evento desconhecido "${p.eventos}"`);
        if (p.series?.length) erros.push(`${ondeP}: painel de eventos não leva séries`);
        return { titulo: p.titulo, eventos: p.eventos, quantidade: p.quantidade ?? 3, series: [] };
      }
      if (!p.series?.length) erros.push(`${ondeP}: sem séries`);
      const series = (p.series ?? []).map((s) => {
        const id = String(s.dado ?? "").split(":")[0];
        const molde = String(s.dado ?? "").match(/@\{[^}]*\}/g) ?? [];
        for (const m of molde) if (!/^@\{ano(\+\d)?\}$/.test(m)) erros.push(`${ondeP}: molde inválido ${m} (use {ano} ou {ano+N})`);
        const cat = catalogo[id];
        if (!cat) { erros.push(`${ondeP}: "${s.dado}" não está no catálogo`); return null; }
        if (!["Verificado", "Derivado"].includes(cat.status))
          erros.push(`${ondeP}: ${id} tem status "${cat.status}" (só Verificado ou Derivado entram no site)`);
        if (s.tipo && cat.tipo !== "Derivado")
          erros.push(`${ondeP}: ${id} já tem tipo "${cat.tipo}" no catálogo; "tipo" só vale para derivadas`);
        const tipo = s.tipo ?? cat.tipo;
        if (!TIPOS.includes(tipo)) erros.push(`${ondeP}: tipo inválido "${tipo}"`);
        return {
          dado: s.dado, serie: id, rotulo: s.rotulo ?? cat.indicador, tipo,
          frequencia: cat.frequencia, unidade: cat.unidade, fonte: cat.fonte, codigo: cat.codigo,
        };
      }).filter(Boolean);
      return { titulo: p.titulo, transformacao: p.transformacao ?? "nivel", combinado: p.combinado ?? null, eventos: null, series };
    });
    return { id: a.id, titulo: a.titulo, grupo: a.grupo, ordem: a.ordem ?? 99, paineis };
  });
  const ids = abas.map((a) => a.id);
  for (const id of ids) if (ids.filter((x) => x === id).length > 1) erros.push(`aba "${id}" repetida`);
  if (erros.length) throw new Error("Configuração inválida:\n- " + [...new Set(erros)].join("\n- "));
  return { catalogo, abas: abas.sort((a, b) => a.ordem - b.ordem) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ler = (p) => parse(readFileSync(p, "utf8"));
  const config = montarConfig(yamls(join(RAIZ, "config", "series")).map(ler), yamls(join(RAIZ, "config", "abas")).map(ler));
  const destino = join(AQUI, "..", "lib", "gerado", "config.json");
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, JSON.stringify(config));
  console.log(`config: ${Object.keys(config.catalogo).length} séries, ${config.abas.length} aba(s)`);
}
