import { defineConfig } from "@playwright/test";

// Dois servidores do mesmo build: um configurado e um sem configuração de acesso
// (para provar a falha fechada). Credenciais só de teste, sem relação com as reais.
export const SENHA_TESTE = "senha-de-teste-123";
const HASH_TESTE = "$2b$10$5/wlbtpVuvz9q4x3jSlVOOSDP3A2EsKgf7bsvjKvab8fuN246ZfZC";
const SEGREDO_TESTE = "segredo-de-teste-".padEnd(48, "x");

export default defineConfig({
  testDir: "e2e",
  use: { launchOptions: { executablePath: process.env.PW_CHROMIUM || undefined } },
  webServer: [
    {
      command: "npx next start -p 3100",
      port: 3100,
      reuseExistingServer: false,
      env: { AUTH_SECRET: SEGREDO_TESTE, ARGUS_SENHA_HASH: HASH_TESTE },
    },
    { command: "npx next start -p 3101", port: 3101, reuseExistingServer: false,
      env: { AUTH_SECRET: "", ARGUS_SENHA_HASH: "" } },
  ],
});
