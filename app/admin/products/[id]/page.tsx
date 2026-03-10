import Image from "next/image";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

const FALLBACK_IMAGE_URL = "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1200&q=80";
const HOME_BROWSE_CATEGORIES = [
  "Groceries",
  "Home & Living",
  "Electronics",
  "Tools & Hardware",
  "Fashion & Apparel",
  "Health & Beauty",
];

const SIZES_MARKER = "[sizes]";
const SIZE_PRICES_MARKER = "[size_prices]";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function toNumber(value: FormDataEntryValue | null, fallback = 0): number {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toInt(value: FormDataEntryValue | null, fallback = 0): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

async function fileToDataUrl(file: File): Promise<string | null> {
  if (!file.type.startsWith("image/") || file.size === 0) {
    return null;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  return `data:${file.type};base64,${base64}`;
}

function parseSizesInput(value: string): string[] {
  return value
    .split(/[|,\/]/g)
    .map((size) => size.trim())
    .filter(Boolean)
    .filter((size, index, all) => all.findIndex((item) => item.toLowerCase() === size.toLowerCase()) === index)
    .slice(0, 12);
}

function parseSizePricesInput(value: string): Record<string, number> {
  const result: Record<string, number> = {};
  const entries = value
    .split(/[|,]/g)
    .map((entry) => entry.trim())
    .filter(Boolean);

  for (const entry of entries) {
    const [sizeRaw, priceRaw] = entry.split(":");
    const size = String(sizeRaw ?? "").trim();
    const price = Number(String(priceRaw ?? "").trim());
    if (!size || !Number.isFinite(price) || price <= 0) {
      continue;
    }
    result[size] = price;
  }

  return result;
}

function serializeSizePrices(value: Record<string, number>) {
  return Object.entries(value)
    .filter(([, price]) => Number.isFinite(price) && price > 0)
    .map(([size, price]) => `${size}:${price}`)
    .join(" | ");
}

function extractMarkerPayload(source: string, marker: string) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex === -1) {
    return "";
  }

  const afterMarker = source.slice(markerIndex + marker.length);
  const nextIndexes = [SIZES_MARKER, SIZE_PRICES_MARKER]
    .map((candidate) => afterMarker.indexOf(candidate))
    .filter((index) => index >= 0);

  const endIndex = nextIndexes.length > 0 ? Math.min(...nextIndexes) : afterMarker.length;
  return afterMarker.slice(0, endIndex).trim();
}

function splitDescriptionAndSizes(value: string | null | undefined) {
  const descriptionRaw = (value ?? "").trim();
  const sizeMarkerIndex = descriptionRaw.indexOf(SIZES_MARKER);
  const sizePricesMarkerIndex = descriptionRaw.indexOf(SIZE_PRICES_MARKER);

  const metadataIndexes = [sizeMarkerIndex, sizePricesMarkerIndex].filter((index) => index >= 0);
  const metadataStartIndex = metadataIndexes.length > 0 ? Math.min(...metadataIndexes) : -1;

  if (metadataStartIndex === -1) {
    return { description: descriptionRaw, sizes: [] as string[], sizePrices: {} as Record<string, number> };
  }

  const description = descriptionRaw.slice(0, metadataStartIndex).trim();
  const metadataSection = descriptionRaw.slice(metadataStartIndex);

  return {
    description,
    sizes: parseSizesInput(extractMarkerPayload(metadataSection, SIZES_MARKER)),
    sizePrices: parseSizePricesInput(extractMarkerPayload(metadataSection, SIZE_PRICES_MARKER)),
  };
}

function buildDescriptionWithSizes(description: string, sizes: string[], sizePrices: Record<string, number>) {
  const cleanDescription = description.trim();
  const sizePricesValue = serializeSizePrices(sizePrices);
  if (sizes.length === 0 && !sizePricesValue) {
    return cleanDescription;
  }

  const metadataParts: string[] = [];
  if (sizes.length > 0) {
    metadataParts.push(`${SIZES_MARKER}${sizes.join("|")}`);
  }
  if (sizePricesValue) {
    metadataParts.push(`${SIZE_PRICES_MARKER}${sizePricesValue.replace(/\s*\|\s*/g, "|")}`);
  }

  const metadata = metadataParts.join("\n");
  return cleanDescription ? `${cleanDescription}\n\n${metadata}` : metadata;
}

type RouteProps = {
  params: {
    id: string;
  };
};

