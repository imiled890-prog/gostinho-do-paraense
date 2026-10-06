export type ProductCategory =
  | "hamburguer"
  | "comida-tipica"
  | "porcao"
  | "acai"
  | "bebida"
  | "novo";

export interface Product {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  category: ProductCategory;
  imagePath?: string;
  isAvailable: boolean;
  createdAt: string;
}

export interface Announcement {
  id: string;
  content: string;
  isActive: boolean;
  createdAt: string;
}

export interface SiteContent {
  version: 1;
  products: Product[];
  announcements: Announcement[];
}
