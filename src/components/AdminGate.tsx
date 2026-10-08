"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, LogOut, Pencil, Trash2, Ban, CheckCircle, Search, Plus } from "lucide-react";
import ProductForm from "./ProductForm";
import {
  addAnnouncement,
  deleteAnnouncement,
  deleteProduct,
  loginAdminAction,
  logoutAdminAction,
  setProductAvailability,
} from "@/app/actions";
import { CATEGORIES } from "@/data/categories";
import type { ActionResult } from "@/lib/errors";
import { formatPriceBRL } from "@/lib/pricing";
import type { Announcement, Product } from "@/lib/types";

type AdminProduct = Product & { imageUrl?: string };

const GENERIC_ERROR = "Não foi possível concluir a ação. Tente novamente.";

function categoryName(id: string) {
  return CATEGORIES.find((category) => category.id === id)?.name ?? id;
}

export default function AdminGate({
  announcements,
  products,
  isAdmin,
}: {
  announcements: Announcement[];
  products: AdminProduct[];
  isAdmin: boolean;
}) {
  const [password, setPassword] = useState("");
  const [open, setOpen] = useState(isAdmin);
  const [showLogin, setShowLogin] = useState(false);
  const [tab, setTab] = useState<"products" | "announcements">("products");
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) => !q || p.name.toLowerCase().includes(q) || categoryName(p.category).toLowerCase().includes(q),
    );
  }, [products, query]);

  // Executa uma ação do servidor e mostra o erro devolvido, em vez de falhar em silêncio.
  function runAction(action: () => Promise<ActionResult | void>, onSuccess?: () => void) {
    startTransition(async () => {
      try {
        const result = await action();
        if (result && !result.success) {
          alert(result.error);
          return;
        }
        onSuccess?.();
        router.refresh();
      } catch {
        alert(GENERIC_ERROR);
      }
    });
  }

  function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        const result = await loginAdminAction(password);
        if (!result.success) {
          alert(result.error ?? "Código inválido.");
          return;
        }
        setOpen(true);
        setShowLogin(false);
        setPassword("");
        router.refresh();
      } catch {
        alert(GENERIC_ERROR);
      }
    });
  }

  if (!open && !showLogin) {
    return (
      <button onClick={() => setShowLogin(true)} className="mx-auto text-yellow-100/20 hover:text-yellow-100/60 text-xs inline-flex items-center gap-2">
        <Lock size={12} /> Área administrativa
      </button>
    );
  }

  if (!open) {
    return (
      <form onSubmit={handleLogin} className="max-w-xs mx-auto mt-4 space-y-3">
        <input
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="current-password"
          placeholder="Código de acesso"
          aria-label="Código de acesso"
          className="w-full rounded-xl p-3 bg-black/30 border border-yellow-700/40 text-yellow-100 text-center"
        />
        <div className="flex gap-2">
          <button disabled={pending} className="flex-1 rounded-xl bg-yellow-500 text-red-900 font-black py-2">{pending ? "Entrando..." : "Entrar"}</button>
          <button type="button" onClick={() => setShowLogin(false)} className="px-3 text-yellow-100/40">Cancelar</button>
        </div>
      </form>
    );
  }

  return (
    <div className="mt-6 rounded-3xl bg-[#fdf6ec] text-gray-900 p-5 md:p-8">
      <div className="flex flex-wrap gap-2 items-center justify-between mb-6">
        <div className="flex gap-2">
          <button onClick={() => setTab("products")} className={`px-4 py-2 rounded-xl font-black ${tab === "products" ? "bg-yellow-500 text-red-900" : "bg-gray-200"}`}>🍽️ Produtos</button>
          <button onClick={() => setTab("announcements")} className={`px-4 py-2 rounded-xl font-black ${tab === "announcements" ? "bg-yellow-500 text-red-900" : "bg-gray-200"}`}>📢 Avisos</button>
        </div>
        <button
          onClick={() => runAction(() => logoutAdminAction(), () => { setOpen(false); setEditing(null); })}
          className="text-red-700 font-black flex items-center gap-2"
        >
          <LogOut size={16} /> Sair
        </button>
      </div>

      {tab === "products" ? (
        <div className="grid lg:grid-cols-[1fr_1fr] gap-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-2xl font-black text-red-800">{editing ? "Editar produto" : "Novo produto"}</h3>
                <p className="text-sm text-gray-500">As alterações são salvas automaticamente.</p>
              </div>
              {editing && <button onClick={() => setEditing(null)} className="text-sm font-black text-red-700">Novo</button>}
            </div>
            <ProductForm
              key={editing?.id ?? "new"}
              product={editing}
              onSaved={() => { setEditing(null); router.refresh(); }}
            />
          </div>

          <div>
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar produto" aria-label="Buscar produto" className="w-full pl-9 pr-3 py-3 rounded-xl border-2 border-yellow-200" />
            </div>
            <div className="space-y-3 max-h-[620px] overflow-auto">
              {filtered.map((product) => (
                <div key={product.id} className="rounded-2xl border border-yellow-100 bg-white p-4 flex gap-3 items-center">
                  <div className="w-12 h-12 rounded-xl bg-yellow-50 overflow-hidden flex-shrink-0">
                    {product.imageUrl ? <img src={product.imageUrl} alt="" className="w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center">🍽️</div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-black truncate">{product.name}</p>
                    <p className="text-xs text-gray-500">{formatPriceBRL(product.priceCents)} · {categoryName(product.category)} · {product.isAvailable ? "disponível" : "indisponível"}</p>
                  </div>
                  <div className="flex gap-1">
                    <button title="Editar" aria-label={`Editar ${product.name}`} onClick={() => setEditing(product)} className="p-2 rounded-lg bg-yellow-100 text-yellow-800"><Pencil size={15} /></button>
                    <button
                      title={product.isAvailable ? "Marcar como indisponível" : "Marcar como disponível"}
                      aria-label={product.isAvailable ? `Marcar ${product.name} como indisponível` : `Marcar ${product.name} como disponível`}
                      onClick={() => runAction(() => setProductAvailability(product.id, !product.isAvailable))}
                      className="p-2 rounded-lg bg-green-100 text-green-700"
                    >
                      {product.isAvailable ? <Ban size={15} /> : <CheckCircle size={15} />}
                    </button>
                    <button
                      title="Excluir"
                      aria-label={`Excluir ${product.name}`}
                      onClick={() => {
                        if (confirm(`Excluir "${product.name}"?`)) {
                          runAction(() => deleteProduct(product.id), () => {
                            if (editing?.id === product.id) setEditing(null);
                          });
                        }
                      }}
                      className="p-2 rounded-lg bg-red-100 text-red-700"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          <div className="flex gap-2">
            <input value={notice} onChange={(e) => setNotice(e.target.value.slice(0, 300))} maxLength={300} placeholder="Ex.: Hoje estamos atendendo até 22h." aria-label="Texto do aviso" className="flex-1 rounded-xl border-2 border-yellow-200 p-3" />
            <button
              aria-label="Publicar aviso"
              title="Publicar aviso"
              onClick={() => {
                const text = notice.trim();
                if (!text) return;
                runAction(() => addAnnouncement(text), () => setNotice(""));
              }}
              className="px-4 rounded-xl bg-red-700 text-white font-black"
            >
              <Plus />
            </button>
          </div>
          <div className="mt-5 space-y-3">
            {announcements.map((ann) => (
              <div key={ann.id} className="flex items-center gap-3 rounded-2xl bg-white border border-red-100 p-4">
                <span className="flex-1 font-bold">{ann.content}</span>
                <button
                  aria-label="Excluir aviso"
                  title="Excluir aviso"
                  onClick={() => runAction(() => deleteAnnouncement(ann.id))}
                  className="text-red-600 p-2"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {!announcements.length && <p className="text-gray-400 text-sm text-center py-8">Nenhum aviso cadastrado.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
