import assert from "node:assert/strict";
import { afterEach, before, beforeEach, describe, mock, test } from "node:test";
import { createSessionToken } from "@/lib/session";
import { MAX_IMAGE_BYTES } from "@/lib/media";

// As Server Actions usam next/headers (cookies) e next/cache. Aqui eles são substituídos,
// e o GitHub é simulado em memória para verificar a ordem das gravações e os rollbacks.

const ADMIN_PASSWORD = "senha-de-teste";
const SESSION_COOKIE = "gostinho_admin";
const TEST_ENV = {
  ADMIN_PASSWORD,
  GITHUB_CONTENT_TOKEN: "token-de-teste",
  GITHUB_OWNER: "dono",
  GITHUB_REPO: "repo",
  GITHUB_BRANCH: "main",
};

const cookieJar = new Map<string, string>();
let lastCookieOptions: Record<string, unknown> | undefined;

mock.module("next/cache", { namedExports: { revalidatePath: () => undefined } });
mock.module("next/headers", {
  namedExports: {
    cookies: async () => ({
      get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name) } : undefined),
      set: (name: string, value: string, options?: Record<string, unknown>) => {
        cookieJar.set(name, value);
        lastCookieOptions = options;
      },
      delete: (name: string) => {
        cookieJar.delete(name);
      },
    }),
  },
});

// Importado depois de registrar os mocks acima (o arquivo é CJS, então sem await no topo).
let actions: typeof import("@/app/actions");
before(async () => {
  actions = await import("@/app/actions");
});

class FakeGitHub {
  private files = new Map<string, { sha: string; data: Buffer }>();
  private failures: { method: string; path: string; status: number }[] = [];
  private shaCounter = 0;
  /** Gravações (PUT/DELETE) na ordem em que aconteceram. */
  readonly writes: { method: string; path: string }[] = [];

  put(filePath: string, data: Buffer) {
    this.files.set(filePath, { sha: this.nextSha(), data });
  }

  has(filePath: string) {
    return this.files.has(filePath);
  }

  read(filePath: string) {
    return this.files.get(filePath)?.data;
  }

  images() {
    return [...this.files.keys()].filter((filePath) => filePath.startsWith("content/images/"));
  }

  failOnce(method: string, filePath: string, status: number) {
    this.failures.push({ method, path: filePath, status });
  }

  private nextSha() {
    this.shaCounter += 1;
    return `sha-${this.shaCounter}`;
  }

  async handle(input: string, init: RequestInit = {}): Promise<Response> {
    const url = new URL(input);
    const filePath = decodeURIComponent(url.pathname.replace("/repos/dono/repo/contents/", ""));
    const method = init.method ?? "GET";

    if (method !== "GET") this.writes.push({ method, path: filePath });

    const failureIndex = this.failures.findIndex((item) => item.method === method && item.path === filePath);
    if (failureIndex >= 0) {
      const [failure] = this.failures.splice(failureIndex, 1);
      return new Response("falha simulada", { status: failure.status });
    }

    if (method === "GET") {
      const file = this.files.get(filePath);
      if (!file) return new Response('{"message":"Not Found"}', { status: 404 });
      const accept = (init.headers as Record<string, string> | undefined)?.Accept;
      if (accept === "application/vnd.github.raw+json") return new Response(new Uint8Array(file.data), { status: 200 });
      return Response.json({ type: "file", sha: file.sha, encoding: "base64", content: file.data.toString("base64") });
    }

    const body = JSON.parse(String(init.body)) as { sha?: string; content?: string };
    const existing = this.files.get(filePath);

    if (method === "PUT") {
      if (existing && body.sha !== existing.sha) return new Response('{"message":"conflict"}', { status: 409 });
      if (!existing && body.sha) return new Response('{"message":"sha inválido"}', { status: 422 });
      const sha = this.nextSha();
      this.files.set(filePath, { sha, data: Buffer.from(body.content ?? "", "base64") });
      return Response.json({ content: { sha } }, { status: existing ? 200 : 201 });
    }

    if (method === "DELETE") {
      if (!existing) return new Response('{"message":"Not Found"}', { status: 404 });
      if (body.sha !== existing.sha) return new Response('{"message":"conflict"}', { status: 409 });
      this.files.delete(filePath);
      return Response.json({ content: null });
    }

    return new Response("método não suportado", { status: 405 });
  }
}

let repo: FakeGitHub;
const originalFetch = globalThis.fetch;
const savedEnv: Record<string, string | undefined> = {};

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 1)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(200, 2)]);

