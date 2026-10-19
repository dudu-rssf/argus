/**
 * Fórmulas e metodologia de toda conta mostrada no site (decisão 0015).
 * Regra: gráfico ou tabela com conta tem botão "Fórmula". Os textos ficam aqui, num
 * lugar só; os testes exigem fórmula para toda transformação, série derivada e análise.
 */
import type { IdTransformacao, TipoSerie } from "./transform";

export type Formula = {
  titulo: string;
  formula: string[];      // a conta, uma linha por expressão
  variaveis: string[];    // o que é cada termo, com fonte e código
  metodologia: string[];  // escolhas feitas
  limitacoes?: string[];
  /** Por que a conta é feita assim: o conceito econômico por trás, em palavras simples. */
  fundamento?: string[];
  /** Base na literatura: autor, ano, título e onde foi publicado. */
  referencias?: string[];
};

/** Referências bibliográficas usadas nas análises (uma fonte só, citada pelas fórmulas). */
export const REF = {
  fisher: "Fisher, I. (1930). The Theory of Interest. Nova York: Macmillan.",
  wicksell: "Wicksell, K. (1898). Geldzins und Güterpreise. Jena: Fischer (trad. inglesa: Interest and Prices, 1936).",
  laubachWilliams: "Laubach, T.; Williams, J. C. (2003). Measuring the Natural Rate of Interest. Review of Economics and Statistics, 85(4), 1063–1070.",
  hlw: "Holston, K.; Laubach, T.; Williams, J. C. (2017). Measuring the natural rate of interest: International trends and determinants. Journal of International Economics, 108, S59–S75.",
  taylor93: "Taylor, J. B. (1993). Discretion versus policy rules in practice. Carnegie-Rochester Conference Series on Public Policy, 39, 195–214.",
  taylor99: "Taylor, J. B. (1999). A Historical Analysis of Monetary Policy Rules. Em: Taylor, J. B. (org.), Monetary Policy Rules. University of Chicago Press, 319–348.",
  cgg: "Clarida, R.; Galí, J.; Gertler, M. (2000). Monetary Policy Rules and Macroeconomic Stability: Evidence and Some Theory. Quarterly Journal of Economics, 115(1), 147–180.",
  orphanides01: "Orphanides, A. (2001). Monetary Policy Rules Based on Real-Time Data. American Economic Review, 91(4), 964–985.",
  hp: "Hodrick, R. J.; Prescott, E. C. (1997). Postwar U.S. Business Cycles: An Empirical Investigation. Journal of Money, Credit and Banking, 29(1), 1–16.",
  hamilton: "Hamilton, J. D. (2018). Why You Should Never Use the Hodrick-Prescott Filter. Review of Economics and Statistics, 100(5), 831–843.",
  orphanidesVanNorden: "Orphanides, A.; van Norden, S. (2002). The Unreliability of Output-Gap Estimates in Real Time. Review of Economics and Statistics, 84(4), 569–583.",
  okun: "Okun, A. M. (1962). Potential GNP: Its Measurement and Significance. Proceedings of the Business and Economic Statistics Section, American Statistical Association, 98–104.",
  phillips: "Phillips, A. W. (1958). The Relation between Unemployment and the Rate of Change of Money Wage Rates in the United Kingdom, 1861–1957. Economica, 25(100), 283–299.",
  friedman68: "Friedman, M. (1968). The Role of Monetary Policy. American Economic Review, 58(1), 1–17.",
  lorenz: "Lorenz, E. N. (1969). Atmospheric Predictability as Revealed by Naturally Occurring Analogues. Journal of the Atmospheric Sciences, 26(4), 636–646.",
  bryBoschan: "Bry, G.; Boschan, C. (1971). Cyclical Analysis of Time Series: Selected Procedures and Computer Programs. NBER Technical Paper 20.",
  tracer: "van Ruth, F.; Schouten, B.; Wekker, R. (2005). The Statistics Netherlands' Business Cycle Tracer: methodological aspects. Statistics Netherlands (CBS). Mesma ideia do Business Cycle Clock usado pelo Eurostat e pela OCDE.",
} as const;

// ---------------------------------------------------------------- transformações

