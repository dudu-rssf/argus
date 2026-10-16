import { expect, test } from "@playwright/test";
import { SENHA_TESTE } from "../playwright.config";

const SITE = "http://localhost:3100";

test.beforeEach(async ({ page }) => {
  await page.goto(SITE + "/login");
  await page.getByLabel("Senha").fill(SENHA_TESTE);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(SITE + "/");
});

test("aba Inflação montada só pela configuração", async ({ page }) => {
  await page.goto(SITE + "/aba/inflacao?ver=dados");
  await expect(page.getByRole("heading", { name: "Inflação", level: 1 })).toBeVisible();
  const titulo = "IPCA, mês a mês e em 12 meses";
  await expect(page.getByRole("img", { name: `Gráfico: ${titulo}`, exact: true })).toBeVisible();
  await expect(page.getByText("Sem dados para esta combinação.").first()).toBeVisible(); // séries fora da fixture
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/aba.png", fullPage: true });

  const painel = page.locator("article", { has: page.getByRole("heading", { name: titulo, exact: true }) });
  await page.waitForLoadState("networkidle");
  await painel.getByRole("button", { name: "Ver tabela" }).click();
  await expect(painel.getByRole("button", { name: "Ver gráfico" })).toBeVisible();
  await expect(painel.getByRole("cell", { name: "ago/2026" })).toBeVisible();
  await expect(painel.getByRole("cell", { name: "4,22" })).toBeVisible(); // IPCA 12m oficial de ago/2026
});

test("saúde dos dados mostra execuções e falhas", async ({ page }) => {
  await page.getByRole("navigation").getByRole("link", { name: "Saúde dos dados" }).click();
  await expect(page.getByText("1 falhou na última coleta.")).toBeVisible();
  await page.getByRole("link", { name: /Só com problema/ }).click();
  await expect(page.getByText("FRED HTTP 500")).toBeVisible();
  await page.screenshot({ path: "test-results/dados.png", fullPage: true });
});

test("aba Política Monetária mostra o comunicado do Copom", async ({ page }) => {
  await page.goto(SITE + "/aba/politica-monetaria?ver=dados");
  await expect(page.getByText("Copom reduz a taxa Selic para 13,75% a.a.")).toBeVisible();
  await expect(page.getByText(/O ambiente externo permanece incerto/).first()).toBeVisible();
  await page.screenshot({ path: "test-results/politica.png", fullPage: true });
});

test("Inflação: IPCA 12 meses e meta em degrau", async ({ page }) => {
  await page.goto(SITE + "/aba/inflacao?ver=dados");
  await expect(page.getByRole("heading", { name: "IPCA em 12 meses e meta para a inflação" })).toBeVisible();
});

test("botão Fórmula explica a conta do gráfico", async ({ page }) => {
  await page.goto(SITE + "/aba/inflacao?ver=dados");
  const painel = page.locator("article", { has: page.getByRole("heading", { name: "Núcleos acompanhados pelo Copom" }) });
  await painel.getByRole("button", { name: "Fórmula" }).click();
  await expect(painel.getByText("Acumulado em 12 meses (encadeado)")).toBeVisible();
  await expect(painel.getByText(/\(1 \+ mₜ\/100\)/)).toBeVisible();
  // dado bruto: a única conta é a leitura de trajetória
  const meta = page.locator("article", { has: page.getByRole("heading", { name: "IPCA em 12 meses e meta para a inflação" }) });
  await meta.getByRole("button", { name: "Fórmula" }).click();
  await expect(meta.getByText("Leitura de trajetória (curto, médio e longo prazo)")).toBeVisible();
  await expect(meta.getByText(/Acumulado em/)).toHaveCount(0);
  await page.getByRole("navigation").getByRole("link", { name: "Análises" }).click();
  const taylor = page.locator("article", { has: page.getByRole("heading", { name: "Selic efetiva e regra de Taylor" }) });
  await taylor.getByRole("button", { name: "Fórmula" }).click();
  await expect(taylor.getByText("Selic da regra = r* + π + a·(π − π*) + b·hiato")).toBeVisible();
  await taylor.screenshot({ path: "test-results/formula-taylor.png" });
});

