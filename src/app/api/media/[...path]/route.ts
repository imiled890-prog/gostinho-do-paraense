import { readMedia } from "@/lib/github";

const contentTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const filePath = path.join("/").replace(/^\/+/, "");
  const buffer = await readMedia(filePath);

  if (!buffer) return new Response("Imagem não encontrada", { status: 404 });

  const extension = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentTypes[extension] || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
