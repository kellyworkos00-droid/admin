"use client";

import { useEffect, useState } from "react";

interface ProductFormProps {
  sellerId: string;
  productId?: string;
  initialData?: any;
  onSuccess?: (product: any) => void;
  onCancel?: () => void;
}

const CATEGORIES = [
  "Hardware & Tools",
  "Building Materials",
  "Electronics",
  "Plumbing",
  "Electrical",
  "Paint & Coatings",
  "Safety Equipment",
  "Other",
];

export function ProductForm({
  sellerId,
  productId,
  initialData,
  onSuccess,
  onCancel,
}: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    sku: initialData?.sku || "",
    description: initialData?.description || "",
    category: initialData?.category || "Hardware & Tools",
    imageUrl: initialData?.imageUrl || "",
    price: initialData?.price || "",
    bulkPrice: initialData?.bulkPrice || "",
    minOrder: initialData?.minOrder || "1",
    maxOrder: initialData?.maxOrder || "",
    stockQty: initialData?.stockQty || "0",
    discountPct: initialData?.discountPct || "0",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageFileName, setImageFileName] = useState<string>("");

  const isEditing = !!productId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const method = isEditing ? "PUT" : "POST";
      const url = isEditing
        ? `/api/v1/seller/products/${productId}`
        : `/api/v1/seller/products`;

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Seller-ID": sellerId,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save product");
      }

      if (onSuccess) {
        onSuccess(data.product);
      }

      if (!isEditing) {
        setFormData({
          name: "",
          sku: "",
          description: "",
          category: "Hardware & Tools",
          imageUrl: "",
          price: "",
          bulkPrice: "",
          minOrder: "1",
          maxOrder: "",
          stockQty: "0",
          discountPct: "0",
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
    if (!allowedTypes.has(file.type)) {
      setError("Unsupported image type. Use JPG, PNG, WEBP, or GIF.");
      return;
    }

    const maxBytes = 3 * 1024 * 1024;
    if (file.size > maxBytes) {
      setError("Image is too large. Max size is 3MB.");
      return;
    }

    setImageFileName(file.name);
    setError("");

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result.startsWith("data:image/")) {
        setError("Failed to process selected image. Try another file.");
        return;
      }

      setFormData((prev) => ({ ...prev, imageUrl: result }));
    };
    reader.onerror = () => {
      setError("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-white p-6 rounded-lg border">
      <h2 className="text-lg font-bold mb-6">
        {isEditing ? "Edit Product" : "Add New Product"}
      </h2>

      {error && (
        <div className="p-3 mb-4 bg-red-100 text-red-800 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Name & SKU */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Product Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="e.g., Steel Door Lock"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">SKU *</label>
            <input
              type="text"
              name="sku"
              value={formData.sku}
              onChange={handleChange}
              required
              disabled={isEditing}
              className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
              placeholder="e.g., DL-001"
            />
          </div>
        </div>

        {/* Row 2: Category & Image */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Category *</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-lg"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Image URL or Upload</label>
            <input
              type="text"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Paste image URL or choose a file below"
            />

            <div className="mt-2">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageFileChange}
                className="w-full text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">Upload from your device (max 3MB).</p>
              {imageFileName ? <p className="mt-1 text-xs text-emerald-700">Selected: {imageFileName}</p> : null}
            </div>

            {formData.imageUrl ? (
              <div className="mt-3 overflow-hidden rounded-lg border bg-gray-50">
                <img src={formData.imageUrl} alt="Preview" className="h-28 w-full object-cover" />
              </div>
            ) : null}
          </div>
        </div>

        {/* Row 3: Pricing */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Unit Price (KES) *</label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              required
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Bulk Price (KES)</label>
            <input
              type="number"
              name="bulkPrice"
              value={formData.bulkPrice}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Discount %</label>
            <input
              type="number"
              name="discountPct"
              value={formData.discountPct}
              onChange={handleChange}
              min="0"
              max="100"
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="0"
            />
          </div>
        </div>

        {/* Row 4: Order Limits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Min Order Qty *</label>
            <input
              type="number"
              name="minOrder"
              value={formData.minOrder}
              onChange={handleChange}
              required
              min="1"
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Order Qty</label>
            <input
              type="number"
              name="maxOrder"
              value={formData.maxOrder}
              onChange={handleChange}
              min="1"
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Unlimited"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Stock Quantity</label>
            <input
              type="number"
              name="stockQty"
              value={formData.stockQty}
              onChange={handleChange}
              min="0"
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="0"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="Product details, specifications, etc."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-4 border-t">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : isEditing ? "Update Product" : "Create Product"}
          </button>
        </div>
      </form>
    </div>
  );
}
