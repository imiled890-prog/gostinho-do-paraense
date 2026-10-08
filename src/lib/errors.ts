/**
 * Erro cuja mensagem foi escrita para o administrador e pode ser exibida na tela.
 *
 * Outros erros são registrados no servidor e viram uma mensagem genérica: o Next.js
 * oculta mensagens de erro de Server Actions em produção, então as validações
 * precisam ser devolvidas como resultado (ver `ActionResult`).
 */
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserError";
  }
}

/** Outra gravação alterou o site.json entre a leitura e a escrita. */
export class ConflictError extends UserError {
  constructor() {
    super("Outra alteração foi salva ao mesmo tempo. Atualize a página e tente novamente.");
    this.name = "ConflictError";
  }
}

export type ActionResult = { success: true } | { success: false; error: string };

export function toActionError(error: unknown): ActionResult {
  if (error instanceof UserError) return { success: false, error: error.message };
  console.error("Erro inesperado em ação administrativa:", error);
  return { success: false, error: "Não foi possível concluir a ação. Tente novamente." };
}
