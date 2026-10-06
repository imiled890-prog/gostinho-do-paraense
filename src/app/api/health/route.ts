import { readSiteContent } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const content = await readSiteContent();
    return Response.json({
      ok: true,
      storage: process.env.GITHUB_CONTENT_TOKEN ? "github" : "local",
      products: content.products.length,
    });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
