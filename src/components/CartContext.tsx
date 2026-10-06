"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { formatPriceBRL } from "@/lib/pricing";

export interface CartItem {
  id: string;
  name: string;
  priceCents: number;
  qty: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty">) => void;
  removeItem: (id: string) => void;
  incrementItem: (id: string) => void;
  decrementItem: (id: string) => void;
  getQty: (id: string) => number;
  totalItems: number;
  totalPrice: string;
  clearCart: () => void;
  buildWhatsAppMessage: () => string;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (item: Omit<CartItem, "qty">) => {
    setItems((prev) => {
      const existing = prev.find((entry) => entry.id === item.id);
      if (existing) {
        return prev.map((entry) => entry.id === item.id ? { ...entry, qty: entry.qty + 1 } : entry);
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((item) => item.id !== id));
  const incrementItem = (id: string) => setItems((prev) => prev.map((item) => item.id === id ? { ...item, qty: item.qty + 1 } : item));
  const decrementItem = (id: string) => setItems((prev) => prev.flatMap((item) => item.id !== id ? [item] : item.qty <= 1 ? [] : [{ ...item, qty: item.qty - 1 }]));
  const getQty = (id: string) => items.find((item) => item.id === id)?.qty ?? 0;
  const totalItems = useMemo(() => items.reduce((sum, item) => sum + item.qty, 0), [items]);
  const totalCents = useMemo(() => items.reduce((sum, item) => sum + item.priceCents * item.qty, 0), [items]);
  const totalPrice = formatPriceBRL(totalCents);

  const buildWhatsAppMessage = () => {
    if (!items.length) return "";
    let message = "🌿 *PEDIDO - GOSTINHO DO PARAENSE* 🌿\n\nOlá! Gostaria de fazer o seguinte pedido:\n\n";
    items.forEach((item, index) => {
      const subtotal = item.priceCents * item.qty;
      message += `${index + 1}. *${item.name}*\n   ${item.qty}x ${formatPriceBRL(item.priceCents)}`;
      if (item.qty > 1) message += ` = ${formatPriceBRL(subtotal)}`;
      message += "\n\n";
    });
    message += "━━━━━━━━━━━━━━━━━━\n";
    message += `📦 *Total de itens:* ${totalItems}\n💰 *Valor total:* ${formatPriceBRL(totalCents)}\n`;
    message += "━━━━━━━━━━━━━━━━━━\n\nAguardo confirmação! 😋🍽️";
    return message;
  };

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, incrementItem, decrementItem, getQty, totalItems, totalPrice, clearCart: () => setItems([]), buildWhatsAppMessage }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
