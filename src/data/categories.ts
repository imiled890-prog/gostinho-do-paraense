import type { ProductCategory } from "@/lib/types";

export const CATEGORIES: { id: ProductCategory; name: string; emoji: string }[] = [
  { id: "hamburguer", name: "Hamburgueres", emoji: "🍔" },
  { id: "comida-tipica", name: "Comidas Típicas", emoji: "🍲" },
  { id: "porcao", name: "Porções", emoji: "🍟" },
  { id: "acai", name: "Açaí", emoji: "🫐" },
  { id: "bebida", name: "Bebidas", emoji: "🍺" },
  { id: "novo", name: "Novidades", emoji: "🌟" },
];
