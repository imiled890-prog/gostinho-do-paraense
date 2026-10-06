"use client";

import { useEffect, useState } from "react";
import { saveProduct } from "@/app/actions";
import { Upload, Loader2, CheckCircle2, X } from "lucide-react";
import type { Product } from "@/lib/types";
import { formatPriceBRL } from "@/lib/pricing";

const MAX_IMAGE_BYTES = 900 * 1024;

interface ProductFormProps {
  product?: (Product & { imageUrl?: string }) | null;
  onSaved?: () => void;
}

export default function ProductForm({ product, onSaved }: ProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(product?.imageUrl ?? null);
  const [removeImage, setRemoveImage] = useState(false);

  useEffect(() => {
    setImage(null);
    setImagePreview(product?.imageUrl ?? null);
    setRemoveImage(false);
    setSuccess(false);
  }, [product?.id, product?.imageUrl]);

  useEffect(() => () => {
    if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const handleImageChange = (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("Use uma imagem JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      alert("A imagem deve ter no máximo 900 KB.");
      return;
    }
    setImage(file);
    setRemoveImage(false);
    setImagePreview(URL.createObjectURL(file));
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setSuccess(false);
    try {
      const formData = new FormData(event.currentTarget);
      if (image) formData.set("image", image);
      formData.set("removeImage", String(removeImage));
      if (product?.imagePath) formData.set("currentImagePath", product.imagePath);
      await saveProduct(formData);
      setSuccess(true);
      setImage(null);
      onSaved?.();
      if (!product) {
        event.currentTarget.reset();
        setImagePreview(null);
      }
      window.setTimeout(() => setSuccess(false), 2500);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao salvar produto.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {product?.id && <input type="hidden" name="id" value={product.id} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="space-y-2 text-sm font-black text-red-800">
          <span>Nome</span>
          <input name="name" defaultValue={product?.name ?? ""} required maxLength={120} className="w-full p-3 rounded-xl border-2 border-yellow-200 bg-white" />
        </label>
        <label className="space-y-2 text-sm font-black text-red-800">
          <span>Preço</span>
          <input name="price" defaultValue={product ? formatPriceBRL(product.priceCents).replace(/^R\$\s?/, "") : ""} required inputMode="decimal" placeholder="25,00" className="w-full p-3 rounded-xl border-2 border-yellow-200 bg-white" />
        </label>
      </div>

      <label className="space-y-2 block text-sm font-black text-red-800">
        <span>Categoria</span>
        <select name="category" defaultValue={product?.category ?? "comida-tipica"} className="w-full p-3 rounded-xl border-2 border-yellow-200 bg-white">
          <option value="novo">🌟 Novidade</option>
          <option value="hamburguer">🍔 Hambúrguer</option>
          <option value="comida-tipica">🍲 Comida Típica</option>
          <option value="porcao">🍟 Porção</option>
          <option value="acai">🫐 Açaí</option>
          <option value="bebida">🥤 Bebida</option>
        </select>
      </label>

      <label className="space-y-2 block text-sm font-black text-red-800">
        <span>Descrição</span>
        <textarea name="description" defaultValue={product?.description ?? ""} rows={3} maxLength={500} className="w-full p-3 rounded-xl border-2 border-yellow-200 bg-white resize-none" />
      </label>

      <div className="flex items-center gap-4">
        <label className="w-28 h-28 border-2 border-dashed border-yellow-400 rounded-2xl cursor-pointer overflow-hidden flex items-center justify-center bg-yellow-50">
          {imagePreview && !removeImage
            ? <img src={imagePreview} alt="" className="w-full h-full object-cover" />
            : <div className="text-center text-yellow-700"><Upload className="mx-auto" size={24} /><span className="text-[10px] font-black">UPLOAD</span></div>}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => handleImageChange(event.target.files?.[0])} />
        </label>
        <div className="text-xs text-gray-500">
          <p>JPG, PNG ou WEBP. Máx. 900 KB.</p>
          {product?.imagePath && <button type="button" onClick={() => { setRemoveImage(true); setImage(null); }} className="mt-2 text-red-600 font-black inline-flex items-center gap-1"><X size={14} /> Remover foto</button>}
        </div>
      </div>

      <button disabled={loading} className="w-full bg-red-700 text-white p-4 rounded-2xl font-black text-lg disabled:opacity-50 flex items-center justify-center gap-2">
        {loading ? <Loader2 className="animate-spin" /> : success ? <><CheckCircle2 /> Salvo!</> : product ? "Salvar alterações" : "Publicar produto"}
      </button>
    </form>
  );
}
