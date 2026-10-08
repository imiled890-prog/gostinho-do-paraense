import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { DEFAULT_CONTENT } from "@/data/default-content";
import { UserError } from "@/lib/errors";
import {
  parseSiteContent,
  parseSiteContentJson,
  withAnnouncement,
  withoutAnnouncement,
  withoutProduct,
  withProduct,
  withProductAvailability,
} from "@/lib/site-content";
import type { Product, SiteContent } from "@/lib/types";

const empty: SiteContent = { version: 1, products: [], announcements: [] };

const tacaca: Product = {
  id: "comida-tacaca",
  name: "Tacacá",
  description: "Prato tradicional",
  priceCents: 2500,
  category: "comida-tipica",
  isAvailable: true,
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("parseSiteContent", () => {
  test("aceita o conteúdo padrão", () => {
    const parsed = parseSiteContent(DEFAULT_CONTENT);
    assert.equal(parsed.products.length, DEFAULT_CONTENT.products.length);
  });

  test("preenche campos opcionais com valores seguros", () => {
    const parsed = parseSiteContent({
      version: 1,
      products: [{ id: "p1", name: "  Açaí  ", priceCents: 1500, category: "acai" }],
      announcements: [{ id: "a1", content: "Aberto" }],
    });

    assert.deepEqual(parsed.products[0], {
      id: "p1",
      name: "Açaí",
      description: "",
      priceCents: 1500,
      category: "acai",
      isAvailable: true,
      createdAt: "",
    });
    assert.equal(parsed.announcements[0].isActive, true);
  });

  test("recusa dados malformados em vez de substituí-los pelo padrão", () => {
    const invalid: unknown[] = [
      { version: 2, products: [], announcements: [] },
      { version: 1, products: "não é lista", announcements: [] },
      { version: 1, products: [{ id: "../x", name: "A", priceCents: 1, category: "bebida" }], announcements: [] },
      { version: 1, products: [{ id: "a", name: "A", priceCents: 1.5, category: "bebida" }], announcements: [] },
      { version: 1, products: [{ id: "a", name: "A", priceCents: -1, category: "bebida" }], announcements: [] },
      { version: 1, products: [{ id: "a", name: "A", priceCents: 1, category: "sobremesa" }], announcements: [] },
      {
        version: 1,
        products: [
          { id: "a", name: "A", priceCents: 1, category: "bebida" },
          { id: "a", name: "B", priceCents: 1, category: "bebida" },
        ],
        announcements: [],
      },
    ];
    for (const value of invalid) {
      assert.throws(() => parseSiteContent(value), UserError, JSON.stringify(value));
    }
  });

  test("JSON inválido vira erro de usuário, não um erro genérico", () => {
    assert.throws(() => parseSiteContentJson("{não é json"), UserError);
  });
});

describe("operações sobre o conteúdo", () => {
  test("adiciona produto e substitui quando o id já existe", () => {
    const added = withProduct(empty, tacaca);
    assert.equal(added.products.length, 1);

    const edited = withProduct(added, { ...tacaca, priceCents: 2700 });
    assert.equal(edited.products.length, 1);
    assert.equal(edited.products[0].priceCents, 2700);
  });

  test("não altera o conteúdo original", () => {
    const before = JSON.stringify(empty);
    withProduct(empty, tacaca);
    withAnnouncement(empty, { id: "a", content: "Oi", isActive: true, createdAt: "" });
    assert.equal(JSON.stringify(empty), before);
  });

  test("altera disponibilidade, remove produto e avisos", () => {
    const withTacaca = withProduct(empty, tacaca);
    const unavailable = withProductAvailability(withTacaca, tacaca.id, false);
    assert.equal(unavailable.products[0].isAvailable, false);
    assert.equal(withoutProduct(unavailable, tacaca.id).products.length, 0);

    const announced = withAnnouncement(empty, { id: "a1", content: "Aviso", isActive: true, createdAt: "" });
    assert.equal(announced.announcements.length, 1);
    assert.equal(withoutAnnouncement(announced, "a1").announcements.length, 0);
  });
});
