"use client";

import { useCart } from "./CartContext";
import { Plus, Minus, Check } from "lucide-react";
import { formatPriceBRL } from "@/lib/pricing";

interface MenuItemCardProps {
  id: string;
  name: string;
  priceCents: number;
  desc?: string;
  imageUrl?: string;
  isAvailable?: boolean;
}

export default function MenuItemCard({ id, name, priceCents, desc, imageUrl, isAvailable = true }: MenuItemCardProps) {
  const { addItem, getQty, incrementItem, decrementItem } = useCart();
  const qty = getQty(id);
  const inCart = qty > 0;

  return (
    <article className={`group relative overflow-hidden rounded-2xl shadow-lg transition-all duration-300 ${!isAvailable ? "opacity-50 grayscale" : "hover:-translate-y-1"} ${inCart ? "ring-2 ring-yellow-400" : ""}`}>
      <div className="absolute inset-0 card-bg" />
      <div className="absolute inset-0 bg-[#2d1600]/90" />
      {!isAvailable && <div className="absolute inset-0 z-20 bg-black/40 flex items-center justify-center"><span className="bg-red-600 text-white px-4 py-2 rounded-lg font-black uppercase text-xs rotate-6">Indisponível</span></div>}
      {inCart && <div className="absolute top-2 right-2 z-10 bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center"><Check size={14} /></div>}

      <div className="relative flex gap-4 p-5">
        {imageUrl && <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border-2 border-yellow-600/50"><img src={imageUrl} alt={name} className="w-full h-full object-cover" loading="lazy" /></div>}
        <div className="min-w-0 flex-1">
          <h4 className="font-black text-lg text-yellow-300">{name}</h4>
          {desc && <p className="text-xs text-yellow-100/60 leading-relaxed mt-1 mb-3 line-clamp-2">{desc}</p>}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="bg-yellow-500 text-red-900 font-black px-4 py-1.5 rounded-full text-sm">{formatPriceBRL(priceCents)}</span>
            {isAvailable && (!inCart ? (
              <button onClick={() => addItem({ id, name, priceCents })} className="flex items-center gap-1.5 bg-green-600 text-white text-sm px-4 py-2 rounded-full font-black hover:bg-green-500">
                <Plus size={14} strokeWidth={3} />Adicionar
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button onClick={() => decrementItem(id)} aria-label={`Diminuir ${name}`} className="w-8 h-8 rounded-full bg-red-700 text-white flex items-center justify-center"><Minus size={14} /></button>
                <span className="w-8 text-center font-black text-yellow-300 text-lg">{qty}</span>
                <button onClick={() => incrementItem(id)} aria-label={`Aumentar ${name}`} className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center"><Plus size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
