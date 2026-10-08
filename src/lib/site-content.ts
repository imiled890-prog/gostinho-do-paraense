import { CATEGORIES } from "@/data/categories";
import { UserError } from "@/lib/errors";
import type { Announcement, Product, ProductCategory, SiteContent } from "@/lib/types";

const PRODUCT_ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;
const CATEGORY_IDS = new Set<string>(CATEGORIES.map((category) => category.id));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Lê o JSON do site e valida a estrutura.
 *
 * Um arquivo fora do formato gera erro: nunca é substituído pelo conteúdo padrão,
 * porque isso apagaria os dados reais na próxima gravação.
 */
export function parseSiteContentJson(text: string): SiteContent {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new UserError("content/site.json não é um JSON válido.");
  }
  return parseSiteContent(raw);
}

export function parseSiteContent(raw: unknown): SiteContent {
  if (!isRecord(raw) || raw.version !== 1 || !Array.isArray(raw.products) || !Array.isArray(raw.announcements)) {
    throw new UserError(
      "content/site.json está em um formato inesperado (esperado: version 1, com products e announcements).",
    );
  }

  const products = raw.products.map((item, index) => parseProduct(item, index));
  const ids = new Set<string>();
  for (const product of products) {
    if (ids.has(product.id)) {
      throw new UserError(`content/site.json tem o identificador de produto repetido: ${product.id}.`);
    }
    ids.add(product.id);
  }

  const announcements = raw.announcements.map((item, index) => parseAnnouncement(item, index));
  return { version: 1, products, announcements };
}

function parseProduct(value: unknown, index: number): Product {
  const label = `produto #${index + 1}`;
  if (!isRecord(value)) throw invalidField(label, "(registro)");

  const { id, name, priceCents, category } = value;
  if (typeof id !== "string" || !PRODUCT_ID_PATTERN.test(id)) throw invalidField(label, "id");
  if (typeof name !== "string" || !name.trim()) throw invalidField(label, "name");
  if (typeof priceCents !== "number" || !Number.isSafeInteger(priceCents) || priceCents < 0) {
    throw invalidField(label, "priceCents");
  }
  if (typeof category !== "string" || !CATEGORY_IDS.has(category)) throw invalidField(label, "category");

  return {
    id,
    name: name.trim(),
    description: typeof value.description === "string" ? value.description : "",
    priceCents,
    category: category as ProductCategory,
    ...(typeof value.imagePath === "string" && value.imagePath ? { imagePath: value.imagePath } : {}),
    isAvailable: typeof value.isAvailable === "boolean" ? value.isAvailable : true,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : "",
  };
}

function parseAnnouncement(value: unknown, index: number): Announcement {
  const label = `aviso #${index + 1}`;
  if (!isRecord(value)) throw invalidField(label, "(registro)");
  if (typeof value.id !== "string" || !value.id) throw invalidField(label, "id");
  if (typeof value.content !== "string") throw invalidField(label, "content");

  return {
    id: value.id,
    content: value.content,
    isActive: typeof value.isActive === "boolean" ? value.isActive : true,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : "",
  };
}

function invalidField(label: string, field: string) {
  return new UserError(`content/site.json: ${label} tem o campo "${field}" inválido.`);
}

// Operações puras: devolvem um novo conteúdo sem alterar o original.

export function withProduct(content: SiteContent, product: Product): SiteContent {
  const exists = content.products.some((item) => item.id === product.id);
  return {
    ...content,
    products: exists
      ? content.products.map((item) => (item.id === product.id ? product : item))
      : [...content.products, product],
  };
}

export function withoutProduct(content: SiteContent, id: string): SiteContent {
  return { ...content, products: content.products.filter((item) => item.id !== id) };
}

export function withProductAvailability(content: SiteContent, id: string, isAvailable: boolean): SiteContent {
  return {
    ...content,
    products: content.products.map((item) => (item.id === id ? { ...item, isAvailable } : item)),
  };
}

export function withAnnouncement(content: SiteContent, announcement: Announcement): SiteContent {
  return { ...content, announcements: [...content.announcements, announcement] };
}

export function withoutAnnouncement(content: SiteContent, id: string): SiteContent {
  return { ...content, announcements: content.announcements.filter((item) => item.id !== id) };
}
