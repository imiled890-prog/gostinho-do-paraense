import { AlertTriangle, Megaphone, MapPin, Phone } from "lucide-react";
import { getSiteData } from "./actions";
import MenuSection from "@/components/MenuSection";
import CartDrawer from "@/components/CartDrawer";
import { CartProvider } from "@/components/CartContext";
import AdminGate from "@/components/AdminGate";
import { isAdminSession } from "@/lib/auth";
import { CATEGORIES } from "@/data/categories";
import type { Product } from "@/lib/types";

const WHATSAPP_NUMBER = "5541998832374";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Olá! Gostaria de fazer um pedido.")}`;

export default async function Home() {
  const content = await getSiteData();
  const isAdmin = await isAdminSession();

  const menuData = CATEGORIES.map((category) => ({
    ...category,
    items: content.products
      .filter((product: Product) => product.category === category.id)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
  }));

  return (
    <CartProvider>
      <div className="min-h-screen site-bg text-gray-900">
        {content.announcements.filter((a) => a.isActive).map((ann) => (
          <div key={ann.id} className="bg-red-700 text-white px-4 py-3 text-center font-black flex justify-center gap-3 items-center">
            <AlertTriangle size={18} className="text-yellow-300" /> {ann.content} <Megaphone size={18} className="text-yellow-300" />
          </div>
        ))}

        <header className="sticky top-0 z-40 border-b-4 border-yellow-500 shadow-lg">
          <div className="wood-bg">
            <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between gap-4">
              <a href="#" className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-yellow-500 text-red-900 grid place-items-center text-2xl shadow-lg">🌿</div>
                <div className="hidden sm:block">
                  <p className="text-yellow-400 font-black text-xl leading-none">GOSTINHO DO PARAENSE</p>
                  <p className="text-yellow-100/70 text-[10px] font-bold uppercase tracking-[0.25em] mt-1">Comidas típicas do Pará</p>
                </div>
              </a>
              <a href="#cardapio" className="bg-yellow-500 text-red-900 px-4 py-2 rounded-full font-black">Cardápio</a>
            </div>
          </div>
        </header>

        <section className="hero-bg text-white">
          <div className="max-w-6xl mx-auto px-4 py-20 md:py-28 text-center">
            <div className="inline-block bg-black/30 backdrop-blur-sm rounded-3xl px-6 py-4 border border-white/10">
              <p className="uppercase tracking-[0.3em] font-black text-yellow-300 text-sm">Sabor • tradição • Pará</p>
              <h1 className="text-4xl md:text-6xl font-black mt-3">O verdadeiro sabor paraense em Curitiba</h1>
              <p className="max-w-2xl mx-auto mt-4 text-yellow-50/80 text-lg">Tacacá, vatapá, maniçoba, açaí e muito mais.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
              <a href="#cardapio" className="bg-yellow-500 text-red-900 px-8 py-4 rounded-full font-black shadow-lg">🍽️ Escolher itens</a>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="bg-green-600 text-white px-8 py-4 rounded-full font-black shadow-lg">📱 Pedir pelo WhatsApp</a>
            </div>
          </div>
        </section>

        <main id="cardapio" className="max-w-6xl mx-auto px-4 py-14">
          <div className="text-center mb-10">
            <h2 className="text-4xl md:text-5xl font-black text-red-900">🍽️ Nosso Cardápio</h2>
            <p className="mt-3 text-gray-600 font-bold">Escolha os itens e monte seu pedido.</p>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-10">
            {menuData.map((category) => (
              <MenuSection key={category.id} catId={category.id} catName={category.name} catEmoji={category.emoji} items={category.items} />
            ))}
          </div>
        </main>

        <section className="wood-bg text-center py-14 text-yellow-300">
          <p className="text-2xl md:text-4xl font-black">❤️ Venha saborear o melhor da culinária paraense! ❤️</p>
        </section>

        <footer className="wood-bg text-yellow-100/80">
          <div className="max-w-6xl mx-auto px-4 py-12 grid md:grid-cols-3 gap-10">
            <div>
              <div className="flex items-center gap-3"><div className="w-14 h-14 rounded-2xl bg-yellow-500 text-red-900 grid place-items-center text-2xl">🌿</div><strong className="text-yellow-400 text-2xl">GOSTINHO</strong></div>
              <p className="mt-4 text-sm leading-relaxed">Comida paraense, tradição e sabor para matar a saudade do Pará.</p>
            </div>
            <div>
              <h3 className="font-black text-yellow-400 flex items-center gap-2"><MapPin size={18} /> Onde estamos</h3>
              <p className="mt-3 text-sm leading-relaxed">Rua Frederico Stadler Júnior, 1476<br/>Capão da Imbuia, Curitiba - PR<br/>CEP 82810-230</p>
            </div>
            <div>
              <h3 className="font-black text-yellow-400 flex items-center gap-2"><Phone size={18} /> Faça seu pedido</h3>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="inline-flex mt-3 items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-xl font-black"><Phone size={18} fill="currentColor" />(41) 99883-2374</a>
            </div>
          </div>
          <div className="border-t border-yellow-900/40 text-center py-6 px-4">
            <AdminGate announcements={content.announcements} products={content.products} isAdmin={isAdmin} />
            <p className="text-xs mt-5 text-yellow-100/30">© {new Date().getFullYear()} Gostinho do Paraense</p>
          </div>
        </footer>

        <CartDrawer />
      </div>
    </CartProvider>
  );
}