export function formulaTransformacao(id: IdTransformacao, tipo: TipoSerie, frequencia: string): Formula | null {
  const trimestral = /trimestr/i.test(frequencia) && !/m[óo]vel/i.test(frequencia);
  const diaria = /di[áa]ria|semanal|cont[íi]nua/i.test(frequencia);
  const comparacao = diaria
    ? "Séries diárias ou semanais: o valor de comparação é o último disponível até a data de k meses antes (no máximo 7 dias de distância, por fins de semana e feriados)."
    : "O valor de comparação é o da mesma data k meses antes; se ele não existe, o ponto não aparece (nada é estimado).";
  const v = (k: number, nome: string, conta: string): Formula => ({
    titulo: nome,
    formula: [conta.replace(/k/g, String(k))],
    variaveis: ["xₜ: valor da série na data t", `xₜ₋${k}: valor ${k} ${k === 1 ? "mês" : "meses"} antes`],
    metodologia: [comparacao],
  });
  const n = (s: string) => Number(s.replace(/\D/g, ""));
  switch (id) {
    case "nivel":
      return null;
    case "mom": return v(1, "Variação mensal", "Var. = (xₜ / xₜ₋k − 1) × 100");
    case "qoq": return { ...v(3, "Variação trimestral", "Var. = (xₜ / xₜ₋k − 1) × 100"),
      metodologia: [comparacao, trimestral ? "Série trimestral: compara com o trimestre anterior." : "Compara com 3 meses antes."] };
    case "yoy": return v(12, "Variação em 12 meses", "Var. = (xₜ / xₜ₋k − 1) × 100");
    case "tot":
      if (diaria || trimestral) return { ...v(3, "Variação em 3 meses", "Var. = (xₜ / xₜ₋k − 1) × 100"),
        metodologia: [comparacao, trimestral ? "Série trimestral: compara com o trimestre anterior." : "Série diária: compara com o dado de 3 meses antes."] };
      return {
        titulo: "Trimestre contra trimestre anterior",
        formula: [tipo === "Fluxo"
          ? "ToT = [(xₜ + xₜ₋₁ + xₜ₋₂) / (xₜ₋₃ + xₜ₋₄ + xₜ₋₅) − 1] × 100"
          : "ToT = [média(xₜ, xₜ₋₁, xₜ₋₂) / média(xₜ₋₃, xₜ₋₄, xₜ₋₅) − 1] × 100"],
        variaveis: ["xₜ: valor do mês t"],
        metodologia: ["Compara os últimos 3 meses com os 3 meses imediatamente anteriores (trimestre móvel). Exige 6 meses seguidos.",
          "Em série com ajuste sazonal, mostra o ritmo recente sem o ruído de um mês só."],
        limitacoes: ["Em série sem ajuste sazonal, mistura sazonalidade com tendência; prefira a variação em 12 meses."],
      };
    case "dpp1": case "dpp3": case "dpp12": {
      const k = n(id);
      return { ...v(k, `Diferença em ${k} ${k === 1 ? "mês" : "meses"}`, "Δ = xₜ − xₜ₋k (pontos percentuais)"),
        metodologia: [comparacao, "Para taxas, a diferença é em pontos percentuais, não em %: de 10% para 11% é +1 p.p."] };
    }
    case "soma3": case "soma12": {
      const k = n(id);
      return {
        titulo: `Soma em ${k} meses`,
        formula: [`Soma = xₜ + xₜ₋₁ + … + xₜ₋${k - 1}`],
        variaveis: ["xₜ: valor do fluxo no mês t (ex.: exportações, resultado primário)"],
        metodologia: [`Só sai quando os ${k} meses são consecutivos; com um mês faltando, o ponto não aparece.`],
      };
    }
    case "acum3": case "acum6": case "acum12": {
      const k = n(id);
      if (tipo === "Var % mensal")
        return {
          titulo: `Acumulado em ${k} meses (encadeado)`,
          formula: [`Acum. = [(1 + mₜ/100) × (1 + mₜ₋₁/100) × … × (1 + mₜ₋${k - 1}/100) − 1] × 100`],
          variaveis: ["mₜ: variação % do mês t (ex.: IPCA do mês)"],
          metodologia: [`Variações mensais se encadeiam (juros compostos), nunca se somam. Exige ${k} meses consecutivos.`,
            "Conferido contra o acumulado oficial do BCB e do IBGE (ex.: IPCA 12 meses, SGS 13522)."],
        };
      if (trimestral)
        return {
          titulo: `Acumulado em ${k / 3} trimestres`,
          formula: [`Acum. = [(xₜ + … + xₜ₋${k / 3 - 1}) / (os mesmos ${k / 3} trimestres um ano antes) − 1] × 100`],
          variaveis: ["xₜ: índice do trimestre t (ex.: PIB, índice de volume)"],
          metodologia: ["Padrão do IBGE para taxas acumuladas: soma dos índices do período contra a soma do mesmo período do ano anterior."],
        };
      return {
        titulo: `Acumulado em ${k} meses`,
        formula: [`Acum. = [(xₜ + … + xₜ₋${k - 1}) / (xₜ₋₁₂ + … + xₜ₋${k + 11}) − 1] × 100`],
        variaveis: ["xₜ: índice do mês t (ex.: produção industrial, varejo)"],
        metodologia: [`Padrão do IBGE: soma dos índices dos últimos ${k} meses contra a soma dos mesmos ${k} meses um ano antes.`,
          "Conferido contra a taxa acumulada oficial do IBGE (ex.: PIM-PF 12 meses)."],
      };
    }
    case "anual3": case "anual6": {
      const k = n(id);
      return tipo === "Var % mensal"
        ? {
          titulo: `${k} meses anualizado`,
          formula: [`Anual. = [(1 + Acum.${k}/100)^(12/${k}) − 1] × 100`, `Acum.${k} = acumulado encadeado dos últimos ${k} meses`],
          variaveis: ["Acum.: acumulado encadeado das variações mensais"],
          metodologia: [`Leva o ritmo dos últimos ${k} meses para uma taxa anual, como se continuasse por 12 meses.`],
          limitacoes: ["Sem ajuste sazonal, o anualizado de poucos meses carrega a sazonalidade desses meses."],
        }
        : {
          titulo: `${k} meses anualizado`,
          formula: [`Anual. = [(xₜ / xₜ₋${k})^(12/${k}) − 1] × 100`],
          variaveis: ["xₜ: índice no mês t"],
          metodologia: [comparacao, `Leva o ritmo dos últimos ${k} meses para uma taxa anual.`],
          limitacoes: ["Use com série dessazonalizada; sem ajuste, mistura sazonalidade com tendência."],
        };
    }
  }
}

