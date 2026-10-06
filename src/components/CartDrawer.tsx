"use client";

import { useState } from "react";
import { useCart } from "./CartContext";
import { formatPriceBRL } from "@/lib/pricing";
import { ShoppingCart, X, Plus, Minus, Trash2, Phone, ChevronUp } from "lucide-react";

const WHATSAPP_NUMBER = "5541998832374";

export default function CartDrawer() {
  const [open, setOpen] = useState(false);
  const { items, totalItems, totalPrice, incrementItem, decrementItem, removeItem, clearCart, buildWhatsAppMessage } = useCart();

  const handleSendOrder = () => {
    const message = buildWhatsAppMessage();
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  if (totalItems === 0) return null;

  return (
    <>
      <button onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-50 flex items-center gap-3 bg-yellow-500 text-red-900 px-5 py-4 rounded-full shadow-2xl font-black border-2 border-yellow-300">
        <ShoppingCart size={24} />
        <span className="hidden sm:inline">Ver Pedido</span>
        <span className="bg-red-600 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center">{totalItems}</span>
        <ChevronUp size={18} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg bg-[#fdf6ec] rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden border-t-4 border-yellow-500 animate-slideUp">
            <div className="wood-bg px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3"><ShoppingCart className="text-yellow-400" /><h3 className="text-2xl font-black text-yellow-400">Seu Pedido</h3><span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-black">{totalItems}</span></div>
              <button onClick={() => setOpen(false)} className="text-yellow-200 p-1" aria-label="Fechar"><X /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {items.map((item) => (
                <div key={item.id} className="relative rounded-xl overflow-hidden shadow-md">
                  <div className="absolute inset-0 card-bg" /><div className="absolute inset-0 bg-[#2d1600]/85" />
                  <div className="relative p-4 flex items-center gap-3">
                    <div className="flex-grow min-w-0"><h4 className="font-black text-yellow-300 truncate">{item.name}</h4><p className="text-yellow-100/50 text-xs">{formatPriceBRL(item.priceCents)} cada</p></div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => decrementItem(item.id)} className="w-8 h-8 rounded-full bg-red-700 text-white flex items-center justify-center"><Minus size={14} /></button>
                      <span className="w-8 text-center font-black text-yellow-300">{item.qty}</span>
                      <button onClick={() => incrementItem(item.id)} className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center"><Plus size={14} /></button>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="text-red-400 p-1" aria-label={`Remover ${item.name}`}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t-2 border-yellow-600/30 px-6 py-4">
              <div className="flex items-center justify-between mb-4"><div><p className="text-xs text-gray-500 font-bold uppercase">Total</p><p className="text-3xl font-black text-red-800">{totalPrice}</p></div><button onClick={clearCart} className="text-xs text-red-500 font-bold flex items-center gap-1"><Trash2 size={12} />Limpar</button></div>
              <button onClick={handleSendOrder} className="w-full flex items-center justify-center gap-3 bg-green-600 text-white py-4 rounded-2xl font-black text-lg"><Phone size={22} fill="currentColor" />Enviar pelo WhatsApp</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
