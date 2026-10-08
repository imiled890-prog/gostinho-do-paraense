import { promises as fs } from "node:fs";
import path from "node:path";
import { DEFAULT_CONTENT } from "@/data/default-content";
import { ConflictError, UserError } from "@/lib/errors";
import { isSafeMediaPath } from "@/lib/media";
import { parseSiteContentJson } from "@/lib/site-content";
import type { SiteContent } from "@/lib/types";

// Armazenamento do conteúdo e das imagens.
// Em produção, tudo fica no repositório GitHub (API de Contents). Sem GITHUB_* configurado,
// o desenvolvimento local grava nos arquivos do próprio projeto.

const API_VERSION = "2022-11-28";
const RAW_MEDIA_TYPE = "application/vnd.github.raw+json";
const DATA_PATH = "content/site.json";
const CONTENT_CACHE_MS = 30_000;
const MAX_WRITE_ATTEMPTS = 3;

type Snapshot = { content: SiteContent; sha: string | null };
let snapshotCache: { value: Snapshot; expiresAt: number } | null = null;

/** Alteração a aplicar sobre o conteúdo atual. `null` significa que nada precisa ser gravado. */
export type ContentChange = { content: SiteContent; message: string } | null;

interface GitHubFile {
  sha: string;
  content: string;
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function configured() {
  return Boolean(process.env.GITHUB_CONTENT_TOKEN && process.env.GITHUB_OWNER && process.env.GITHUB_REPO);
}

function branch() {
  return process.env.GITHUB_BRANCH || "main";
}

function apiUrl(resource: string) {
  return `https://api.github.com${resource}`;
}

function headers(accept = "application/vnd.github+json") {
  return {
    Accept: accept,
    Authorization: `Bearer ${process.env.GITHUB_CONTENT_TOKEN}`,
    "X-GitHub-Api-Version": API_VERSION,
  };
}

function repoPath(filePath: string) {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  if (!owner || !repo) throw new UserError("GITHUB_OWNER/GITHUB_REPO não configurados.");
  const encodedPath = filePath.split("/").map(encodeURIComponent).join("/");
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`;
}

function readUrl(filePath: string) {
  return `${apiUrl(repoPath(filePath))}?ref=${encodeURIComponent(branch())}`;
}

function assertSafeMediaPath(filePath: string) {
  if (!isSafeMediaPath(filePath)) throw new UserError(`Caminho de imagem inválido: ${filePath}`);
}

function localPath(filePath: string) {
  return path.join(/*turbopackIgnore: true*/ process.cwd(), filePath);
}

async function readLocalFile(filePath: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(localPath(filePath));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function writeLocalFile(filePath: string, data: Buffer | string) {
  const destination = localPath(filePath);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, data);
}

async function removeLocalFile(filePath: string) {
  await fs.rm(localPath(filePath), { force: true });
}

/** Metadados e conteúdo JSON de um arquivo. Retorna null se não existir ou se for uma pasta. */
async function getGitHubFile(filePath: string): Promise<GitHubFile | null> {
  const response = await fetch(readUrl(filePath), { headers: headers(), cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new UserError(`GitHub respondeu ${response.status} ao ler ${filePath}.`);

  const data = (await response.json()) as Partial<GitHubFile & { type: string }>;
  if (Array.isArray(data) || data.type !== "file" || typeof data.sha !== "string") return null;
  return { sha: data.sha, content: data.content ?? "" };
}

/** Lê a versão atual do conteúdo na fonte, sem cache. Usado antes de cada gravação. */
async function loadSnapshot(): Promise<Snapshot> {
  if (!configured()) {
    const file = await readLocalFile(DATA_PATH);
    const content = file ? parseSiteContentJson(file.toString("utf8")) : structuredClone(DEFAULT_CONTENT);
    return { content, sha: null };
  }

  const file = await getGitHubFile(DATA_PATH);
  if (!file) return { content: structuredClone(DEFAULT_CONTENT), sha: null };
  const text = Buffer.from(file.content.replace(/\n/g, ""), "base64").toString("utf8");
  return { content: parseSiteContentJson(text), sha: file.sha };
}

/** Conteúdo para a página pública. Usa cache curto para não consultar o GitHub a cada visita. */
export async function readSiteContent(): Promise<SiteContent> {
  return (await getCachedSnapshot()).content;
}

async function getCachedSnapshot(): Promise<Snapshot> {
  if (snapshotCache && snapshotCache.expiresAt > Date.now()) return snapshotCache.value;

  try {
    const value = await loadSnapshot();
    snapshotCache = { value, expiresAt: Date.now() + CONTENT_CACHE_MS };
    return value;
  } catch (error) {
    // Falha temporária do GitHub: mantém a última versão lida neste processo em vez de derrubar o cardápio.
    if (!snapshotCache) throw error;
    console.error("Não foi possível atualizar o conteúdo; usando a última versão em memória.", error);
    snapshotCache.expiresAt = Date.now() + 5_000;
    return snapshotCache.value;
  }
}

async function saveSiteContent(content: SiteContent, sha: string | null, message: string): Promise<string | null> {
  const json = `${JSON.stringify(content, null, 2)}\n`;
  if (!configured()) {
    if (isProduction()) throw new UserError("Armazenamento GitHub não configurado. Defina as variáveis GITHUB_*.");
    await writeLocalFile(DATA_PATH, json);
    return null;
  }
  return putGitHubFile(DATA_PATH, Buffer.from(json, "utf8"), message, sha, "o conteúdo do site");
}

/** Cria ou substitui um arquivo no GitHub. Com `sha` divergente, lança ConflictError. */
async function putGitHubFile(
  filePath: string,
  data: Buffer,
  message: string,
  sha: string | null,
  description: string,
): Promise<string | null> {
  const response = await fetch(apiUrl(repoPath(filePath)), {
    method: "PUT",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: data.toString("base64"),
      branch: branch(),
      ...(sha ? { sha } : {}),
    }),
  });

  if (response.status === 409) throw new ConflictError();
  if (!response.ok) {
    const detail = await response.text();
    throw new UserError(`Falha ao salvar ${description} no GitHub (${response.status}): ${detail.slice(0, 300)}`);
  }

  const result = (await response.json()) as { content?: { sha?: string } };
  return result.content?.sha ?? null;
}

/**
 * Aplica uma alteração sobre o conteúdo mais recente.
 *
 * Lê a versão atual antes de cada tentativa e grava com o `sha` lido. Se outra gravação
 * ocorrer no meio do caminho (conflito), relê e aplica a alteração de novo, em vez de
 * sobrescrever o trabalho de outra pessoa.
 */
export async function updateSiteContent(mutate: (current: SiteContent) => ContentChange): Promise<SiteContent> {
  for (let attempt = 1; ; attempt++) {
    const snapshot = await loadSnapshot();
    const change = mutate(snapshot.content);
    if (!change) return snapshot.content;

    try {
      const sha = await saveSiteContent(change.content, snapshot.sha, change.message);
      snapshotCache = { value: { content: change.content, sha }, expiresAt: Date.now() + CONTENT_CACHE_MS };
      return change.content;
    } catch (error) {
      if (!(error instanceof ConflictError) || attempt >= MAX_WRITE_ATTEMPTS) throw error;
    }
  }
}

export async function uploadMedia(filePath: string, data: Buffer, message: string): Promise<void> {
  assertSafeMediaPath(filePath);
  if (!configured()) {
    if (isProduction()) throw new UserError("Armazenamento GitHub não configurado para enviar imagens.");
    await writeLocalFile(filePath, data);
    return;
  }

  const current = await getGitHubFile(filePath);
  await putGitHubFile(filePath, data, message, current?.sha ?? null, "a imagem");
}

export async function deleteMedia(filePath: string, message: string): Promise<void> {
  if (!filePath) return;
  assertSafeMediaPath(filePath);
  if (!configured()) {
    if (isProduction()) throw new UserError("Armazenamento GitHub não configurado para remover imagens.");
    await removeLocalFile(filePath);
    return;
  }

  const current = await getGitHubFile(filePath);
  if (!current) return;

  const response = await fetch(apiUrl(repoPath(filePath)), {
    method: "DELETE",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({ message, sha: current.sha, branch: branch() }),
  });
  if (!response.ok && response.status !== 404) {
    const detail = await response.text();
    throw new UserError(`Falha ao remover a imagem no GitHub (${response.status}): ${detail.slice(0, 300)}`);
  }
}

/** Bytes de uma imagem do repositório, ou null se ela não existir. */
export async function readMedia(filePath: string): Promise<Buffer | null> {
  if (!isSafeMediaPath(filePath)) return null;
  if (!configured()) return readLocalFile(filePath);

  // O formato "raw" devolve o arquivo inteiro. O JSON da API só traz o conteúdo de arquivos até 1 MB.
  const response = await fetch(readUrl(filePath), { headers: headers(RAW_MEDIA_TYPE), cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new UserError(`GitHub respondeu ${response.status} ao ler a imagem.`);
  return Buffer.from(await response.arrayBuffer());
}