// ---------------------------------------------------------------- séries derivadas (pipeline/argus_pipeline/derive)

export const FORMULAS_DERIVADAS: Record<string, Formula> = {
  "BR-127": {
    titulo: "Média dos 5 núcleos do Copom",
    formula: ["Média = (EX0 + EX3 + MS + DP + P55) / 5"],
    variaveis: ["EX0 (SGS 11427), EX3 (SGS 27839), MS (SGS 4466), DP (SGS 16122) e P55 (SGS 28750): variação mensal de cada núcleo"],
    metodologia: ["Média simples só nos meses em que os 5 núcleos têm valor.", "O acumulado em 12 meses do gráfico encadeia a média mensal."],
  },
  "BR-128": {
    titulo: "Mediana ponderada dos subitens do IPCA (P50)",
    formula: ["P50 = variação do subitem k em que Σ peso (ordenado pela variação) ≥ 50%"],
    variaveis: ["Variação mensal e peso de cada subitem do IPCA no mesmo mês (IBGE SIDRA t7060, v63 e v66)"],
    metodologia: ["Ordena os subitens pela variação do mês, acumula os pesos (normalizados para somar 1) e fica com a variação do primeiro subitem que atinge 50%, sem interpolação.",
      "É o método do P55 do BCB (Nota Técnica 57) com p = 0,50. O mesmo cálculo com p = 0,55 reproduz o P55 oficial em 80 de 80 meses."],
  },
  "BR-133": {
    titulo: "Saldo mensal do Novo CAGED",
    formula: ["Saldoₜ = Estoqueₜ − Estoqueₜ₋₁"],
    variaveis: ["Estoque de empregos formais do Novo CAGED (SGS 28763)"],
    metodologia: ["Só entre meses consecutivos."],
    limitacoes: ["Difere do saldo divulgado quando o MTE revisa declarações fora do prazo em meses anteriores."],
  },
  "BR-055": {
    titulo: "Juro real ex-ante",
    formula: ["r = [(1 + Selic/100) / (1 + πᵉ/100) − 1] × 100"],
    variaveis: ["Selic: meta vigente na data (SGS 432)", "πᵉ: mediana do Focus para o IPCA 12 meses à frente (BCB Olinda)"],
    metodologia: ["Fórmula de Fisher (exata, não a aproximação Selic − πᵉ).", "Uma observação por data de pesquisa do Focus, com a Selic vigente nesse dia."],
    fundamento: [
      "Juro real = quanto o dinheiro rende (ou custa) acima da inflação. Ex-post (\"depois do fato\") usa a inflação que já aconteceu; ex-ante (\"antes do fato\") usa a inflação que se espera para frente.",
      "Quem decide hoje tomar um empréstimo ou investir olha para a frente: compara o juro que vai pagar com a inflação que espera. Por isso o ex-ante é a medida que importa para a política monetária (efeito Fisher).",
      "Exemplo de hoje: Selic de 13,75% e inflação esperada de 4,48% em 12 meses dão (1,1375 / 1,0448) − 1 ≈ 8,9% de juro real.",
    ],
    limitacoes: ["Usa a Selic de hoje, não a Selic esperada nos próximos 12 meses. O padrão de mercado é o swap DI × pré de 360 dias (que o Argus ainda não coleta): em ciclo de corte, esta medida fica acima dele; em ciclo de alta, abaixo."],
    referencias: [REF.fisher],
  },
  "BR-117": {
    titulo: "Juro neutro implícito no Focus",
    formula: ["r* = [(1 + Selicₜ₊₃/100) / (1 + IPCAₜ₊₃/100) − 1] × 100"],
    variaveis: ["Selicₜ₊₃ e IPCAₜ₊₃: medianas do Focus para a Selic no fim do ano e o IPCA do ano, 3 anos à frente da data da pesquisa"],
    metodologia: ["Em cada pesquisa, ano de referência = ano da pesquisa + 3, quando os efeitos de curto prazo já passaram.",
      "Leitura de mercado, não estimativa estrutural do neutro."],
    fundamento: ["Juro neutro é o juro real que nem acelera nem freia a economia (Wicksell). Não é observável: estima-se por modelo (Laubach e Williams) ou pelo que o mercado projeta para quando os choques de curto prazo tiverem passado, que é o caso aqui."],
    limitacoes: ["Mistura neutro com prêmio de risco e com a crença do mercado sobre a política futura; pode ficar acima de estimativas estruturais em períodos de incerteza fiscal."],
    referencias: [REF.wicksell, REF.laubachWilliams, REF.hlw, REF.fisher],
  },
  "BR-118": {
    titulo: "Juro real menos neutro",
    formula: ["Postura = r − r*"],
    variaveis: ["r: juro real ex-ante (BR-055)", "r*: neutro implícito no Focus (BR-117), o último disponível até a data"],
    metodologia: ["Positivo: juro acima do neutro implícito (contracionista por essa régua). Negativo: abaixo."],
    fundamento: ["A distância entre o juro real e o neutro é a medida usual de quanto a política monetária está apertada ou frouxa (postura)."],
    referencias: [REF.laubachWilliams, REF.hlw],
  },
};

