import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { logAuditEvent } from "@/lib/audit";

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

async function generateSimpleSku() {
  const totalProducts = await prisma.product.count();
  let nextNumber = totalProducts + 1;

  while (true) {
    const sku = `ET-${String(nextNumber).padStart(3, "0")}`;
    const existing = await prisma.product.findUnique({ where: { sku } });
    if (!existing) {
      return sku;
    }
    nextNumber += 1;
  }
}

async function createProduct(formData: FormData) {
  "use server";

  const skuInput = getText(formData.get("sku"));
  const name = getText(formData.get("name"));
  const category = getText(formData.get("category"));

  if (!name || !category) {
    return;
  }

  const sku = skuInput || (await generateSimpleSku());

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

  const created = await prisma.product.create({
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

  await logAuditEvent({
    action: "PRODUCT_CREATED",
    entityType: "product",
    entityId: created.id,
    actor: "admin-ui",
    actorRole: "ADMIN",
    channel: "admin_ui",
    metadata: { sku: created.sku, name: created.name, category: created.category },
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

  const updated = await prisma.product.update({
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

  let importedCount = 0;

  for (const row of rows) {
    const sku = readCell(row, ["sku", "SKU", "Sku"]);
    const name = readCell(row, ["name", "Name", "Product Name"]);
    if (!name) {
      continue;
    }

    const resolvedSku = sku || (await generateSimpleSku());

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
      where: { sku: resolvedSku },
      create: {
        sku: resolvedSku,
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

    importedCount += 1;
  }

  await logAuditEvent({
    action: "PRODUCTS_IMPORTED",
    entityType: "product",
    actor: "admin-ui",
    actorRole: "ADMIN",
    channel: "admin_ui",
    metadata: { importedCount, fileName: file.name },
  });

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
          <input name="sku" placeholder="SKU (optional, auto: ET-001)" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
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
        <p className="mt-1 text-xs text-gray-600">
          Homepage sliding offers auto-refresh from product data. Update `discountPct` and product image to control what appears in the slider.
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
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">No products yet. Add one manually or import from Excel.</p>
          ) : null}

          {rows.map((row) => (
            <article key={row.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="grid gap-0 md:grid-cols-[180px_1fr]">
                <div className="h-48 bg-gray-100 md:h-full">
                  <img src={row.imageUrl || FALLBACK_IMAGE_URL} alt={row.name} className="h-full w-full object-cover" loading="lazy" />
                </div>

                <div className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{row.category}</p>
                      <h4 className="mt-1 text-lg font-bold text-gray-900">{row.name}</h4>
                      <p className="mt-1 text-xs text-gray-500">SKU: {row.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary-700">{formatKes(Number(row.bulkPrice || 0))}</p>
                      <p className="text-xs text-gray-500 line-through">{formatKes(Number(row.price || 0))}</p>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-gray-600">
                    Min order: {row.minOrder} | Stock: {row.stockQty} | Discount: {row.discountPct}%
                  </p>

                  <details className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <summary className="cursor-pointer rounded-lg bg-gray-900 px-3 py-2 text-center text-sm font-semibold text-white">
                      Edit Product
                    </summary>

                    <form action={updateProduct} className="mt-3 space-y-3" encType="multipart/form-data">
                      <input type="hidden" name="id" value={row.id} />

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <input name="name" defaultValue={row.name} required className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                        <input name="sku" defaultValue={row.sku} required className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                        <input name="slug" defaultValue={row.slug} className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                        <input name="category" defaultValue={row.category} required className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                        <input name="price" type="number" min="0" step="0.01" defaultValue={row.price} required className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                        <input name="bulkPrice" type="number" min="0" step="0.01" defaultValue={row.bulkPrice} required className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                        <input name="minOrder" type="number" min="1" defaultValue={row.minOrder} required className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                        <input name="stockQty" type="number" min="0" defaultValue={row.stockQty} className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                        <input name="discountPct" type="number" min="0" max="100" defaultValue={row.discountPct} className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                        <input name="imageUrl" defaultValue={row.imageUrl} className="rounded-xl border border-gray-200 px-3 py-2 text-sm md:col-span-2" placeholder="Image URL" />
                        <input name="imageFile" type="file" accept="image/*" className="rounded-xl border border-gray-200 px-3 py-2 text-sm md:col-span-2" />
                      </div>

                      <textarea name="description" rows={2} defaultValue={row.description} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input name="isActive" type="checkbox" defaultChecked={row.isActive} className="h-4 w-4 rounded border-gray-300" />
                          Active
                        </label>
                        <button type="submit" className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">
                          Save Changes
                        </button>
                      </div>
                    </form>
                  </details>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
