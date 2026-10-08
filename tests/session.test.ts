import assert from "node:assert/strict";
import { test } from "node:test";
import { createSessionToken, passwordMatches, SESSION_MAX_AGE_SECONDS, verifySessionToken } from "@/lib/session";

const NOW = 1_000_000;

test("aceita o token dentro do prazo e com o segredo correto", () => {
  const token = createSessionToken("segredo", NOW);
  assert.equal(verifySessionToken(token, "segredo", NOW + 1000), true);
});

test("expira depois do prazo de sete dias", () => {
  const token = createSessionToken("segredo", NOW);
  assert.equal(verifySessionToken(token, "segredo", NOW + SESSION_MAX_AGE_SECONDS * 1000 - 1), true);
  assert.equal(verifySessionToken(token, "segredo", NOW + SESSION_MAX_AGE_SECONDS * 1000), false);
});

test("rejeita token adulterado, de outro segredo ou malformado", () => {
  const token = createSessionToken("segredo", NOW);
  const [expiresAt, signature] = token.split(".");

  // Estender o prazo sem refazer a assinatura.
  assert.equal(verifySessionToken(`${Number(expiresAt) + 999_999}.${signature}`, "segredo", NOW), false);
  assert.equal(verifySessionToken(token, "outro-segredo", NOW), false);
  assert.equal(verifySessionToken(`${expiresAt}.${signature}.extra`, "segredo", NOW), false);
  assert.equal(verifySessionToken(`abc.${signature}`, "segredo", NOW), false);
  assert.equal(verifySessionToken(`${expiresAt}.`, "segredo", NOW), false);
  assert.equal(verifySessionToken(undefined, "segredo", NOW), false);
  assert.equal(verifySessionToken("", "segredo", NOW), false);
});

test("compara senhas sem depender do tamanho", () => {
  assert.equal(passwordMatches("abc", "abc"), true);
  assert.equal(passwordMatches("abcd", "abc"), false);
  assert.equal(passwordMatches("", "abc"), false);
  assert.equal(passwordMatches("Abc", "abc"), false);
});
