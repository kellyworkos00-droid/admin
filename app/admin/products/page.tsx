import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

const FALLBACK_IMAGE_URL = "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1200&q=80";

type ProductFormRecord = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  imageUrl: string;
  price: string;
  bulkPrice: string;
  minOrder: string;
  stockQty: string;
  discountPct: string;
  isActive: boolean;
};

function formatKes(value: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(value);
}

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

function readCell(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

async function createProduct(formData: FormData) {
  "use server";

  const sku = getText(formData.get("sku"));
  const name = getText(formData.get("name"));
  const category = getText(formData.get("category"));

  if (!sku || !name || !category) {
    return;
  }

  const slugInput = getText(formData.get("slug"));
  const imageUrlText = getText(formData.get("imageUrl"));
  const imageFile = formData.get("imageFile");

  let imageUrl = imageUrlText || FALLBACK_IMAGE_URL;
  if (imageFile instanceof File && imageFile.size > 0) {
    const uploadedImageUrl = await fileToDataUrl(imageFile);
    if (uploadedImageUrl) {
      imageUrl = uploadedImageUrl;
    }
  }

  await prisma.product.create({
    data: {
      sku,
      name,
      slug: slugInput || slugify(name),
      description: getText(formData.get("description")) || null,
      category,
      imageUrl,
      price: toNumber(formData.get("price"), 0),
      bulkPrice: toNumber(formData.get("bulkPrice"), 0),
      minOrder: Math.max(1, toInt(formData.get("minOrder"), 1)),
      stockQty: Math.max(0, toInt(formData.get("stockQty"), 0)),
      discountPct: Math.max(0, toInt(formData.get("discountPct"), 0)),
      isActive: true,
    },
  });

  revalidatePath("/admin/products");
}

async function updateProduct(formData: FormData) {
  "use server";

  const id = getText(formData.get("id"));
  if (!id) {
    return;
  }

  const name = getText(formData.get("name"));
  const imageUrlText = getText(formData.get("imageUrl"));
  const imageFile = formData.get("imageFile");

  let imageUrl = imageUrlText || FALLBACK_IMAGE_URL;
  if (imageFile instanceof File && imageFile.size > 0) {
    const uploadedImageUrl = await fileToDataUrl(imageFile);
    if (uploadedImageUrl) {
      imageUrl = uploadedImageUrl;
    }
  }

  await prisma.product.update({
    where: { id },
    data: {
      sku: getText(formData.get("sku")),
      name,
      slug: getText(formData.get("slug")) || slugify(name),
      description: getText(formData.get("description")) || null,
      category: getText(formData.get("category")),
      imageUrl,
      price: toNumber(formData.get("price"), 0),
      bulkPrice: toNumber(formData.get("bulkPrice"), 0),
      minOrder: Math.max(1, toInt(formData.get("minOrder"), 1)),
      stockQty: Math.max(0, toInt(formData.get("stockQty"), 0)),
      discountPct: Math.max(0, toInt(formData.get("discountPct"), 0)),
      isActive: getText(formData.get("isActive")) === "on",
    },
  });

  revalidatePath("/admin/products");
}

async function importProducts(formData: FormData) {
  "use server";

  const file = formData.get("sheet");
  if (!(file instanceof File) || file.size === 0) {
    return;
  }

  const workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return;
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  for (const row of rows) {
    const sku = readCell(row, ["sku", "SKU", "Sku"]);
    const name = readCell(row, ["name", "Name", "Product Name"]);
    if (!sku || !name) {
      continue;
    }

    const category = readCell(row, ["category", "Category"]) || "Groceries";
    const slug = readCell(row, ["slug", "Slug"]) || slugify(name);
    const imageUrl = readCell(row, ["imageUrl", "image", "Image", "Image URL"]) || FALLBACK_IMAGE_URL;
    const description = readCell(row, ["description", "Description"]) || null;

    const price = Number(readCell(row, ["price", "Price"]) || "0");
    const bulkPrice = Number(readCell(row, ["bulkPrice", "bulk_price", "Bulk Price"]) || String(price || 0));
    const minOrder = Math.max(1, Number.parseInt(readCell(row, ["minOrder", "min_order", "Min Order"]) || "1", 10));
    const stockQty = Math.max(0, Number.parseInt(readCell(row, ["stockQty", "stock_qty", "Stock Qty"]) || "0", 10));
    const discountPct = Math.max(0, Number.parseInt(readCell(row, ["discountPct", "discount", "Discount %"]) || "0", 10));

    await prisma.product.upsert({
      where: { sku },
      create: {
        sku,
        name,
        slug,
        description,
        category,
        imageUrl,
        price: Number.isFinite(price) && price > 0 ? price : 1,
        bulkPrice: Number.isFinite(bulkPrice) && bulkPrice > 0 ? bulkPrice : 1,
        minOrder,
        stockQty,
        discountPct,
        isActive: true,
      },
      update: {
        name,
        slug,
        description,
        category,
        imageUrl,
        price: Number.isFinite(price) && price > 0 ? price : 1,
        bulkPrice: Number.isFinite(bulkPrice) && bulkPrice > 0 ? bulkPrice : 1,
        minOrder,
        stockQty,
        discountPct,
      },
    });
  }

  revalidatePath("/admin/products");
}

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  });

  const rows: ProductFormRecord[] = products.map((product) => ({
    id: product.id,
    sku: product.sku,
    name: product.name,
    slug: product.slug,
    description: product.description ?? "",
    category: product.category,
    imageUrl: product.imageUrl,
    price: String(Number(product.price)),
    bulkPrice: String(Number(product.bulkPrice)),
    minOrder: String(product.minOrder),
    stockQty: String(product.stockQty),
    discountPct: String(product.discountPct),
    isActive: product.isActive,
  }));

  return (
    <main className="space-y-5">
      <section className="admin-card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Products</h2>
          <p className="mt-1 text-sm text-gray-600">Manage Kenyan catalog pricing in KES, stock, and product images.</p>
        </div>
      </section>

      <section className="admin-card">
        <h3 className="text-base font-bold text-gray-900">Add Product</h3>
        <form action={createProduct} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" encType="multipart/form-data">
          <input name="sku" required placeholder="SKU" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          <input name="name" required placeholder="Product name" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          <input name="slug" placeholder="Slug (optional)" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          <input name="category" required placeholder="Category" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          <input name="price" required type="number" min="0" step="0.01" placeholder="Retail price (KES)" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          <input name="bulkPrice" required type="number" min="0" step="0.01" placeholder="Bulk price (KES)" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          <input name="minOrder" required type="number" min="1" placeholder="Minimum order" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          <input name="stockQty" type="number" min="0" placeholder="Stock qty" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          <input name="discountPct" type="number" min="0" max="100" placeholder="Discount %" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          <input name="imageUrl" placeholder="Image URL (optional)" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          <input name="imageFile" type="file" accept="image/*" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          <textarea name="description" placeholder="Description (optional)" className="rounded-xl border border-gray-200 px-3 py-2 text-sm md:col-span-2 xl:col-span-3" rows={3} />
          <button type="submit" className="rounded-xl bg-gradient-to-r from-rose-700 to-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:from-rose-800 hover:to-red-700 md:w-fit">
            Save Product
          </button>
        </form>
      </section>

      <section className="admin-card">
        <h3 className="text-base font-bold text-gray-900">Import Products From Excel</h3>
        <p className="mt-1 text-xs text-gray-600">
          Upload `.xlsx`, `.xls`, or `.csv` with columns like: `sku`, `name`, `category`, `price`, `bulkPrice`, `minOrder`, `stockQty`, `discountPct`, `imageUrl`.
        </p>
        <a
          href="/api/v1/admin/products/template"
          className="mt-3 inline-flex rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Download Excel Template
        </a>
        <form action={importProducts} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center" encType="multipart/form-data">
          <input name="sheet" required type="file" accept=".xlsx,.xls,.csv" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          <button type="submit" className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Import Sheet
          </button>
        </form>
      </section>

      <section className="admin-card">
        <h3 className="mb-4 text-base font-bold text-gray-900">Edit Products</h3>
        <div className="space-y-4">
          {rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">No products yet. Add one manually or import from Excel.</p>
          ) : null}

          {rows.map((row) => (
            <form
              key={row.id}
              action={updateProduct}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
              encType="multipart/form-data"
            >
              <input type="hidden" name="id" value={row.id} />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="xl:col-span-2">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Product</p>
                  <input name="name" defaultValue={row.name} required className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">SKU</p>
                  <input name="sku" defaultValue={row.sku} required className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Slug</p>
                  <input name="slug" defaultValue={row.slug} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Category</p>
                  <input name="category" defaultValue={row.category} required className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Retail Price</p>
                  <input name="price" type="number" min="0" step="0.01" defaultValue={row.price} required className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Bulk Price</p>
                  <input name="bulkPrice" type="number" min="0" step="0.01" defaultValue={row.bulkPrice} required className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Min Order</p>
                  <input name="minOrder" type="number" min="1" defaultValue={row.minOrder} required className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Stock Qty</p>
                  <input name="stockQty" type="number" min="0" defaultValue={row.stockQty} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Discount %</p>
                  <input name="discountPct" type="number" min="0" max="100" defaultValue={row.discountPct} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                </div>
                <div className="xl:col-span-2">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Image URL</p>
                  <input name="imageUrl" defaultValue={row.imageUrl} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Replace Image</p>
                  <input name="imageFile" type="file" accept="image/*" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                </div>
                <div className="xl:col-span-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Description</p>
                  <textarea name="description" rows={2} defaultValue={row.description} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <input id={`active-${row.id}`} name="isActive" type="checkbox" defaultChecked={row.isActive} className="h-4 w-4 rounded border-gray-300" />
                  <label htmlFor={`active-${row.id}`} className="text-sm text-gray-700">Active</label>
                </div>
                <div className="text-sm text-gray-700">
                  <span className="font-semibold">KES Preview:</span> {formatKes(Number(row.bulkPrice || 0))}
                </div>
                <button type="submit" className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">
                  Update Product
                </button>
              </div>
            </form>
          ))}
        </div>
      </section>
    </main>
  );
}
