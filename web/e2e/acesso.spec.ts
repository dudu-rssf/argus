import { expect, test } from "@playwright/test";
import { SENHA_TESTE } from "../playwright.config";

const CONFIGURADO = "http://localhost:3100";
const SEM_CONFIG = "http://localhost:3101";

test("sem configuração de acesso, nada abre (falha fechada)", async ({ page, request }) => {
  await page.goto(SEM_CONFIG + "/");
  await expect(page).toHaveURL(SEM_CONFIG + "/configurar");
  await expect(page.getByRole("heading", { name: /não está configurado/ })).toBeVisible();
  await page.goto(SEM_CONFIG + "/login");
  await expect(page).toHaveURL(SEM_CONFIG + "/configurar");
  expect((await request.get(SEM_CONFIG + "/api/atualizar")).status()).toBe(503);
  await page.screenshot({ path: "test-results/configurar.png", fullPage: true });
});

test("senha errada não entra; senha certa entra e volta ao destino", async ({ page }) => {
  await page.goto(CONFIGURADO + "/dados");
  await expect(page).toHaveURL(/\/login\?de=%2Fdados/);
  await page.screenshot({ path: "test-results/login.png" });
  await page.getByLabel("Senha").fill("errada");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Senha incorreta.")).toBeVisible();
  await page.getByLabel("Senha").fill(SENHA_TESTE);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(CONFIGURADO + "/dados");
});

test("depois de sair, as páginas voltam a pedir senha", async ({ page }) => {
  await page.goto(CONFIGURADO + "/login");
  await page.getByLabel("Senha").fill(SENHA_TESTE);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(CONFIGURADO + "/");
  await page.screenshot({ path: "test-results/central.png", fullPage: true });
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(CONFIGURADO + "/login");
  await page.goto(CONFIGURADO + "/");
  await expect(page).toHaveURL(/\/login/);
});
