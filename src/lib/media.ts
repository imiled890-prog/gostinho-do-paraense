// Funções puras de imagens. Não importam módulos do Node, então podem ser usadas no navegador.

export const MAX_IMAGE_BYTES = 900 * 1024;
export const MAX_IMAGE_LABEL = `${MAX_IMAGE_BYTES / 1024} KB`;
export const ALLOWED_IMAGE_MIME_TYPES: readonly string[] = ["image/jpeg", "image/png", "image/webp"];

export type ImageKind = "jpg" | "png" | "webp";

// Caminhos aceitos: content/images/<id>-<sufixo>.<ext>, sem barras, pontos extras ou espaços.
const SAFE_MEDIA_PATH = /^content\/images\/[A-Za-z0-9_-]{1,160}\.(?:jpe?g|png|webp)$/i;

const CONTENT_TYPES = new Map<string, string>([
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
  ["webp", "image/webp"],
]);

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function isSafeMediaPath(filePath: string): boolean {
  return SAFE_MEDIA_PATH.test(filePath);
}

export function mediaContentType(filePath: string): string | null {
  const extension = filePath.slice(filePath.lastIndexOf(".") + 1).toLowerCase();
  return CONTENT_TYPES.get(extension) ?? null;
}

/** Identifica o formato real pelos primeiros bytes; o tipo enviado pelo navegador não é confiável. */
export function detectImageKind(bytes: Uint8Array): ImageKind | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes.length >= 8 && PNG_SIGNATURE.every((byte, index) => bytes[index] === byte)) return "png";
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "webp";
  return null;
}

export function mediaUrl(filePath: string): string {
  return `/api/media/${filePath.split("/").map(encodeURIComponent).join("/")}`;
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.subarray(start, end));
}