test("Análises: ciclos da Selic com episódio atual, tabela e detalhe", async ({ page }) => {
  await page.getByRole("navigation").getByRole("link", { name: "Análises" }).click();
  await expect(page.getByRole("heading", { name: "Ciclos de política monetária" })).toBeVisible();
  await expect(page.getByText("Ciclo de corte desde 19/03/2026")).toBeVisible();
  await expect(page.getByRole("cell", { name: "14,25 → 6,50" })).toBeVisible(); // corte de 2016-2018
  const corte = page.getByRole("img", { name: "Gráfico: Ciclos de corte, alinhados no início" });
  await corte.waitFor();
  await corte.scrollIntoViewIfNeeded();
  const caixa = (await corte.boundingBox())!;
  await page.mouse.move(caixa.x + caixa.width * 0.3, caixa.y + caixa.height * 0.4);
  await expect(page.getByText(/Mês \d+ desde o início do ciclo/)).toBeVisible();
  await expect(page.getByText(/bps em \d+ decisões/).first()).toBeVisible();
  await page.screenshot({ path: "test-results/tooltip-ciclos.png", clip: { x: caixa.x - 20, y: caixa.y - 60, width: caixa.width + 40, height: caixa.height + 120 } });
  await expect(page.getByRole("heading", { name: "Postura monetária" })).toBeVisible();
  // Com só Selic e IPCA na base de teste, compara por essas duas
  for (const v of ["Expectativa Focus 12 meses", "Juro real ex-ante", "IBC-Br (var. anual)", "Dólar (var. anual)"])
    await page.getByRole("checkbox", { name: v }).uncheck();
  await expect(page.getByText("O que aconteceu nos 12 meses seguintes")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Hiato do produto, regra de Taylor e curva de Phillips" })).toBeVisible();
  await expect(page.getByText(/Hiato no 2º tri 2026/)).toBeVisible();
  await expect(page.getByText(/contra a regra de Taylor/)).toBeVisible();
  await page.getByRole("img", { name: "Gráfico: Selic efetiva e regra de Taylor" }).waitFor();
  await page.getByRole("img", { name: "Gráfico: Inflação e desocupação" }).waitFor();
  await page.getByRole("img", { name: "Gráfico: Inflação acima da meta e hiato" }).waitFor();
  await page.getByText(/As 16 especificações em/).click();
  await expect(page.getByRole("cell", { name: "Focus 12m · a = 1 · b = 1 · Hamilton" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Copom por diretor" })).toBeVisible();
  await expect(page.getByText("Por uma redução de 0,50 ponto percentual:")).toBeVisible();
  await page.screenshot({ path: "test-results/analises.png", fullPage: true });
});

test("Central: mercado, resumo das análises e últimas divulgações", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Central", level: 1 })).toBeVisible();
  const mercado = page.getByRole("article", { name: "Faixa de mercado" });
  await expect(mercado.getByText("Selic meta")).toBeVisible();
  await expect(mercado.getByText("−25 bps")).toBeVisible();
  await expect(mercado.getByText("IPCA 12 meses")).toBeVisible();
  const resumo = page.getByRole("article", { name: "Resumo das análises" });
  await expect(resumo.getByText(/Ciclo de corte há/)).toBeVisible();
  await expect(resumo.getByText(/regra \d/)).toBeVisible();
  await expect(resumo.getByText(/HP [+−]/)).toBeVisible();
  const div = page.getByRole("article", { name: "Últimas divulgações" });
  await expect(div.getByRole("link", { name: "IPCA 12 meses" })).toBeVisible();
  await expect(div.getByText("−0,50 p.p.")).toBeVisible();
  await div.getByRole("button", { name: "Fórmula" }).click();
  await expect(div.getByText(/entrou ou foi revisado no banco nos últimos 7 dias/)).toBeVisible();
  await page.screenshot({ path: "test-results/central.png", fullPage: true });
});

test("aba com resumo, índice, MoM/ToT/YoY, horizonte da aba, tela cheia e busca", async ({ page }) => {
  await page.goto(SITE + "/aba/inflacao?ver=dados");
  const resumo = page.getByRole("article", { name: "Resumo: Inflação" });
  await expect(resumo.getByText("IPCA 12 meses", { exact: true })).toBeVisible();
  await expect(resumo.getByText("4,22")).toBeVisible();
  await resumo.getByRole("button", { name: "Sobre: IPCA 12 meses" }).click();
  await expect(resumo.getByRole("dialog", { name: "IPCA 12 meses" })).toContainText("13522");

  // índice leva ao painel
  await page.getByRole("navigation", { name: "Painéis desta aba" }).getByRole("link", { name: "IPCA-15" }).click();
  await expect(page).toHaveURL(/#ipca-15$/);

  // atalhos MoM/ToT/YoY trocam a medida
  const nucleos = page.locator("article#nucleos-acompanhados-pelo-copom");
  await nucleos.getByRole("button", { name: "ToT" }).click();
  await expect(nucleos.getByRole("combobox", { name: "Transformação" })).toHaveValue("acum3");

  // horizonte da aba inteira
  await page.getByRole("group", { name: "Horizonte de todos os gráficos" }).getByRole("button", { name: "3A" }).click();
  await expect(page.locator("article#ipca-mes-a-mes-e-em-12-meses").getByRole("group", { name: "Horizonte" }).getByRole("button", { name: "3A" }))
    .toHaveAttribute("aria-pressed", "true");

  // tela cheia
  const ipca = page.locator("article#ipca-mes-a-mes-e-em-12-meses");
  await ipca.getByRole("button", { name: "Abrir em tela cheia" }).click();
  await expect(ipca).toHaveClass(/fixed/);
  await page.keyboard.press("Escape");
  await expect(ipca).not.toHaveClass(/fixed/);

  // busca rápida
  await page.keyboard.press("Control+k");
  await page.getByRole("textbox", { name: "Buscar" }).fill("taylor");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/analises#taylor$/);
  await page.screenshot({ path: "test-results/apos-busca.png" });
});

test("Inflação abre na seção Geral: fase do ciclo, perguntas, contribuições e períodos parecidos", async ({ page }) => {
  await page.getByRole("navigation", { name: "Abas" }).getByRole("link", { name: "Inflação" }).click();
  await expect(page.getByRole("navigation", { name: "Seção da aba" }).getByRole("link", { name: "Geral" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText(/^IPCA 12 meses em 4,22%/)).toBeVisible();
  await page.getByRole("img", { name: "Gráfico: Relógio do ciclo" }).waitFor();
  await expect(page.getByText("Fase atual")).toBeVisible();
  await expect(page.getByText("O IPCA está acima da meta?")).toBeVisible();
  await expect(page.getByText("Os núcleos confirmam a direção do IPCA?")).toBeVisible();
  await expect(page.getByText("Alimentação e bebidas").first()).toBeVisible();
  await expect(page.getByText(/se parece com 5 momentos do passado/)).toBeVisible();
  await page.getByRole("img", { name: "Gráfico: trajetórias de IPCA 12 meses nos períodos parecidos" }).waitFor();
  await expect(page.getByText("Renda e mercado de trabalho").first()).toBeVisible();
  await page.screenshot({ path: "test-results/inflacao-geral.png", fullPage: true });

  // Ver mais dos núcleos: explicação e minigráficos de cada núcleo
  await page.getByRole("button", { name: "Ver mais: Os núcleos confirmam a direção do IPCA?" }).click();
  const gaveta = page.getByRole("dialog", { name: "Os núcleos confirmam a direção do IPCA?" });
  await expect(gaveta.getByText("EX0 · Exclusão 0")).toBeVisible();
  await expect(gaveta.getByText("P55 · Percentil 55")).toBeVisible();
  await page.screenshot({ path: "test-results/inflacao-ver-mais-nucleos.png" });
  await page.keyboard.press("Escape");
  await expect(gaveta).toBeHidden();

  // Ver mais de serviços: composição por tipo
  await page.getByRole("button", { name: "Ver mais: A inflação de serviços está cedendo?" }).click();
  await expect(page.getByRole("dialog").getByRole("cell", { name: "Alimentação fora de casa" })).toBeVisible();
  await page.screenshot({ path: "test-results/inflacao-ver-mais-servicos.png" });
  await page.getByRole("button", { name: "Fechar painel" }).click();

  // Cabo de guerra: troca de prazo e "por que mexeu" de um grupo
  await page.getByRole("button", { name: "12m", exact: true }).click();
  await expect(page.getByText(/Mudança da contribuição em 12 meses/)).toBeVisible();
  await page.getByRole("button", { name: "Por que mexeu: Habitação: o que pode estar por trás" }).click();
  const porTras = page.getByRole("dialog", { name: "Habitação: o que pode estar por trás" });
  await expect(porTras.getByText("Energia elétrica residencial")).toBeVisible();
  await expect(porTras.getByText(/bandeiras tarifárias/)).toBeVisible();
  await page.screenshot({ path: "test-results/inflacao-por-tras.png" });
  await page.keyboard.press("Escape");
  await page.getByRole("navigation", { name: "Seção da aba" }).getByRole("link", { name: "Todos os dados" }).click();
  await expect(page.getByRole("article", { name: "Resumo: Inflação" })).toBeVisible();
});

test("endereços antigos dos protótipos levam à Inflação; página inexistente tem 404 do Argus", async ({ page }) => {
  await page.goto(SITE + "/prototipos/d");
  await expect(page).toHaveURL(SITE + "/aba/inflacao");
  await page.goto(SITE + "/nao-existe");
  await expect(page.getByRole("heading", { name: /Esta página não existe/ })).toBeVisible();
});

const ABAS_GERAL = [
  { id: "atividade", nome: "Atividade", pergunta: "A atividade está acelerando?", dec: "Quem está acelerando e quem está freando" },
  { id: "mercado-de-trabalho", nome: "Mercado de Trabalho", pergunta: "O desemprego está menor que há um ano?", dec: "De onde veio a mudança no desemprego" },
  { id: "politica-monetaria", nome: "Política Monetária", pergunta: "A política monetária está restritiva?", dec: "O que mexeu no juro real" },
  { id: "fiscal", nome: "Fiscal", pergunta: "A dívida bruta está subindo?", dec: "O que mudou no déficit nominal" },
  { id: "setor-externo", nome: "Setor Externo", pergunta: "As exportações estão crescendo?", dec: "Para onde vendemos: o que mudou nas exportações" },
  { id: "familias", nome: "Famílias", pergunta: "A inadimplência das famílias está subindo?", dec: "Quais dívidas estão crescendo" },
];
for (const a of ABAS_GERAL) {
  test(`${a.nome} abre na seção Geral: relógio, perguntas com Ver mais, decomposição por prazo e parecidos`, async ({ page }) => {
    await page.getByRole("navigation", { name: "Abas" }).getByRole("link", { name: a.nome, exact: true }).click();
    await expect(page).toHaveURL(SITE + `/aba/${a.id}`);
    await expect(page.getByRole("navigation", { name: "Seção da aba" }).getByRole("link", { name: "Geral" })).toHaveAttribute("aria-current", "page");
    await page.getByRole("img", { name: "Gráfico: Relógio do ciclo" }).waitFor();
    await expect(page.getByText("Fase atual")).toBeVisible();
    await expect(page.getByRole("heading", { name: a.dec })).toBeVisible();
    await expect(page.getByText(/se parece com 5 momentos do passado/)).toBeVisible();
    await page.getByRole("img", { name: /Gráfico: trajetórias de/ }).waitFor();
    await page.screenshot({ path: `test-results/geral-${a.id}.png`, fullPage: true });
    await page.getByRole("button", { name: `Ver mais: ${a.pergunta}` }).click();
    await expect(page.getByRole("dialog", { name: a.pergunta }).locator("figure").first()).toBeVisible();
    await page.screenshot({ path: `test-results/geral-${a.id}-ver-mais.png` });
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "12m", exact: true }).click();
    await expect(page.getByText(/Mudança em 12 meses/)).toBeVisible();
  });
}