// ---------------------------------------------------------------- Análises

export const FORMULAS_ANALISES = {
  ciclos: {
    titulo: "Ciclos de política monetária",
    formula: ["Ciclo = movimentos da Selic na mesma direção com intervalo < 6 meses entre eles",
      "Duração = data da última decisão − data da primeira", "Total = (Selic final − Selic inicial) × 100 (pontos-base)",
      "Δ métrica = valor no fim − valor no início (p.p. para taxas; % para dólar e Ibovespa)"],
    variaveis: ["Selic: meta definida pelo Copom (SGS 432), desde mar/1999; cada mudança de valor é uma decisão",
      "Métricas: IPCA 12m (SGS 13522), Focus 12m, juro real ex-ante, neutro implícito, PIB (IBGE t5932), IBC-Br (SGS 24364), desocupação (SGS 24369), dólar (SGS 1), Ibovespa (B3)"],
    metodologia: ["O ciclo termina no último movimento antes de uma inversão ou de uma pausa de 6 meses ou mais.",
      "Manutenção: todo intervalo sem mudança entre dois ciclos; nunca no meio de um ciclo.",
      "Gráfico alinhado: t = 0 na primeira decisão; a Selic de cada mês é a vigente no fim do mês.",
      "Métricas usam o último dado até a data, pela data de referência do dado."],
    limitacoes: ["Quem decidiu no início do ciclo ainda não conhecia o PIB daquele trimestre (dados pela data de referência, não de divulgação).",
      "Desocupação só desde 2012, Focus 12m desde 2001, Ibovespa desde 1998: sem dado, o campo fica vazio.",
      "A regra dos 6 meses é uma escolha: as altas de 2010 e de 2011 (pausa de 6 meses menos 1 dia) aparecem como um ciclo só.",
      "Datas de início e fim são as de vigência da nova Selic no SGS (o dia seguinte à reunião)."],
    fundamento: ["Datar ciclos por regras fixas e transparentes (pontos de virada e duração mínima) é a abordagem clássica de Bry e Boschan, aplicada aqui às decisões da Selic."],
    referencias: [REF.bryBoschan],
  },
  postura: {
    titulo: "Postura monetária",
    formula: ["r = [(1 + Selic/100) / (1 + πᵉ₁₂/100) − 1] × 100",
      "r* = [(1 + Selicₜ₊₃/100) / (1 + IPCAₜ₊₃/100) − 1] × 100", "Postura = r − r*"],
    variaveis: ["Selic: meta vigente (SGS 432)", "πᵉ₁₂: Focus, IPCA 12 meses à frente",
      "Selicₜ₊₃, IPCAₜ₊₃: Focus, valores esperados para 3 anos à frente da pesquisa"],
    metodologia: ["Fórmula de Fisher exata.", "O percentil compara a postura de hoje com as observações dos últimos 10 anos."],
    limitacoes: ["O neutro implícito é leitura de mercado; as estimativas do BC entram depois, digitadas dos relatórios."],
    fundamento: ["Juro real acima do neutro freia demanda e inflação; abaixo, estimula. É a leitura de postura usada com o conceito de juro natural."],
    referencias: [REF.fisher, REF.wicksell, REF.laubachWilliams, REF.hlw],
  },
  analogos: {
    titulo: "Períodos históricos parecidos com hoje",
    formula: ["zᵥ,ₘ = (xᵥ,ₘ − média de v) / desvio-padrão de v",
      "d(m) = √[ Σᵥ (zᵥ,ₘ − zᵥ,hoje)² / nº de variáveis ]", "Semelhança = máx(0; 1 − d/2) × 100%",
      "Desfecho = valor 12 meses depois − valor no mês (p.p.; % para dólar e Ibovespa)"],
    variaveis: ["xᵥ,ₘ: variável v no mês m (as marcadas na tela)", "Média e desvio-padrão sobre todos os meses com todas as variáveis marcadas"],
    metodologia: ["Padronizar faz cada variável pesar igual.", "Os últimos 24 meses ficam de fora; os 5 escolhidos ficam a pelo menos 12 meses um do outro.",
      "\"Hoje\" é o último mês com todas as variáveis marcadas."],
    limitacoes: ["Não é previsão: são 5 casos, e a mediana de 5 casos tem pouca força estatística."],
    fundamento: ["Método de análogos: procurar no passado os estados mais próximos do atual e ver o que veio depois. Origem na meteorologia (Lorenz); a distância é euclidiana entre variáveis padronizadas (z-score), para que nenhuma pese mais por ter escala maior."],
    referencias: [REF.lorenz],
  },
  hiato: {
    titulo: "Hiato do produto",
    formula: ["yₜ = 100 × ln(PIBₜ)", "Hiatoₜ = yₜ − tendênciaₜ (% do PIB tendencial)",
      "HP: tendência minimiza Σ(yₜ − τₜ)² + λ Σ(Δ²τₜ)², λ = 1600",
      "Hamilton: yₜ₊₈ = β₀ + β₁yₜ + β₂yₜ₋₁ + β₃yₜ₋₂ + β₄yₜ₋₃ + vₜ₊₈; hiatoₜ₊₈ = vₜ₊₈"],
    variaveis: ["PIB: índice de volume com ajuste sazonal, IBGE SIDRA t1621 v584 (desde 1996)"],
    metodologia: ["HP, amostra inteira: filtro com todos os trimestres.",
      "HP, tempo real: para cada trimestre, o filtro só com os dados até ele (mínimo de 20 trimestres); fica o último ponto.",
      "Hamilton (2018): mínimos quadrados com a amostra inteira, h = 8 e p = 4; começa 11 trimestres depois da série.",
      "Os três conferidos contra o statsmodels com o PIB real do IBGE (6 casas)."],
    limitacoes: ["O hiato não é observável: é estimativa, e cada método erra de um jeito.",
      "HP tem problema de ponta (o último trimestre puxa a tendência) e revisa o passado."],
    fundamento: [
      "Hiato = distância entre o PIB e o PIB potencial (Okun). Como o potencial não é observado, separa-se tendência e ciclo.",
      "HP (Hodrick e Prescott): tendência suave que equilibra ajuste aos dados e suavidade; λ = 1600 é o valor padrão para dados trimestrais.",
      "Hamilton (2018) critica o HP (ciclos espúrios, problema de ponta) e propõe usar o erro de previsão de 2 anos à frente (h = 8, p = 4 em dados trimestrais).",
      "HP em tempo real mostra o que se via na época: as estimativas de hiato mudam muito depois (Orphanides e van Norden).",
    ],
    referencias: [REF.okun, REF.hp, REF.hamilton, REF.orphanidesVanNorden],
  },
  taylor: {
    titulo: "Regra de Taylor",
    formula: ["Selic da regra = r* + π + a·(π − π*) + b·hiato",
      "Faixa = menor e maior das 16 especificações no mês; linha tracejada = mediana"],
    variaveis: ["r*: neutro implícito no Focus (BR-117)", "π: IPCA 12 meses (SGS 13522) ou Focus IPCA 12 meses à frente",
      "π*: meta do CMN para o ano (SGS 13521)", "hiato: HP (amostra inteira) ou Hamilton, do trimestre do mês",
      "a e b: 0,5 ou 1. Taylor (1993) usa 0,5 nos dois; Taylor (1999) usa 1 para o hiato; a = 1 testa uma reação mais forte à inflação"],
    metodologia: ["2 inflações × 2 valores de a × 2 de b × 2 hiatos = 16 especificações.",
      "Mês a mês desde dez/2001 (início do Focus 12 meses), com os dados do fim do mês; no mês corrente, os dados até hoje.",
      "Depois do último PIB, vale o último hiato conhecido (a página avisa)."],
    limitacoes: ["Referencial descritivo, não previsão nem recomendação; os pesos não foram estimados para o Brasil.",
      "A meta é o valor central, sem o intervalo de tolerância.",
      "O hiato de cada mês é o do trimestre a que o mês pertence, que na época ainda não era conhecido (o PIB sai cerca de 2 meses depois do trimestre). Para o que se sabia em tempo real, ver Orphanides (2001)."],
    fundamento: [
      "Regra de Taylor: o juro nominal sobe com a inflação, mais uma reação à inflação acima da meta e ao hiato do produto, a partir do juro neutro.",
      "Princípio de Taylor: com a > 0, o juro nominal sobe mais que a inflação, e o juro real sobe; é o que estabiliza a inflação.",
      "Usar a inflação esperada (Focus) no lugar da passada é a versão prospectiva de Clarida, Galí e Gertler.",
      "A faixa de 16 especificações mostra quanto o resultado depende das escolhas: não existe uma regra única certa.",
    ],
    referencias: [REF.taylor93, REF.taylor99, REF.cgg, REF.orphanides01],
  },
  phillipsDesocupacao: {
    titulo: "Inflação e desocupação",
    formula: ["Ponto do mês m = (desocupaçãoₘ; IPCA 12 mesesₘ)"],
    variaveis: ["Desocupação: PNAD Contínua, trimestre móvel terminado em m (SGS 24369)", "IPCA 12 meses (SGS 13522)"],
    metodologia: ["Só descrição: sem reta ajustada e sem NAIRU estimada.", "Cores por período; o último ponto em dourado."],
    limitacoes: ["Só desde 2012 (início da PNAD Contínua)."],
    fundamento: ["Curva de Phillips: relação inversa entre desemprego e inflação (Phillips, 1958). Friedman (1968) mostrou que ela se desloca com as expectativas, por isso o gráfico só descreve, sem ajustar reta."],
    referencias: [REF.phillips, REF.friedman68],
  },
  phillipsHiato: {
    titulo: "Inflação acima da meta e hiato",
    formula: ["Ponto do trimestre q = (hiato HPq; IPCA 12 meses no fim de q − meta do ano)"],
    variaveis: ["Hiato HP com a amostra inteira (ver o gráfico do hiato)", "IPCA 12 meses (SGS 13522)", "Meta do CMN (SGS 13521)"],
    metodologia: ["Só descrição: sem reta ajustada.", "Cores por período; o último ponto em dourado."],
    fundamento: ["Versão com hiato da curva de Phillips: economia acima do potencial (hiato positivo) tende a vir com inflação acima da meta."],
    referencias: [REF.phillips, REF.friedman68, REF.okun],
  },
} satisfies Record<string, Formula>;

