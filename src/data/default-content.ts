import type { Product, SiteContent } from "@/lib/types";

const now = "2026-01-01T00:00:00.000Z";

const product = (
  id: string,
  name: string,
  priceCents: number,
  category: Product["category"],
  description = "",
): Product => ({
  id,
  name,
  description,
  priceCents,
  category,
  isAvailable: true,
  createdAt: now,
});

export const DEFAULT_PRODUCTS: Product[] = [
  product("hamburguer-x-salada", "X-Salada", 2000, "hamburguer", "Pão brioche, carne artesanal 120g, maionese, queijo, presunto, alface, tomate, pepino e repolho."),
  product("hamburguer-x-egg", "X-Egg", 2300, "hamburguer", "Pão brioche, carne artesanal 120g, maionese, queijo, presunto, ovo, alface, tomate, pepino e repolho."),
  product("hamburguer-x-calabresa", "X-Calabresa", 2300, "hamburguer", "Pão brioche, carne artesanal 120g, muçarela, calabresa, alface, tomate, pepino e repolho."),
  product("hamburguer-x-bacon", "X-Bacon", 2500, "hamburguer", "Pão brioche, carne artesanal 120g, maionese, queijo, bacon, alface, tomate, pepino e repolho."),
  product("hamburguer-x-burguer", "X-Burguer", 2300, "hamburguer", "Pão brioche, carne artesanal 120g, queijo cheddar, alface, tomate, cebola roxa e molho especial."),
  product("hamburguer-x-tudo", "X-Tudo", 2900, "hamburguer", "Pão brioche, carne artesanal 120g, presunto, ovo, bacon, calabresa, queijo, alface, tomate, pepino e batata palha."),
  product("comida-tacaca", "Tacacá", 2500, "comida-tipica", "Prato tradicional paraense com tucupi, jambu, camarão e goma de mandioca."),
  product("comida-vatapa", "Vatapá", 3000, "comida-tipica", "Creme delicioso feito com pão, camarão, leite de coco e azeite de dendê."),
  product("comida-man_icoba", "Maniçoba", 2500, "comida-tipica", "A feijoada paraense feita com a folha da mandioca (maniva) cozida por 7 dias."),
  product("comida-arroz-paraense", "Arroz Paraense", 3000, "comida-tipica", "Arroz com tucupi, jambu e camarão seco."),
  product("comida-creme-cupuacu", "Creme de Cupuaçu", 1200, "comida-tipica", "Sobremesa cremosa da fruta típica da Amazônia."),
  product("comida-creme-bacuri", "Creme de Bacuri", 1300, "comida-tipica", "Sobremesa cremosa da fruta exótica Bacuri."),
  product("porcao-batata-tradicional", "Batata Tradicional", 2000, "porcao", "Batata frita crocante temperada."),
  product("porcao-calabresa-cebola", "Calabresa com Cebola", 1500, "porcao", "Calabresa acebolada na chapa."),
  product("porcao-calabresa-fritas", "Calabresa com Fritas", 2500, "porcao", "Calabresa com batatas fritas crocantes."),
  product("porcao-queijo-azeitona", "Queijo com Azeitona", 2000, "porcao", "Cubos de queijo com azeitonas."),
  product("porcao-frango-passarinho", "Frango a Passarinho", 2000, "porcao", "Frango empanado temperado."),
  product("porcao-batata-bacon", "Batata com Bacon", 2000, "porcao", "Batata frita com bacon crocante."),
  product("acai-leite-condensado-ninho", "Açaí com Leite Condensado e Leite Ninho", 1500, "acai", "300ml de açaí paraense de verdade."),
  product("acai-morango-ninho", "Açaí com Morango e Leite Ninho", 1700, "acai", "300ml com morango fresco."),
  product("acai-maracuja", "Açaí de Maracujá com Leite Condensado", 1700, "acai", "300ml sabor tropical."),
  product("acai-amendoim", "Açaí de Amendoim com Leite Condensado", 1700, "acai", "300ml com amendoim."),
  product("acai-nutella-morango", "Açaí com Nutella e Morango", 2000, "acai", "300ml premium."),
  product("acai-guarana-amazonia", "Guaraná da Amazônia", 2000, "acai", "400ml direto da floresta."),
  product("bebida-heineken", "Heineken", 850, "bebida"),
  product("bebida-brahma", "Brahma", 400, "bebida"),
  product("bebida-budweiser", "Budweiser", 500, "bebida"),
  product("bebida-caipirinha", "Caipirinha", 1000, "bebida"),
  product("bebida-coca-cola", "Coca-Cola", 600, "bebida"),
  product("bebida-coca-cola-1l", "Coca-Cola 1L", 700, "bebida"),
  product("bebida-guarana", "Guaraná", 600, "bebida"),
  product("bebida-chop-vinho", "Chop de Vinho", 1000, "bebida"),
];

export const DEFAULT_CONTENT: SiteContent = {
  version: 1,
  products: DEFAULT_PRODUCTS,
  announcements: [],
};
