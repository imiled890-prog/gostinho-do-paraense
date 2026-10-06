export function formatPriceBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function parsePriceToCents(value: string): number {
  const normalized = value
    .trim()
    .replace(/R\$/gi, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error("Preço inválido. Use, por exemplo, 25,00.");
  }

  const cents = Math.round(Number(normalized) * 100);
  if (!Number.isSafeInteger(cents) || cents < 0 || cents > 1_000_000) {
    throw new Error("Preço fora do limite permitido.");
  }
  return cents;
}
