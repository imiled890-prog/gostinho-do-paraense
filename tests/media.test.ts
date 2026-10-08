import assert from "node:assert/strict";
import { test } from "node:test";
import { detectImageKind, isSafeMediaPath, mediaContentType, mediaUrl } from "@/lib/media";

test("aceita apenas imagens dentro de content/images", () => {
  assert.equal(isSafeMediaPath("content/images/hamburguer-x-salada-1a2b3c4d.jpg"), true);
  assert.equal(isSafeMediaPath("content/images/comida-manicoba.PNG"), true);

  const rejected = [
    "content/site.json",
    "content/images/../site.json",
    "content/images/a/b.jpg",
    "content/images/a b.jpg",
    "content/images/x.exe",
    "content/images/?x.jpg",
    "content/images/%2e%2e.jpg",
    "content/images/.jpg",
    "/etc/passwd",
  ];
  for (const filePath of rejected) {
    assert.equal(isSafeMediaPath(filePath), false, filePath);
  }
});

test("identifica o formato real pelos primeiros bytes", () => {
  assert.equal(detectImageKind(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])), "jpg");
  assert.equal(detectImageKind(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])), "png");
  const webp = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  assert.equal(detectImageKind(webp), "webp");

  // Um HTML renomeado para .jpg não pode passar como imagem.
  assert.equal(detectImageKind(new TextEncoder().encode("<html><script>alert(1)</script>")), null);
  assert.equal(detectImageKind(new Uint8Array(0)), null);
});

test("mapeia extensões para tipos MIME e gera URLs codificadas", () => {
  assert.equal(mediaContentType("content/images/x.webp"), "image/webp");
  assert.equal(mediaContentType("content/images/x.JPEG"), "image/jpeg");
  assert.equal(mediaContentType("content/images/x.gif"), null);
  assert.equal(mediaContentType("content/images/semextensao"), null);
  // Nomes de propriedades do objeto JavaScript não podem ser confundidos com extensões.
  assert.equal(mediaContentType("content/images/x.constructor"), null);
  assert.equal(mediaContentType("content/images/x.__proto__"), null);
  assert.equal(mediaUrl("content/images/a b.jpg"), "/api/media/content/images/a%20b.jpg");
});
