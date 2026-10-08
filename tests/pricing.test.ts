import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { UserError } from "@/lib/errors";
import { formatPriceInput, parsePriceToCents } from "@/lib/pricing";

describe("parsePriceToCents", () => {
  test("aceita vírgula como separador decimal (padrão brasileiro)", () => {
    assert.equal(parsePriceToCents("25,00"), 2500);
    assert.equal(parsePriceToCents("25,5"), 2550);
    assert.equal(parsePriceToCents("0,50"), 50);
  });

  test("aceita ponto como agrupador de milhar", () => {
    assert.equal(parsePriceToCents("1.250,50"), 125050);
    assert.equal(parsePriceToCents("1.250"), 125000);
  });

  test("aceita ponto como separador decimal (regressão: 12.50 virava R$ 1.250,00)", () => {
    assert.equal(parsePriceToCents("12.50"), 1250);
    assert.equal(parsePriceToCents("10.90"), 1090);
    assert.equal(parsePriceToCents("1.5"), 150);
  });

  test("ignora o símbolo R$ e espaços", () => {
    assert.equal(parsePriceToCents("R$ 12,90"), 1290);
    assert.equal(parsePriceToCents("  12 "), 1200);
  });

  test("recusa formatos inválidos ou ambíguos", () => {
    for (const value of ["", "abc", "-5", "1,000.50", "12,345", "1.2345", "1e3"]) {
      assert.throws(() => parsePriceToCents(value), UserError, `deveria recusar "${value}"`);
    }
  });

  test("respeita o limite máximo de R$ 10.000,00", () => {
    assert.equal(parsePriceToCents("10.000"), 1_000_000);
    assert.throws(() => parsePriceToCents("10.000,01"), UserError);
  });
});

describe("formatPriceInput", () => {
  test("gera um texto que é lido de volta no mesmo valor", () => {
    for (const cents of [0, 5, 1250, 125050, 1_000_000]) {
      assert.equal(parsePriceToCents(formatPriceInput(cents)), cents);
    }
  });
});
