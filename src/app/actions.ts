"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { CATEGORIES } from "@/data/categories";
import { loginAdmin, logoutAdmin, requireAdmin } from "@/lib/auth";
import { toActionError, UserError, type ActionResult } from "@/lib/errors";
import { deleteMedia, readSiteContent, updateSiteContent, uploadMedia } from "@/lib/github";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  detectImageKind,
  type ImageKind,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_LABEL,
  mediaUrl,
} from "@/lib/media";
import { parsePriceToCents } from "@/lib/pricing";
import {
  withAnnouncement,
  withoutAnnouncement,
  withoutProduct,
  withProduct,
  withProductAvailability,
} from "@/lib/site-content";
import type { Product, ProductCategory } from "@/lib/types";

const PRODUCT_ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;
const MAX_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_PRICE_TEXT_LENGTH = 30;
const MAX_ANNOUNCEMENT_LENGTH = 300;
const CATEGORY_IDS = new Set<string>(CATEGORIES.map((category) => category.id));
const NOT_FOUND_MESSAGE = "Produto não encontrado. Atualize a página e tente novamente.";

function readText(formData: FormData, key: string, maxLength: number) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function parseProductForm(formData: FormData) {
  const rawId = readText(formData, "id", 81);
  if (rawId && !PRODUCT_ID_PATTERN.test(rawId)) throw new UserError("Identificador de produto inválido.");

  const name = readText(formData, "name", MAX_NAME_LENGTH);
  const priceText = readText(formData, "price", MAX_PRICE_TEXT_LENGTH);
  const category = readText(formData, "category", 40);
  if (!name || !priceText || !CATEGORY_IDS.has(category)) {
    throw new UserError("Preencha nome, preço e categoria.");
  }

  return {
    id: rawId || randomUUID(),
    isEdit: Boolean(rawId),
    name,
    description: readText(formData, "description", MAX_DESCRIPTION_LENGTH),
    priceCents: parsePriceToCents(priceText),
    category: category as ProductCategory,
    removeImage: formData.get("removeImage") === "true",
  };
}

async function readNewImage(formData: FormData): Promise<{ bytes: Buffer; kind: ImageKind } | null> {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return null;
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) throw new UserError("Use JPG, PNG ou WEBP.");
  if (file.size > MAX_IMAGE_BYTES) throw new UserError(`A imagem deve ter no máximo ${MAX_IMAGE_LABEL}.`);

  const bytes = Buffer.from(await file.arrayBuffer());
  const kind = detectImageKind(bytes);
  if (!kind) throw new UserError("O arquivo enviado não é uma imagem JPG, PNG ou WEBP válida.");
  return { bytes, kind };
}

function logCleanupError(error: unknown) {
  console.error("Não foi possível remover um arquivo de imagem:", error);
}

export async function loginAdminAction(password: string): Promise<{ success: boolean; error?: string }> {
  if (typeof password !== "string" || password.length < 1 || password.length > 200) {
    return { success: false, error: "Código inválido." };
  }
  try {
    const success = await loginAdmin(password);
    return success ? { success: true } : { success: false, error: "Código inválido." };
  } catch (error) {
    console.error("Erro no login administrativo:", error);
    return { success: false, error: "Login indisponível. Verifique a configuração do servidor." };
  }
}

export async function logoutAdminAction() {
  await logoutAdmin();
  revalidatePath("/");
}

export async function getSiteData() {
  const content = await readSiteContent();

  return {
    ...content,
    products: content.products.map((product) => ({
      ...product,
      imageUrl: product.imagePath ? mediaUrl(product.imagePath) : undefined,
    })),
  };
}

export async function saveProduct(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const input = parseProductForm(formData);
    const image = await readNewImage(formData);

    // Cada foto nova ganha um nome único. Assim, o cache de longo prazo do navegador
    // nunca exibe a foto antiga para quem já visitou o site.
    const newImagePath = image ? `content/images/${input.id}-${randomUUID().slice(0, 8)}.${image.kind}` : undefined;
    if (image && newImagePath) {
      await uploadMedia(newImagePath, image.bytes, `update product image: ${input.name}`);
    }

    const outcome: { replacedImagePath?: string } = {};
    try {
      await updateSiteContent((content) => {
        const existing = content.products.find((item) => item.id === input.id);
        if (input.isEdit && !existing) {
          throw new UserError("Este produto não existe mais. Atualize a página e tente novamente.");
        }

        const currentImage = existing?.imagePath;
        const imagePath = newImagePath ?? (input.removeImage ? undefined : currentImage);
        outcome.replacedImagePath = currentImage && currentImage !== imagePath ? currentImage : undefined;

        const product: Product = {
          id: input.id,
          name: input.name,
          description: input.description,
          priceCents: input.priceCents,
          category: input.category,
          ...(imagePath ? { imagePath } : {}),
          isAvailable: existing?.isAvailable ?? true,
          createdAt: existing?.createdAt || new Date().toISOString(),
        };
        return {
          content: withProduct(content, product),
          message: `${existing ? "update" : "add"} product: ${input.name}`,
        };
      });
    } catch (error) {
      // O produto não foi salvo: descarta a imagem recém-enviada para não deixar arquivo órfão.
      if (newImagePath) await deleteMedia(newImagePath, "rollback product image").catch(logCleanupError);
      throw error;
    }

    // A foto antiga só é removida depois que o produto já aponta para a nova (ou para nenhuma).
    if (outcome.replacedImagePath) {
      await deleteMedia(outcome.replacedImagePath, `remove old product image: ${input.name}`).catch(logCleanupError);
    }

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const outcome: { removed?: Product } = {};
    await updateSiteContent((content) => {
      const product = content.products.find((item) => item.id === id);
      outcome.removed = product;
      if (!product) return null;
      return { content: withoutProduct(content, id), message: `delete product: ${product.name}` };
    });

    if (!outcome.removed) throw new UserError(NOT_FOUND_MESSAGE);
    if (outcome.removed.imagePath) {
      await deleteMedia(outcome.removed.imagePath, `delete product image: ${outcome.removed.name}`).catch(
        logCleanupError,
      );
    }

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function setProductAvailability(id: string, isAvailable: boolean): Promise<ActionResult> {
  try {
    await requireAdmin();
    const outcome: { found: boolean } = { found: false };
    await updateSiteContent((content) => {
      const product = content.products.find((item) => item.id === id);
      outcome.found = Boolean(product);
      if (!product) return null;
      return {
        content: withProductAvailability(content, id, Boolean(isAvailable)),
        message: `${isAvailable ? "enable" : "disable"} product: ${product.name}`,
      };
    });

    if (!outcome.found) throw new UserError(NOT_FOUND_MESSAGE);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function addAnnouncement(text: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const message = typeof text === "string" ? text.trim().slice(0, MAX_ANNOUNCEMENT_LENGTH) : "";
    if (!message) throw new UserError("O aviso não pode ficar vazio.");

    await updateSiteContent((current) => ({
      content: withAnnouncement(current, {
        id: randomUUID(),
        content: message,
        isActive: true,
        createdAt: new Date().toISOString(),
      }),
      message: "add announcement",
    }));

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await updateSiteContent((current) => {
      if (!current.announcements.some((item) => item.id === id)) return null;
      return { content: withoutAnnouncement(current, id), message: "delete announcement" };
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}
