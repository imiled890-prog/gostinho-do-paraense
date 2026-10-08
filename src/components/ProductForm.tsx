"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Upload, X } from "lucide-react";
import { saveProduct } from "@/app/actions";
import { CATEGORIES } from "@/data/categories";
import { ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_BYTES, MAX_IMAGE_LABEL } from "@/lib/media";
import { formatPriceInput } from "@/lib/pricing";
import type { Product } from "@/lib/types";

interface ProductFormProps {
  // O pai define `key` pelo id do produto, então o formulário é recriado ao trocar de produto.
  product?: (Product & { imageUrl?: string }) | null;
  onSaved?: () => void;
}

export default function ProductForm({ product, onSaved }: ProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  // Libera a URL temporária da prévia quando ela é trocada ou quando o formulário sai da tela.
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const shownImage = removeImage ? null : (previewUrl ?? product?.imageUrl ?? null);

  const handleImageChange = (file?: File) => {
    if (!file) return;
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
      alert("Use uma imagem JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      alert(`A imagem deve ter no máximo ${MAX_IMAGE_LABEL}.`);
      return;
    }
    setImage(file);
    setRemoveImage(false);
    setPreviewUrl(URL.createObjectURL(file));
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // O React zera event.currentTarget ao fim do evento, então guardamos o formulário antes do await.
    const form = event.currentTarget;
    setLoading(true);
    setSaved(false);
    try {
      const formData = new FormData(form);
      if (image && !removeImage) formData.set("image", image);
      formData.set("removeImage", String(removeImage));

      const result = await saveProduct(formData);
      if (!result.success) {
        alert(result.error);
        return;
      }

      setSaved(true);
      if (!product) {
        form.reset();
        setImage(null);
        setPreviewUrl(null);
        setRemoveImage(false);
      }
      onSaved?.();
      window.setTimeout(() => setSaved(false), 2500);
    } catch {
      alert("Não foi possível salvar o produto. Tente novamente.");
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
          <span>Preço (R$)</span>
          <input name="price" defaultValue={product ? formatPriceInput(product.priceCents) : ""} required inputMode="decimal" placeholder="25,00" className="w-full p-3 rounded-xl border-2 border-yellow-200 bg-white" />
        </label>
      </div>

      <label className="space-y-2 block text-sm font-black text-red-800">
        <span>Categoria</span>
        <select name="category" defaultValue={product?.category ?? "comida-tipica"} className="w-full p-3 rounded-xl border-2 border-yellow-200 bg-white">
          {CATEGORIES.map((category) => (
            <option key={category.id} value={category.id}>
              {category.emoji} {category.name}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2 block text-sm font-black text-red-800">
        <span>Descrição</span>
        <textarea name="description" defaultValue={product?.description ?? ""} rows={3} maxLength={500} className="w-full p-3 rounded-xl border-2 border-yellow-200 bg-white resize-none" />
      </label>

      <div className="flex items-center gap-4">
        <label className="w-28 h-28 border-2 border-dashed border-yellow-400 rounded-2xl cursor-pointer overflow-hidden flex items-center justify-center bg-yellow-50">
          {shownImage
            ? <img src={shownImage} alt="Prévia da foto do produto" className="w-full h-full object-cover" />
            : <div className="text-center text-yellow-700"><Upload className="mx-auto" size={24} /><span className="text-[10px] font-black">UPLOAD</span></div>}
          <input
            type="file"
            accept={ALLOWED_IMAGE_MIME_TYPES.join(",")}
            className="hidden"
            onChange={(event) => {
              handleImageChange(event.target.files?.[0]);
              // Limpa o campo para que escolher o mesmo arquivo de novo também dispare o evento.
              event.target.value = "";
            }}
          />
        </label>
        <div className="text-xs text-gray-500">
          <p>JPG, PNG ou WEBP. Máx. {MAX_IMAGE_LABEL}.</p>
          {product?.imagePath && (
            <button
              type="button"
              onClick={() => {
                setRemoveImage(true);
                setImage(null);
              }}
              className="mt-2 text-red-600 font-black inline-flex items-center gap-1"
            >
              <X size={14} /> Remover foto
            </button>
          )}
        </div>
      </div>

      <button disabled={loading} className="w-full bg-red-700 text-white p-4 rounded-2xl font-black text-lg disabled:opacity-50 flex items-center justify-center gap-2">
        {loading ? <Loader2 className="animate-spin" /> : saved ? <><CheckCircle2 /> Salvo!</> : product ? "Salvar alterações" : "Publicar produto"}
      </button>
    </form>
  );
}
