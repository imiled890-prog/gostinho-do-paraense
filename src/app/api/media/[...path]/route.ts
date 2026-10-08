import { readMedia } from "@/lib/github";
import { isSafeMediaPath, mediaContentType } from "@/lib/media";

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  const filePath = segments.join("/");

  const contentType = mediaContentType(filePath);
  if (!isSafeMediaPath(filePath) || !contentType) return notFound();

  const data = await readMedia(filePath);
  if (!data) return notFound();

  // Os nomes das imagens são únicos a cada upload, então a versão do arquivo nunca muda.
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

function notFound() {
  return new Response("Imagem não encontrada", { status: 404 });
}
