import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EstadoAba } from "@/components/aba/estado-aba";
import { ModeloBriefing } from "@/components/prototipos/modelo-briefing";
import { ModeloMapa } from "@/components/prototipos/modelo-mapa";
import { ModeloPerguntas, type BlocoPergunta } from "@/components/prototipos/modelo-perguntas";
import { ModeloSinais } from "@/components/prototipos/modelo-sinais";
import { resolverAno } from "@/lib/config";
import { lerSeries } from "@/lib/db";
import { META, MEDIDAS_INFLACAO, medidas, painelDe, quadrante, rastro, type Medida } from "@/lib/prototipos";

const MODELOS = {
  a: { nome: "Perguntas", resumo: "Cada bloco responde uma pergunta: frase de leitura, gráfico principal e detalhes recolhidos." },
  b: { nome: "Sinais", resumo: "Uma tabela única, como num terminal: todas as medidas lado a lado, clique para abrir o gráfico." },
  c: { nome: "Briefing", resumo: "Leitura primeiro: as frases do que mais se moveu, depois os números e os gráficos." },
  d: { nome: "Mapa", resumo: "Cada medida num mapa de distância da meta contra direção em 3 meses, com o caminho recente." },
} as const;
type IdModelo = keyof typeof MODELOS;

type Props = { params: Promise<{ modelo: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const m = MODELOS[(await params).modelo as IdModelo];
  return { title: m ? `Protótipo ${m.nome}` : "Protótipo" };
}

function hojeEmBrasilia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

const por = (ms: Medida[], ...ids: string[]) => ids.map((id) => ms.find((m) => m.id === id)!).filter(Boolean);

export default async function Prototipo({ params }: Props) {
  const id = (await params).modelo as IdModelo;
  const modelo = MODELOS[id];
  if (!modelo) notFound();
  const ano = Number(hojeEmBrasilia().slice(0, 4));
  const ids = [...new Set([...MEDIDAS_INFLACAO.map((d) => resolverAno(d.dado, ano)), META])];
  const dados = await lerSeries(ids);
  const ms = medidas(MEDIDAS_INFLACAO, dados, ano);
  const meta = dados[META] ?? [];
  const metaNoPainel = { transf: "nivel" as const, serieDoPainel: { dado: META, serie: "BR-134", rotulo: "Meta (CMN)", tipo: "Taxa" as const,
    frequencia: "Anual", unidade: "%", fonte: "BCB SGS", codigo: "13521", indicador: "Meta para a inflação (CMN)" } };
  const [ipca12, ipcames, servicos, industriais, alimentos, livres, monitorados, nucleos, p50, servsub, indsub, difusao, focus12, focusano1, igpm] =
    por(ms, "ipca12", "ipcames", "servicos", "industriais", "alimentos", "livres", "monitorados", "nucleos", "p50", "servsub", "indsub", "difusao", "focus12", "focusano1", "igpm");

  const blocos: BlocoPergunta[] = [
    { id: "meta", pergunta: "A inflação está convergindo para a meta?", principal: ipca12, apoio: [ipcames, igpm],
      explica: "Compara o IPCA acumulado em 12 meses com a meta do CMN para o ano. A frase diz quanto mudou em 3 meses, há quantos meses segue na mesma direção e a distância da meta.",
      grafico: painelDe("IPCA 12 meses e meta", [ipca12, metaNoPainel]), aprofundar: [painelDe("IPCA no mês", [ipcames]), painelDe("IGP-M 12 meses", [igpm])] },
    { id: "abertura", pergunta: "O que está puxando?", principal: servicos, apoio: [industriais, alimentos, monitorados],
      explica: "As principais aberturas do IPCA, cada uma acumulada em 12 meses: serviços, bens industriais, alimentação no domicílio e preços monitorados (energia, combustíveis, tarifas).",
      grafico: painelDe("Aberturas do IPCA em 12 meses", [servicos, industriais, alimentos, monitorados]),
      aprofundar: [painelDe("Livres e monitorados", [livres, monitorados])] },
    { id: "fundo", pergunta: "A inflação de fundo está melhorando?", principal: nucleos, apoio: [servsub, p50, difusao],
      explica: "Núcleos tiram itens voláteis para mostrar a tendência. Serviços subjacentes é o núcleo de serviços mais olhado pelo Copom. Difusão é a fatia de itens com alta no mês.",
      grafico: painelDe("Núcleos e serviços subjacentes em 12 meses", [nucleos, servsub, p50]),
      aprofundar: [painelDe("Industriais subjacentes", [indsub]), painelDe("Difusão", [difusao])] },
    { id: "expectativas", pergunta: "O que o mercado espera?", principal: focus12, apoio: focusano1 ? [focusano1] : [],
      explica: "Mediana das projeções da pesquisa Focus do Banco Central para a inflação dos próximos 12 meses e para o ano que vem.",
      grafico: painelDe("Focus: IPCA 12 meses à frente", [focus12]), aprofundar: focusano1 ? [painelDe(focusano1.rotulo, [focusano1])] : [] },
  ];

  const itensMapa = ms.filter((m) => m.serie.length && MEDIDAS_INFLACAO.find((d) => d.id === m.id)?.mapa).map((m) => {
    const r = rastro(m, meta);
    return { medida: m, rastro: r, quadrante: r.length ? quadrante(r.at(-1)!) : null };
  });

  return (
    <EstadoAba abaId={`prototipo-${id}`}>
      <section className="flex flex-col gap-5">
        <div>
          <p className="text-xs text-texto-3">Inflação · protótipo para comparar formatos</p>
          <h1 className="text-2xl font-semibold tracking-tight">{id.toUpperCase()}. {modelo.nome}</h1>
          <p className="mt-1 max-w-2xl text-sm text-texto-2">{modelo.resumo}</p>
          <nav aria-label="Outros protótipos" className="mt-3 flex flex-wrap gap-1.5">
            {(Object.keys(MODELOS) as IdModelo[]).map((k) => (
              <Link key={k} href={`/prototipos/${k}`} aria-current={k === id ? "page" : undefined}
                className={`rounded-controle border px-2.5 py-1 text-xs ${k === id ? "border-ouro bg-ouro-tenue text-ouro" : "border-linha text-texto-2 hover:text-texto"}`}>
                {k.toUpperCase()}. {MODELOS[k].nome}
              </Link>
            ))}
          </nav>
        </div>
        {id === "a" && <ModeloPerguntas blocos={blocos} dados={dados} />}
        {id === "b" && <ModeloSinais medidas={ms} dados={dados} />}
        {id === "c" && <ModeloBriefing medidas={ms} dados={dados}
          graficos={[blocos[0].grafico, blocos[1].grafico]} />}
        {id === "d" && <ModeloMapa itens={itensMapa} dados={dados} />}
      </section>
    </EstadoAba>
  );
}