export default async function EditProductPage({ params }: RouteProps) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
  });

  if (!product) {
    notFound();
  }

  const metadata = splitDescriptionAndSizes(product.description);
  const existingCategories = await prisma.product.findMany({
    select: { category: true },
  });
  const categoryOptions = Array.from(
    new Set([
      ...HOME_BROWSE_CATEGORIES,
      ...existingCategories.map((item) => item.category.trim()).filter(Boolean),
    ])
  ).sort((a, b) => a.localeCompare(b));

  async function updateProduct(formData: FormData) {
    "use server";

    const id = getText(formData.get("id"));
    const name = getText(formData.get("name"));
    const sku = getText(formData.get("sku"));
    const category = getText(formData.get("category"));

    if (!id || !name || !sku || !category) {
      return;
    }

    const imageUrlText = getText(formData.get("imageUrl"));
    const imageFile = formData.get("imageFile");

    const currentProduct = await prisma.product.findUnique({
      where: { id },
      select: { imageUrl: true },
    });

    let imageUrl = imageUrlText || currentProduct?.imageUrl || FALLBACK_IMAGE_URL;
    if (imageFile instanceof File && imageFile.size > 0) {
      const uploadedImageUrl = await fileToDataUrl(imageFile);
      if (uploadedImageUrl) {
        imageUrl = uploadedImageUrl;
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        sku,
        name,
        slug: getText(formData.get("slug")) || slugify(name),
        category,
        description:
          buildDescriptionWithSizes(
            getText(formData.get("description")),
            parseSizesInput(getText(formData.get("sizes"))),
            parseSizePricesInput(getText(formData.get("sizePrices")))
          ) || null,
        imageUrl,
        price: toNumber(formData.get("price"), 0),
        bulkPrice: toNumber(formData.get("bulkPrice"), 0),
        minOrder: Math.max(1, toInt(formData.get("minOrder"), 1)),
        stockQty: Math.max(0, toInt(formData.get("stockQty"), 0)),
        discountPct: Math.max(0, toInt(formData.get("discountPct"), 0)),
        isActive: getText(formData.get("isActive")) === "on",
      },
    });

    await logAuditEvent({
      action: "PRODUCT_UPDATED",
      entityType: "product",
      entityId: updated.id,
      actor: "admin-ui",
      actorRole: "ADMIN",
      channel: "admin_ui",
      metadata: { sku: updated.sku, name: updated.name, category: updated.category },
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${id}`);
    redirect(`/admin/products/${id}?updated=1`);
  }

  return (
    <main className="space-y-5">
      <section className="admin-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Product Editor</p>
            <h2 className="mt-1 text-2xl font-bold text-gray-900">Edit {product.name}</h2>
            <p className="mt-1 text-sm text-gray-600">Update pricing, category, image, stock, and size-based pricing from one page.</p>
          </div>
          <Link href="/admin/products" className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Back to Products
          </Link>
        </div>
      </section>

      <section className="admin-card grid gap-5 lg:grid-cols-[300px_1fr]">
        <div className="space-y-3">
          <div className="relative h-56 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
            <Image
              src={product.imageUrl || FALLBACK_IMAGE_URL}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 100vw, 300px"
              className="object-cover"
            />
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
            <p><span className="font-semibold">SKU:</span> {product.sku}</p>
            <p><span className="font-semibold">Slug:</span> {product.slug}</p>
            <p><span className="font-semibold">Status:</span> {product.isActive ? "Active" : "Inactive"}</p>
          </div>
        </div>

        <form action={updateProduct} encType="multipart/form-data" className="space-y-4">
          <input type="hidden" name="id" value={product.id} />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="text-sm text-gray-700">
              Product Name
              <input name="name" defaultValue={product.name} required className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-gray-700">
              SKU
              <input name="sku" defaultValue={product.sku} required className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-gray-700 md:col-span-2">
              Slug
              <input name="slug" defaultValue={product.slug} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-gray-700">
              Category
              <select name="category" defaultValue={product.category} required className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm">
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-gray-700">
              Min Order
              <input name="minOrder" type="number" min="1" defaultValue={product.minOrder} required className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-gray-700">
              Retail Price (KES)
              <input name="price" type="number" min="0" step="0.01" defaultValue={String(Number(product.price))} required className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-gray-700">
              Bulk Price (KES)
              <input name="bulkPrice" type="number" min="0" step="0.01" defaultValue={String(Number(product.bulkPrice))} required className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-gray-700">
              Stock Qty
              <input name="stockQty" type="number" min="0" defaultValue={product.stockQty} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-gray-700">
              Discount %
              <input name="discountPct" type="number" min="0" max="100" defaultValue={product.discountPct} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-gray-700 md:col-span-2">
              Sizes
              <input
                name="sizes"
                defaultValue={metadata.sizes.join(" | ")}
                placeholder="S | M | L or 250ml, 500ml"
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-gray-700 md:col-span-2">
              Size Prices
              <input
                name="sizePrices"
                defaultValue={serializeSizePrices(metadata.sizePrices)}
                placeholder="S:1200 | M:1500"
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-gray-700 md:col-span-2">
              Upload New Image
              <input name="imageFile" type="file" accept="image/*" className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-gray-700 md:col-span-2">
              Description
              <textarea name="description" rows={4} defaultValue={metadata.description} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
            </label>
          </div>

          <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            <input name="isActive" type="checkbox" defaultChecked={product.isActive} className="h-4 w-4 rounded border-gray-300" />
            Product is active
          </label>

          <div className="flex flex-wrap gap-2">
            <button type="submit" className="rounded-xl bg-gradient-to-r from-rose-700 to-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:from-rose-800 hover:to-red-700">
              Update Product
            </button>
            <Link href="/admin/products" className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
