import { promises as fs } from "node:fs";
import path from "node:path";
import { DEFAULT_CONTENT } from "@/data/default-content";
import type { SiteContent } from "@/lib/types";

const API_VERSION = "2022-11-28";
const DATA_PATH = "content/site.json";
const CONTENT_CACHE_MS = 30_000;
let contentCache: { value: SiteContent; expiresAt: number } | null = null;

function configured() {
  return Boolean(
    process.env.GITHUB_CONTENT_TOKEN &&
    process.env.GITHUB_OWNER &&
    process.env.GITHUB_REPO,
  );
}

function branch() {
  return process.env.GITHUB_BRANCH || "main";
}

function apiUrl(resource: string) {
  return `https://api.github.com${resource}`;
}

function headers() {
  const token = process.env.GITHUB_CONTENT_TOKEN;
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": API_VERSION,
    "Content-Type": "application/json",
  };
}

function repoPath(filePath: string) {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  if (!owner || !repo) throw new Error("GITHUB_OWNER/GITHUB_REPO não configurados.");
  return `/repos/${owner}/${repo}/contents/${filePath}`;
}

function decodeContent(content: string) {
  return Buffer.from(content.replace(/\n/g, ""), "base64").toString("utf8");
}

function encodeContent(content: string | Buffer) {
  return Buffer.isBuffer(content)
    ? content.toString("base64")
    : Buffer.from(content, "utf8").toString("base64");
}

async function getGitHubFile(filePath: string) {
  const response = await fetch(`${apiUrl(repoPath(filePath))}?ref=${encodeURIComponent(branch())}`, {
    headers: headers(),
    cache: "no-store",
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`GitHub respondeu ${response.status} ao ler ${filePath}.`);
  }

  return (await response.json()) as { sha: string; content: string; name: string; path: string };
}

export async function readSiteContent(): Promise<SiteContent> {
  if (contentCache && contentCache.expiresAt > Date.now()) return contentCache.value;

  let value: SiteContent;
  if (!configured()) {
    try {
      const file = await fs.readFile(path.join(process.cwd(), DATA_PATH), "utf8");
      value = JSON.parse(file) as SiteContent;
    } catch {
      value = DEFAULT_CONTENT;
    }
  } else {
    const file = await getGitHubFile(DATA_PATH);
    value = file ? (JSON.parse(decodeContent(file.content)) as SiteContent) : DEFAULT_CONTENT;
  }

  contentCache = { value, expiresAt: Date.now() + CONTENT_CACHE_MS };
  return value;
}

async function writeLocalSiteContent(content: SiteContent) {
  const filePath = path.join(process.cwd(), DATA_PATH);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(content, null, 2)}\n`, "utf8");
}

export async function writeSiteContent(content: SiteContent, message: string) {
  if (!configured()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Armazenamento GitHub não configurado. Defina as variáveis GITHUB_*.");
    }
    await writeLocalSiteContent(content);
    contentCache = { value: content, expiresAt: Date.now() + CONTENT_CACHE_MS };
    return;
  }

  const current = await getGitHubFile(DATA_PATH);
  const body: Record<string, unknown> = {
    message,
    content: encodeContent(`${JSON.stringify(content, null, 2)}\n`),
    branch: branch(),
  };
  if (current?.sha) body.sha = current.sha;

  const response = await fetch(apiUrl(repoPath(DATA_PATH)), {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Falha ao salvar no GitHub (${response.status}): ${detail.slice(0, 300)}`);
  }
  contentCache = { value: content, expiresAt: Date.now() + CONTENT_CACHE_MS };
}

export function mediaUrl(filePath: string) {
  return `/api/media/${filePath.split("/").map(encodeURIComponent).join("/")}`;
}

export async function uploadMedia(filePath: string, data: Buffer, message: string) {
  if (!configured()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Armazenamento GitHub não configurado para upload.");
    }
    const destination = path.join(process.cwd(), filePath);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, data);
    return;
  }

  const current = await getGitHubFile(filePath);
  const body: Record<string, unknown> = {
    message,
    content: encodeContent(data),
    branch: branch(),
  };
  if (current?.sha) body.sha = current.sha;

  const response = await fetch(apiUrl(repoPath(filePath)), {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Falha ao enviar imagem (${response.status}): ${detail.slice(0, 300)}`);
  }
}

export async function deleteMedia(filePath: string, message: string) {
  if (!filePath) return;

  if (!configured()) {
    if (process.env.NODE_ENV === "production") return;
    await fs.rm(path.join(process.cwd(), filePath), { force: true });
    return;
  }

  const current = await getGitHubFile(filePath);
  if (!current?.sha) return;

  const response = await fetch(apiUrl(repoPath(filePath)), {
    method: "DELETE",
    headers: headers(),
    body: JSON.stringify({ message, sha: current.sha, branch: branch() }),
  });

  if (!response.ok && response.status !== 404) {
    const detail = await response.text();
    throw new Error(`Falha ao remover imagem (${response.status}): ${detail.slice(0, 300)}`);
  }
}

export async function readMedia(filePath: string) {
  if (!filePath.startsWith("content/images/") || filePath.includes("..")) {
    return null;
  }

  if (!configured()) {
    try {
      return await fs.readFile(path.join(process.cwd(), filePath));
    } catch {
      return null;
    }
  }

  const file = await getGitHubFile(filePath);
  return file ? Buffer.from(file.content.replace(/\n/g, ""), "base64") : null;
}