export type IdAnalise = keyof typeof FORMULAS_ANALISES;

// ---------------------------------------------------------------- leitura de trajetória (decisão 0013)

export const FORMULA_TRAJETORIA: Formula = {
  titulo: "Leitura de trajetória (curto, médio e longo prazo)",
  formula: [
    "Δcurto = xₜ − xₜ₋₃ meses   (em % quando a medida é um nível: (xₜ / xₜ₋₃ − 1) × 100)",
    "Δmédio = xₜ − xₜ₋₁₂ meses",
    "Estável se |Δ| ≤ 0,25 × mediana dos |Δ| do mesmo horizonte nos últimos 10 anos",
    "Longo prazo: percentil = % das observações dos últimos 10 anos ≤ xₜ",
  ],
  variaveis: ["xₜ: último valor da medida mostrada no gráfico (já transformada)", "xₜ₋ₖ: valor k meses antes"],
  metodologia: [
    "Diz só para onde o dado foi e onde está na própria história; não diz se é bom ou ruim.",
    "A escala de \"estável\" é a da própria série: a mediana não se distorce com crises.",
    "Precisa de 24 observações no histórico para classificar como estável e para o percentil; séries diárias aceitam até 7 dias de distância na data de comparação.",
  ],
  limitacoes: ["Com menos de 10 anos de dados, o longo prazo usa o histórico disponível (o número de anos aparece na faixa)."],
};

