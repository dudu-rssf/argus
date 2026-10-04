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
  await page.getByRole("link", { name: "Inflação" }).click();
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
  await page.getByRole("link", { name: "Saúde dos dados" }).click();
  await expect(page.getByText("1 falhou na última coleta.")).toBeVisible();
  await page.getByRole("link", { name: /Só com problema/ }).click();
  await expect(page.getByText("FRED HTTP 500")).toBeVisible();
  await page.screenshot({ path: "test-results/dados.png", fullPage: true });
});

test("aba Política Monetária mostra o comunicado do Copom", async ({ page }) => {
  await page.getByRole("link", { name: "Política Monetária" }).click();
  await expect(page.getByText("Copom reduz a taxa Selic para 13,75% a.a.")).toBeVisible();
  await expect(page.getByText("O ambiente externo permanece incerto.")).toBeVisible();
  await page.screenshot({ path: "test-results/politica.png", fullPage: true });
});
