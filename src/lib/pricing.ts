import { UserError } from "@/lib/errors";

export const MAX_PRICE_CENTS = 1_000_000;

export function formatPriceBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

/** Texto para o campo de preço, sem o símbolo da moeda. Ex.: 1250 -> "12,50". */
export function formatPriceInput(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/**
 * Converte o preço digitado em centavos.
 *
 * - Com vírgula, ela é o separador decimal e o ponto agrupa milhares: "1.250,50".
 * - Sem vírgula, um ponto seguido de três dígitos é milhar ("1.250" = R$ 1.250,00)
 *   e um ponto seguido de um ou dois dígitos é decimal ("12.50" = R$ 12,50).
 * - Formatos ambíguos, como "1,000.50", são recusados.
 */
export function parsePriceToCents(value: string): number {
  const compact = value.replace(/R\$/gi, "").replace(/\s+/g, "");
  let reais: string;
  let centavos: string;

  if (compact.includes(",")) {
    const match = /^((?:\d{1,3}(?:\.\d{3})+)|\d+),(\d{1,2})$/.exec(compact);
    if (!match) throw invalidPrice();
    reais = match[1].replace(/\./g, "");
    centavos = match[2].padEnd(2, "0");
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(compact)) {
    reais = compact.replace(/\./g, "");
    centavos = "00";
  } else {
    const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(compact);
    if (!match) throw invalidPrice();
    reais = match[1];
    centavos = (match[2] ?? "").padEnd(2, "0");
  }

  const cents = Number(reais) * 100 + Number(centavos);
  if (!Number.isSafeInteger(cents) || cents < 0 || cents > MAX_PRICE_CENTS) {
    throw new UserError("Preço fora do limite permitido (até R$ 10.000,00).");
  }
  return cents;
}

function invalidPrice() {
  return new UserError("Preço inválido. Use, por exemplo, 25,00 ou 25.00.");
}