// ---------------------------------------------------------------- Central

export const FORMULAS_CENTRAL = {
  faixa: {
    titulo: "Faixa de mercado",
    formula: [
      "Selic: Δ = (Selic depois − Selic antes da última decisão) × 100 (pontos-base)",
      "Dólar e Ibovespa: Δ% = (xₜ / x do dia útil anterior − 1) × 100",
      "IPCA 12 meses: Δ = xₜ − x do mês anterior (p.p.)",
      "Focus e juro real: Δ = xₜ − x de 4 semanas antes (p.p.)",
    ],
    variaveis: ["Selic meta (SGS 432)", "Dólar, taxa de câmbio livre, venda (SGS 1)", "Ibovespa (B3)", "IPCA 12 meses (SGS 13522)",
      "Focus, mediana do IPCA 12 meses à frente (BCB Olinda)", "Juro real ex-ante (BR-055, ver fórmula na Política Monetária)"],
    metodologia: ["Cada número é o último dado no banco, com a data dele.", "Quatro semanas antes: o último dado até 28 dias antes, com até 10 dias de folga."],
  },
  divulgacoes: {
    titulo: "Últimas divulgações",
    formula: ["Taxas e variações (%): Δ = valor novo − anterior (p.p.)", "Níveis: Δ% = (valor novo / anterior − 1) × 100"],
    variaveis: ["Valor novo: o dado mais recente da série", "Anterior: o dado do período imediatamente anterior"],
    metodologia: ["Entra na lista toda série das abas (mensal, trimestral ou anual) cujo dado mais recente entrou ou foi revisado no banco nos últimos 7 dias.",
      "Séries diárias e semanais ficam de fora: elas estão na faixa de mercado e nos gráficos."],
    limitacoes: ["Uma revisão do último dado também traz a série para a lista."],
  },
} satisfies Record<string, Formula>;

// ---------------------------------------------------------------- resumo do topo das abas

export const FORMULAS_RESUMO = {
  fichas: {
    titulo: "Fichas do resumo",
    formula: ["Valor = último ponto da medida indicada na ficha (ex.: variação mensal, 12 meses, nível)",
      "Δ = valor − valor do período anterior   (p.p. para taxas e variações; % para níveis: (valor / anterior − 1) × 100)",
      "Minicurva = a mesma medida nos últimos 24 meses"],
    variaveis: ["As séries de cada ficha, com fonte e código no botão i"],
    metodologia: ["As setas de 3 e 12 meses seguem a leitura de trajetória dos gráficos (ver a fórmula abaixo)."],
  },
  mudancas: {
    titulo: "O que mais mudou",
    formula: ["Para cada painel: Δ = último movimento de um período para o seguinte, na medida padrão do painel",
      "Típico = mediana dos |Δ| da mesma série nos últimos 10 anos",
      "Tamanho do movimento = |Δ| / típico; aparecem os 3 maiores"],
    variaveis: ["Primeira série de cada painel, na transformação padrão do painel"],
    metodologia: ["Só entram dados recentes (até 120 dias antes de hoje) e séries com pelo menos 25 observações.",
      "\"3,2× o típico\" quer dizer que o último movimento foi 3,2 vezes o movimento mediano da série. Não diz se é bom ou ruim."],
    limitacoes: ["Séries diárias medem o movimento de um dia; mensais, de um mês: a comparação é sempre com a própria série."],
  },
} satisfies Record<string, Formula>;

