import { cookies } from "next/headers";
import { UserError } from "@/lib/errors";
import { createSessionToken, passwordMatches, SESSION_MAX_AGE_SECONDS, verifySessionToken } from "@/lib/session";

const COOKIE_NAME = "gostinho_admin";
const FAILED_LOGIN_DELAY_MS = 1000;

function adminPassword() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("ADMIN_PASSWORD não configurada.");
  return password;
}

// Chave que assina a sessão. Com ADMIN_SESSION_SECRET definida, ela não depende da senha:
// um cookie vazado não permite testar senhas offline.
function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || adminPassword();
}

export async function isAdminSession() {
  try {
    const store = await cookies();
    return verifySessionToken(store.get(COOKIE_NAME)?.value, sessionSecret());
  } catch {
    return false;
  }
}

export async function loginAdmin(password: string) {
  if (!passwordMatches(password, adminPassword())) {
    // Atraso simples para dificultar tentativas repetidas de adivinhar a senha.
    await new Promise((resolve) => setTimeout(resolve, FAILED_LOGIN_DELAY_MS));
    return false;
  }

  const store = await cookies();
  store.set(COOKIE_NAME, createSessionToken(sessionSecret()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return true;
}

export async function logoutAdmin() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function requireAdmin() {
  if (!(await isAdminSession())) {
    throw new UserError("Acesso não autorizado. Entre novamente na área administrativa.");
  }
}
