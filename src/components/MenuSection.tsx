"use client";

import MenuItemCard from "./MenuItemCard";
import type { Product } from "@/lib/types";

interface MenuSectionProps {
  catId: Product["category"];
  catName: string;
  catEmoji: string;
  items: Array<Product & { imageUrl?: string }>;
}

export default function MenuSection({ catId, catName, catEmoji, items }: MenuSectionProps) {
  return (
    <section className="space-y-5">
      <div className="relative">
        <div className="absolute inset-0 card-bg rounded-2xl border-2 border-[#3e1a00]" />
        <div className="relative flex items-center gap-3 px-6 py-4">
          <span className="text-3xl">{catEmoji}</span>
          <h3 className="text-2xl font-black uppercase text-yellow-400">{catName}</h3>
        </div>
      </div>
      <div className="space-y-4">
        {items.map((item) => <MenuItemCard key={item.id} id={item.id} name={item.name} priceCents={item.priceCents} desc={item.description} imageUrl={item.imageUrl} isAvailable={item.isAvailable} />)}
        {catId === "novo" && items.length === 0 && <div className="relative rounded-2xl overflow-hidden"><div className="absolute inset-0 card-bg" /><div className="relative p-8 text-center border-2 border-dashed border-yellow-600/30 rounded-2xl"><p className="text-yellow-500/70 italic text-sm font-bold">🌟 Nenhuma novidade no momento.</p></div></div>}
      </div>
    </section>
  );
}
