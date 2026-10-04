import { expect, it } from "vitest";
import { duracao, fmtData, fmtMomento, fmtNumero } from "@/lib/formato";

it("formata números e datas no padrão brasileiro", () => {
  expect(fmtNumero(1234.5)).toBe("1.234,50");
  expect(fmtData("2026-08-01")).toBe("ago/2026");
  expect(fmtData("2026-04-01", "Trimestral")).toBe("2º tri/2026");
  expect(fmtData("2026-10-02", "Diária")).toBe("02/10/2026");
  expect(fmtData("2026-08-01", "Mensal (trim. móvel)")).toBe("ago/2026");
  expect(fmtMomento("2026-10-05T12:47:00Z")).toBe("05/10, 09:47");
});

it("duração legível", () => {
  expect(duracao(0.3)).toBe("menos de 1 mês");
  expect(duracao(5)).toBe("5 meses");
  expect(duracao(14.2)).toBe("1 ano e 2 meses");
  expect(duracao(24)).toBe("2 anos");
});
