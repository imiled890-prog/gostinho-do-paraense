import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { DEFAULT_CONTENT } from "@/data/default-content";
import { UserError } from "@/lib/errors";
import { readMedia, updateSiteContent, uploadMedia } from "@/lib/github";
import { withProduct } from "@/lib/site-content";
import type { Product, SiteContent } from "@/lib/types";

// Testa a camada do GitHub com uma API simulada (fetch falso). Nenhuma chamada real é feita.

interface RecordedCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: Record<string, unknown> | null;
}

const TEST_ENV = {
  GITHUB_CONTENT_TOKEN: "token-de-teste",
  GITHUB_OWNER: "dono",
  GITHUB_REPO: "repo",
  GITHUB_BRANCH: "main",
};

const originalFetch = globalThis.fetch;
const savedEnv: Record<string, string | undefined> = {};
let calls: RecordedCall[] = [];

beforeEach(() => {
  calls = [];
  for (const [key, value] of Object.entries(TEST_ENV)) {
    savedEnv[key] = process.env[key];
    process.env[key] = value;
  }
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of Object.keys(TEST_ENV)) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

function mockGitHub(respond: (call: RecordedCall) => Response) {
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const call: RecordedCall = {
      url: String(input),
      method: init?.method ?? "GET",
      headers: { ...(init?.headers as Record<string, string>) },
      body: typeof init?.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : null,
    };
    calls.push(call);
    return respond(call);
  }) as typeof fetch;
}

/** Resposta da API de Contents para o site.json, no formato que o GitHub devolve. */
function siteFile(content: SiteContent, sha: string) {
  return Response.json({
    type: "file",
    sha,
    encoding: "base64",
    content: Buffer.from(JSON.stringify(content)).toString("base64"),
  });
}

const emptySite: SiteContent = { version: 1, products: [], announcements: [] };

function product(id: string, name: string): Product {
  return {
    id,
    name,
    description: "",
    priceCents: 1000,
    category: "bebida",
    isAvailable: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("updateSiteContent", () => {
  test("após um conflito, relê a versão mais nova e reaplica a alteração", async () => {
    const otherAdmin = { version: 1 as const, products: [product("outro", "Outro produto")], announcements: [] };
    let reads = 0;
    let writes = 0;
    mockGitHub((call) => {
      if (call.method === "GET") {
        reads += 1;
        return reads === 1 ? siteFile(emptySite, "sha-A") : siteFile(otherAdmin, "sha-B");
      }
      writes += 1;
      if (writes === 1) return new Response('{"message":"conflict"}', { status: 409 });
      return Response.json({ content: { sha: "sha-C" } });
    });

    const result = await updateSiteContent((current) => ({
      content: withProduct(current, product("meu", "Meu produto")),
      message: "add product",
    }));

    // O produto do outro administrador não é perdido.
    assert.deepEqual(result.products.map((item) => item.id).sort(), ["meu", "outro"]);

    const puts = calls.filter((call) => call.method === "PUT");
    assert.equal(puts.length, 2);
    assert.equal(puts[0].body?.sha, "sha-A");
    assert.equal(puts[1].body?.sha, "sha-B");
  });

  test("desiste depois de três conflitos seguidos", async () => {
    mockGitHub((call) =>
      call.method === "GET" ? siteFile(emptySite, "sha-1") : new Response("{}", { status: 409 }),
    );

    await assert.rejects(
      updateSiteContent((current) => ({ content: current, message: "x" })),
      (error: unknown) => error instanceof UserError && /outra alteração/i.test(error.message),
    );
    assert.equal(calls.filter((call) => call.method === "PUT").length, 3);
  });

  test("não repete erros que não são conflito", async () => {
    mockGitHub((call) =>
      call.method === "GET" ? siteFile(emptySite, "sha-1") : new Response("erro interno", { status: 500 }),
    );

    await assert.rejects(
      updateSiteContent((current) => ({ content: current, message: "x" })),
      (error: unknown) => error instanceof UserError && error.message.includes("500"),
    );
    assert.equal(calls.filter((call) => call.method === "PUT").length, 1);
  });

  test("não grava quando a alteração é nula", async () => {
    mockGitHub((call) => siteFile(DEFAULT_CONTENT, call.method === "GET" ? "sha-1" : "nunca"));

    const result = await updateSiteContent(() => null);
    assert.equal(result.products.length, DEFAULT_CONTENT.products.length);
    assert.equal(calls.some((call) => call.method === "PUT"), false);
  });

  test("trata uma pasta no lugar do site.json como arquivo inexistente", async () => {
    mockGitHub(() => Response.json([{ type: "file", name: "site.json" }]));

    const result = await updateSiteContent(() => null);
    assert.equal(result.products.length, DEFAULT_CONTENT.products.length);
  });
});

describe("imagens", () => {
  test("readMedia usa o formato raw, que aceita arquivos acima de 1 MB", async () => {
    const bytes = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(2 * 1024 * 1024, 7)]);
    mockGitHub(() => new Response(bytes, { status: 200 }));

    const data = await readMedia("content/images/grande-1a2b3c4d.jpg");
    assert.ok(data);
    assert.equal(data.length, bytes.length);
    assert.equal(calls[0].headers.Accept, "application/vnd.github.raw+json");
    assert.match(calls[0].url, /\/repos\/dono\/repo\/contents\/content\/images\/grande-1a2b3c4d\.jpg\?ref=main$/);
  });

  test("readMedia e uploadMedia recusam caminhos fora de content/images sem chamar a API", async () => {
    mockGitHub(() => new Response("não deveria ser usado", { status: 200 }));

    assert.equal(await readMedia("content/site.json"), null);
    await assert.rejects(uploadMedia("content/site.json", Buffer.from("x"), "msg"), UserError);
    assert.equal(calls.length, 0);
  });
});