beforeEach(() => {
  repo = new FakeGitHub();
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) =>
    repo.handle(String(input), init)) as typeof fetch;
  cookieJar.clear();
  lastCookieOptions = undefined;
  for (const [key, value] of Object.entries(TEST_ENV)) {
    savedEnv[key] = process.env[key];
    process.env[key] = value;
  }
  delete process.env.ADMIN_SESSION_SECRET;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of Object.keys(TEST_ENV)) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

function loginAsAdmin() {
  cookieJar.set(SESSION_COOKIE, createSessionToken(ADMIN_PASSWORD));
}

function productForm(fields: Record<string, string>, image?: { bytes: Buffer; type: string; name?: string }) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  if (image) form.set("image", new File([new Uint8Array(image.bytes)], image.name ?? "foto.jpg", { type: image.type }));
  return form;
}

const newProduct = { name: "Produto de teste", price: "12.50", category: "comida-tipica", description: "Caldo de tucupi" };

interface StoredProduct {
  id: string;
  name: string;
  priceCents: number;
  imagePath?: string;
  isAvailable?: boolean;
}

function siteJson(): { products: StoredProduct[]; announcements: { id: string; content: string }[] } | undefined {
  const data = repo.read("content/site.json");
  return data ? JSON.parse(data.toString("utf8")) : undefined;
}

// O cardápio padrão é gravado junto no primeiro salvamento. O nome de teste não existe nele, então a busca é exata.
function testProduct(): StoredProduct {
  return siteJson()!.products.find((item) => item.name === "Produto de teste")!;
}

describe("saveProduct", () => {
  test("exige sessão de administrador e não grava nada sem ela", async () => {
    const result = await actions.saveProduct(productForm(newProduct));
    assert.equal(result.success, false);
    assert.equal(repo.writes.length, 0);
  });

  test("salva produto novo com preço digitado com ponto (regressão de 12.50)", async () => {
    loginAsAdmin();
    const result = await actions.saveProduct(productForm(newProduct));

    assert.deepEqual(result, { success: true });
    const product = testProduct();
    assert.equal(product.name, "Produto de teste");
    assert.equal(product.priceCents, 1250);
  });

  test("recusa preço inválido com mensagem clara e sem gravar", async () => {
    loginAsAdmin();
    const result = await actions.saveProduct(productForm({ ...newProduct, price: "abc" }));

    assert.equal(result.success, false);
    assert.match(result.success ? "" : result.error, /Preço inválido/);
    assert.equal(repo.writes.length, 0);
  });

  test("envia a foto com nome único e aponta o produto para ela", async () => {
    loginAsAdmin();
    const result = await actions.saveProduct(productForm(newProduct, { bytes: JPEG, type: "image/jpeg" }));

    assert.equal(result.success, true);
    const [imagePath] = repo.images();
    assert.match(imagePath, /^content\/images\/[a-z0-9-]+-[0-9a-f]{8}\.jpg$/);
    assert.deepEqual(repo.read(imagePath), JPEG);
    assert.equal(testProduct().imagePath, imagePath);
  });

  test("ao trocar a foto, grava o produto antes de remover a foto antiga", async () => {
    loginAsAdmin();
    await actions.saveProduct(productForm(newProduct, { bytes: JPEG, type: "image/jpeg" }));
    const [oldImage] = repo.images();
    const id = testProduct().id;

    repo.writes.length = 0;
    const result = await actions.saveProduct(
      productForm({ ...newProduct, id, price: "13,00" }, { bytes: PNG, type: "image/png", name: "nova.png" }),
    );

    assert.equal(result.success, true);
    const siteWrite = repo.writes.findIndex((write) => write.path === "content/site.json");
    const oldImageDelete = repo.writes.findIndex((write) => write.path === oldImage);
    assert.ok(siteWrite >= 0 && oldImageDelete > siteWrite, "o JSON deve ser gravado antes da exclusão da foto antiga");
    assert.equal(repo.has(oldImage), false);
    assert.equal(repo.images().length, 1);
    assert.equal(testProduct().priceCents, 1300);
  });

  test("remove a foto quando o administrador pede", async () => {
    loginAsAdmin();
    await actions.saveProduct(productForm(newProduct, { bytes: JPEG, type: "image/jpeg" }));
    const id = testProduct().id;

    const result = await actions.saveProduct(productForm({ ...newProduct, id, removeImage: "true" }));
    assert.equal(result.success, true);
    assert.equal(testProduct().imagePath, undefined);
    assert.equal(repo.images().length, 0);
  });

  test("recusa arquivo que não é imagem, mesmo com tipo image/jpeg", async () => {
    loginAsAdmin();
    const html = Buffer.from("<html><script>alert(1)</script></html>");
    const result = await actions.saveProduct(productForm(newProduct, { bytes: html, type: "image/jpeg" }));

    assert.equal(result.success, false);
    assert.match(result.success ? "" : result.error, /não é uma imagem/);
    assert.equal(repo.writes.length, 0);
  });

  test("recusa imagem acima do limite de 900 KB", async () => {
    loginAsAdmin();
    const big = Buffer.concat([JPEG, Buffer.alloc(MAX_IMAGE_BYTES)]);
    const result = await actions.saveProduct(productForm(newProduct, { bytes: big, type: "image/jpeg" }));

    assert.equal(result.success, false);
    assert.match(result.success ? "" : result.error, /900 KB/);
    assert.equal(repo.writes.length, 0);
  });

  test("não sobrescreve um site.json inválido (antes, era trocado pelo conteúdo padrão)", async () => {
    loginAsAdmin();
    const broken = Buffer.from("{ isto não é json");
    repo.put("content/site.json", broken);

    const result = await actions.saveProduct(productForm(newProduct));
    assert.equal(result.success, false);
    assert.match(result.success ? "" : result.error, /não é um JSON válido/);
    assert.deepEqual(repo.read("content/site.json"), broken);
    assert.equal(repo.writes.length, 0);
  });

  test("desfaz a foto enviada quando o produto não pode ser salvo", async () => {
    loginAsAdmin();
    repo.failOnce("PUT", "content/site.json", 500);

    const result = await actions.saveProduct(productForm(newProduct, { bytes: JPEG, type: "image/jpeg" }));
    assert.equal(result.success, false);
    assert.equal(repo.images().length, 0, "a foto órfã deve ser removida");
  });

  test("não recria um produto que outra pessoa já excluiu", async () => {
    loginAsAdmin();
    repo.put("content/site.json", Buffer.from(JSON.stringify({ version: 1, products: [], announcements: [] })));

    const result = await actions.saveProduct(
      productForm({ ...newProduct, id: "removido-por-outro" }, { bytes: JPEG, type: "image/jpeg" }),
    );
    assert.equal(result.success, false);
    assert.match(result.success ? "" : result.error, /não existe mais/);
    assert.equal(repo.images().length, 0);
    assert.equal(siteJson()!.products.length, 0);
  });
});