// ---------------------------------------------------------------- frases de leitura (decisão 0017)

export const FORMULA_FATOS: Formula = {
  titulo: "Frases de leitura (fatos por regra)",
  formula: [
    "Δ3 = xₜ − xₜ₋₃ meses (p.p.)   ·   Δ1 e Δ12 do mesmo jeito",
    "Sequência = nº de períodos seguidos com a mesma direção (xₜ − xₜ₋₁ com o mesmo sinal), aparece a partir de 2",
    "Meta: xₜ − meta do CMN do ano de t",
    "Maior/menor desde: data do último ponto anterior que foi mais alto (ou mais baixo) que xₜ; só aparece se tiver 12 meses ou mais",
    "Percentil: % das observações dos últimos 10 anos ≤ xₜ (aparece na frase só se ≥ 80% ou ≤ 20% e não houver \"desde\")",
  ],
  variaveis: ["xₜ: último valor da medida (ex.: IPCA acumulado em 12 meses)", "Meta: SGS 13521"],
  metodologia: [
    "A frase é montada só com esses fatos, na ordem: movimento em 3 meses e sequência; distância da meta; maior/menor desde (ou percentil).",
    "Descreve o que aconteceu; não diz se é bom ou ruim, nem por quê, nem o que vai acontecer (decisão 0017).",
  ],
  limitacoes: ["Todas as medidas usam a mesma régua, então o texto pode soar repetitivo."],
};


// ---------------------------------------------------------------- seção Geral das abas (Fase 6d)

