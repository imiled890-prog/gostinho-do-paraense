"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { loginAdmin, logoutAdmin, requireAdmin } from "@/lib/auth";
import { DEFAULT_CONTENT } from "@/data/default-content";
import { deleteMedia, mediaUrl, readSiteContent, uploadMedia, writeSiteContent } from "@/lib/github";
import { parsePriceToCents } from "@/lib/pricing";
import type { Product, ProductCategory, SiteContent } from "@/lib/types";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_CATEGORIES = new Set<ProductCategory>([
  "hamburguer",
  "comida-tipica",
  "porcao",
  "acai",
  "bebida",
  "novo",
]);

function cleanText(value: FormDataEntryValue | null, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function getFileExtension(file: File) {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return map[file.type] || "bin";
}

function ensureContentShape(content: SiteContent): SiteContent {
  if (!content || content.version !== 1 || !Array.isArray(content.products) || !Array.isArray(content.announcements)) {
    return DEFAULT_CONTENT;
  }
  return content;
}

export async function loginAdminAction(password: string) {
  if (typeof password !== "string" || password.length < 1 || password.length > 200) {
    return { success: false };
  }
  try {
    return { success: await loginAdmin(password) };
  } catch (error) {
    console.error("Admin login error:", error);
    return { success: false };
  }
}

export async function logoutAdminAction() {
  await logoutAdmin();
  revalidatePath("/");
}

export async function getSiteData() {
  const raw = await readSiteContent();
  const content = ensureContentShape(raw);

  return {
    ...content,
    products: content.products.map((product) => ({
      ...product,
      imageUrl: product.imagePath ? mediaUrl(product.imagePath) : undefined,
    })),
  };
}

export async function saveProduct(formData: FormData) {
  await requireAdmin();

  const rawId = cleanText(formData.get("id"), 80);
  if (rawId && !/^[A-Za-z0-9_-]+$/.test(rawId)) {
    throw new Error("Identificador de produto inválido.");
  }
  const id = rawId || randomUUID();
  const name = cleanText(formData.get("name"), 120);
  const description = cleanText(formData.get("description"), 500);
  const priceText = cleanText(formData.get("price"), 30);
  const category = cleanText(formData.get("category"), 40) as ProductCategory;
  const removeImage = String(formData.get("removeImage") ?? "false") === "true";
  const fileValue = formData.get("image");

  if (!name || !priceText || !ALLOWED_CATEGORIES.has(category)) {
    throw new Error("Preencha nome, preço e categoria.");
  }

  const priceCents = parsePriceToCents(priceText);
  const content = ensureContentShape(await readSiteContent());
  const existing = content.products.find((item) => item.id === id);

  let imagePath = existing?.imagePath;
  if (removeImage && imagePath) {
    await deleteMedia(imagePath, `remove product image: ${name}`);
    imagePath = undefined;
  }

  if (fileValue instanceof File && fileValue.size > 0) {
    if (!ALLOWED_IMAGE_TYPES.has(fileValue.type)) {
      throw new Error("Use JPG, PNG ou WEBP.");
    }
    if (fileValue.size > MAX_IMAGE_BYTES) {
      throw new Error("A imagem deve ter no máximo 3 MB.");
    }

    const extension = getFileExtension(fileValue);
    const previousImagePath = imagePath;
    imagePath = `content/images/${id}.${extension}`;
    const buffer = Buffer.from(await fileValue.arrayBuffer());
    await uploadMedia(imagePath, buffer, `update product image: ${name}`);
    if (previousImagePath && previousImagePath !== imagePath) {
      await deleteMedia(previousImagePath, `remove old product image: ${name}`);
    }
  }

  const product: Product = {
    id,
    name,
    description,
    priceCents,
    category,
    imagePath,
    isAvailable: existing?.isAvailable ?? true,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };

  const products = existing
    ? content.products.map((item) => (item.id === id ? product : item))
    : [...content.products, product];

  await writeSiteContent(
    { ...content, version: 1, products },
    `${existing ? "update" : "add"} product: ${name}`,
  );

  revalidatePath("/");
  return { success: true };
}

export async function deleteProduct(id: string) {
  await requireAdmin();
  const content = ensureContentShape(await readSiteContent());
  const existing = content.products.find((item) => item.id === id);
  if (!existing) return { success: false };

  if (existing.imagePath) {
    await deleteMedia(existing.imagePath, `delete product image: ${existing.name}`);
  }

  await writeSiteContent(
    { ...content, products: content.products.filter((item) => item.id !== id) },
    `delete product: ${existing.name}`,
  );
  revalidatePath("/");
  return { success: true };
}

export async function setProductAvailability(id: string, isAvailable: boolean) {
  await requireAdmin();
  const content = ensureContentShape(await readSiteContent());
  const product = content.products.find((item) => item.id === id);
  if (!product) return { success: false };

  const products = content.products.map((item) =>
    item.id === id ? { ...item, isAvailable: Boolean(isAvailable) } : item,
  );

  await writeSiteContent(
    { ...content, products },
    `${isAvailable ? "enable" : "disable"} product: ${product.name}`,
  );
  revalidatePath("/");
  return { success: true };
}

export async function addAnnouncement(contentText: string) {
  await requireAdmin();
  const content = ensureContentShape(await readSiteContent());
  const text = String(contentText ?? "").trim().slice(0, 300);
  if (!text) throw new Error("O aviso não pode ficar vazio.");

  await writeSiteContent(
    {
      ...content,
      announcements: [
        ...content.announcements,
        {
          id: randomUUID(),
          content: text,
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      ],
    },
    "add announcement",
  );
  revalidatePath("/");
}

export async function deleteAnnouncement(id: string) {
  await requireAdmin();
  const content = ensureContentShape(await readSiteContent());
  await writeSiteContent(
    { ...content, announcements: content.announcements.filter((item) => item.id !== id) },
    "delete announcement",
  );
  revalidatePath("/");
}