describe("deleteProduct e disponibilidade", () => {
  test("exclui o produto e a foto dele", async () => {
    loginAsAdmin();
    await actions.saveProduct(productForm(newProduct, { bytes: JPEG, type: "image/jpeg" }));
    const id = testProduct().id;

    const result = await actions.deleteProduct(id);
    assert.equal(result.success, true);
    assert.equal(siteJson()!.products.some((item) => item.id === id), false);
    assert.equal(repo.images().length, 0);
  });

  test("informa quando o produto a excluir não existe", async () => {
    loginAsAdmin();
    repo.put("content/site.json", Buffer.from(JSON.stringify({ version: 1, products: [], announcements: [] })));

    const result = await actions.deleteProduct("inexistente");
    assert.equal(result.success, false);
    assert.equal(repo.writes.length, 0);
  });

  test("alterna a disponibilidade sem perder os outros campos", async () => {
    loginAsAdmin();
    await actions.saveProduct(productForm(newProduct));
    const id = testProduct().id;

    const result = await actions.setProductAvailability(id, false);
    assert.equal(result.success, true);
    const product = testProduct();
    assert.equal(product.isAvailable, false);
    assert.equal(product.name, "Produto de teste");
  });
});

describe("avisos", () => {
  test("adiciona e remove um aviso; rejeita aviso vazio", async () => {
    loginAsAdmin();
    assert.equal((await actions.addAnnouncement("   ")).success, false);

    assert.equal((await actions.addAnnouncement("Hoje abrimos às 18h")).success, true);
    const announcements = JSON.parse(repo.read("content/site.json")!.toString("utf8")).announcements;
    assert.equal(announcements.length, 1);
    assert.equal(announcements[0].content, "Hoje abrimos às 18h");

    assert.equal((await actions.deleteAnnouncement(announcements[0].id)).success, true);
    assert.equal(JSON.parse(repo.read("content/site.json")!.toString("utf8")).announcements.length, 0);
  });
});

describe("login administrativo", () => {
  test("senha errada não cria sessão", async () => {
    const result = await actions.loginAdminAction("errada");
    assert.deepEqual(result, { success: false, error: "Código inválido." });
    assert.equal(cookieJar.has(SESSION_COOKIE), false);
  });

  test("senha certa cria cookie httpOnly com SameSite=Lax", async () => {
    const result = await actions.loginAdminAction(ADMIN_PASSWORD);
    assert.deepEqual(result, { success: true });
    assert.equal(typeof cookieJar.get(SESSION_COOKIE), "string");
    assert.equal(lastCookieOptions?.httpOnly, true);
    assert.equal(lastCookieOptions?.sameSite, "lax");
  });
});