export const FORMULAS_GERAL = {
  relogio: {
    titulo: "Relógio do ciclo",
    formula: [
      "Nível = xₜ − referência (na Inflação: IPCA 12 meses − meta do CMN do ano)",
      "Direção = xₜ − xₜ₋₆ meses (p.p.)",
      "Eixos padronizados: nível / desvio-padrão do nível em 10 anos; direção / desvio-padrão da direção em 10 anos",
      "Fase: acima e subindo = aquecendo; acima e caindo = esfriando; abaixo e caindo = fria; abaixo e subindo = reaquecendo",
    ],
    variaveis: ["IPCA 12 meses (SGS 13522)", "Meta do CMN (SGS 13521)"],
    metodologia: ["O ciclo costuma girar no sentido reaquecendo → aquecendo → esfriando → fria.", "Rastro: os 24 meses anteriores. \"Há N meses\": meses seguidos na fase atual."],
    limitacoes: ["Descreve onde o dado está; não prevê a próxima fase. A direção de 6 meses pode discordar da de 3 meses (ver checklist)."],
    fundamento: ["Relógio do ciclo: cruza nível (acima ou abaixo da referência) e direção (subindo ou caindo) e lê o ciclo como um giro em quatro fases, como o Business Cycle Tracer do instituto de estatística holandês e o Business Cycle Clock do Eurostat e da OCDE."],
    referencias: [REF.tracer],
  },
  checklist: {
    titulo: "Checklist sim/não",
    formula: [
      "Acima da meta: IPCA 12m > meta do ano; \"há N meses\" = meses seguidos acima",
      "Acelerando: Sim se o IPCA 12m subiu em 3 e em 6 meses; Não se não subiu em nenhum; Parcial se discordam",
      "Núcleos confirmam: direção em 3 meses de cada núcleo em 12 meses (EX0, EX3, MS, DP, P55) igual à do IPCA: todos = Sim, nenhum = Não, alguns = Parcial",
      "Serviços cedendo: serviços subjacentes em 12 meses caiu em 3 meses",
      "Alta espalhada: difusão média dos últimos 3 meses > média de 10 anos",
      "Expectativas acima da meta: Focus 12 meses > meta do ano",
    ],
    variaveis: ["SGS 13522, 13521, 11427, 27839, 4466, 16122, 28750, 29683, 21379 e Focus (BCB Olinda)"],
    metodologia: ["As respostas são fatos sobre os dados, não julgamento (decisão 0017).", "Acumulados em 12 meses são encadeados a partir das variações mensais."],
  },
  cabo: {
    titulo: "Cabo de guerra: contribuição por grupo",
    formula: [
      "Contribuição do grupo no mês = peso do grupo no mês × variação do grupo no mês / 100",
      "Contribuição em 12 meses = soma das 12 contribuições mensais",
      "O que mudou = contribuição em 12 meses hoje − a de k meses antes (k = 3, 6, 9 ou 12, no seletor)",
      "Por trás de cada grupo: a mesma conta para cada subitem do grupo; mostra os de maior |mudança|",
    ],
    variaveis: ["Variação (v63) e peso (v66) dos 9 grupos e dos subitens do IPCA, IBGE SIDRA t7060 (desde 2020)"],
    metodologia: [
      "A soma dos 9 grupos num mês bate com o IPCA do mês (diferença máxima de 0,007 p.p. desde 2020, por arredondamento).",
      "Grupo de cada subitem: primeiro dígito do código IBGE de 7 dígitos.",
      "Influências típicas: texto de curadoria (config/derivadas/ipca_classificacao.yaml) com os canais conhecidos de formação de preço de cada grupo.",
    ],
    limitacoes: [
      "Em 12 meses a soma é aditiva e o IPCA oficial é encadeado (composto): a diferença aparece na página.",
      "As influências típicas são canais possíveis, não a causa medida do movimento; os subitens são o fato.",
    ],
  },
  parecidos: {
    titulo: "Períodos parecidos",
    formula: [
      "zᵥ,ₘ = (xᵥ,ₘ − média de v) / desvio-padrão de v, desde 2002",
      "Distância d(m) = √[ Σᵥ (zᵥ,ₘ − zᵥ,hoje)² / nº de variáveis ]; semelhança = máx(0; 1 − d/2) × 100%",
      "Depois = valor 12 meses após o mês parecido",
      "Trajetória: IPCA 12 meses de t = −12 a t = +12 meses em torno do mês parecido",
      "Mais parecido em / mais diferente em: variáveis ordenadas por |zᵥ,ₘ − zᵥ,hoje|",
    ],
    variaveis: ["IPCA 12m, média dos núcleos em 12m, serviços em 12m, Focus 12m e Selic"],
    metodologia: ["Os 5 meses mais parecidos, fora dos últimos 24 meses e a pelo menos 12 meses um do outro (mesmo motor da aba Análises)."],
    limitacoes: ["São poucos casos: é contexto histórico, não previsão.", "Contexto da época: curadoria do Argus com fatos documentados (decisões do Copom, choques conhecidos)."],
    fundamento: ["Método de análogos (Lorenz): procura no passado os meses mais parecidos com hoje em várias variáveis padronizadas e mostra o que veio depois."],
    referencias: [REF.lorenz],
  },
  areas: {
    titulo: "IPCA por área de influência",
    formula: [
      "Cesta: serviços, bens industriais, alimentação no domicílio e monitorados (partição do IPCA usada pelo BCB)",
      "Alta em 12 meses = Π (1 + mₜ/100) − 1 sobre a série mensal oficial do BCB de cada cesta",
      "Contribuição da cesta em 12 meses = Σ₁₂ meses Σ subitens da cesta (peso × variação / 100)",
      "Peso da cesta = Σ pesos dos seus subitens no mês",
    ],
    variaveis: [
      "Séries do BCB: serviços (SGS 10844), bens industriais (27863), alimentação no domicílio (27864), monitorados (4449)",
      "Lentes: comercializáveis (4447), não comercializáveis (4448), bens duráveis (10843)",
      "Subitens do IPCA: variação (v63) e peso (v66), IBGE SIDRA t7060",
    ],
    metodologia: [
      "Separação dos 377 subitens por curadoria do Argus (config/derivadas/ipca_classificacao.yaml), na ordem serviços → monitorados → alimentação no domicílio → industriais.",
      "Conferência desde 2023: a variação de cada cesta reproduz a série do BCB com diferença média de 0,005 (serviços), 0,003 (alimentação), 0,002 (industriais) e 0,012 p.p. (monitorados) por mês; as quatro somam 100% do peso.",
      "A área de influência nomeia a força dominante de cada cesta, conforme a literatura do BCB.",
    ],
    limitacoes: ["Cada cesta responde a mais de uma força; o rótulo é a principal, não a única.", "As lentes se sobrepõem às cestas e não somam o IPCA."],
  },
  curvaReunioes: {
    titulo: "Selic esperada em cada reunião do Copom",
    formula: ["Selic esperada = mediana do Focus para a meta Selic decidida na reunião (última pesquisa)", "Mudança na reunião = esperada na reunião − esperada na reunião anterior (na primeira, − Selic de hoje)", "Δ 4 semanas = mediana de hoje − mediana da pesquisa de 4 semanas antes"],
    variaveis: ["Focus, ExpectativasMercadoSelic por reunião (BCB Olinda, BR-056)", "Meta Selic vigente (SGS 432)", "Datas das reuniões: calendário oficial do Copom (config/agenda/reunioes.yaml)"],
    metodologia: ["Reunião Rn/ano = n-ésima reunião do ano no calendário do Copom.", "Base de cálculo 0 do Focus (respostas dos últimos 30 dias)."],
    limitacoes: ["Mediana de analistas, não preço de mercado (a curva de juros futuros pode divergir)."],
  },
  servicos: {
    titulo: "Composição dos serviços",
    formula: [
      "Tipo de serviço = conjunto de subitens (curadoria do Argus)",
      "Peso nos serviços = Σ pesos dos subitens do tipo / Σ pesos de todos os serviços",
      "Alta em 12m = Π (1 + variação ponderada do tipo no mês / 100) − 1",
      "Contribuição para o IPCA 12m = Σ₁₂ meses Σ subitens (peso × variação / 100)",
    ],
    variaveis: ["Subitens do IPCA: variação (v63) e peso (v66), IBGE SIDRA t7060; Serviços (SGS 10844) e serviços subjacentes (SGS 29683)"],
    metodologia: ["A cesta inteira reproduz a série de serviços do BCB (SGS 10844) com diferença média de 0,005 p.p. por mês desde 2023."],
    limitacoes: ["A divisão em tipos é do Argus; o BCB não publica essa abertura."],
  },
} satisfies Record<string, Formula>;
