import { revalidatePath } from "next/cache";
import { listHomeSlides, saveHomeSlides, type HomeSlide } from "@/lib/content";
import { logAuditEvent } from "@/lib/audit";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

function getUploadTargetDir() {
  // Save uploaded files where the storefront can serve them from /uploads/*
  return path.resolve(process.cwd(), "..", "eterna", "public", "uploads");
}

function sanitizeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function saveUploadedImage(file: File, slideId: string) {
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
  if (!allowedTypes.has(file.type)) {
    throw new Error("Unsupported image type. Use JPG, PNG, WEBP, or GIF.");
  }

  const maxBytes = 8 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error("Image is too large. Max size is 8MB.");
  }

  const ext = path.extname(file.name || "").toLowerCase() || ".jpg";
  const base = sanitizeFileName(path.basename(file.name || `slide-${slideId}`, ext)) || `slide-${slideId}`;
  const filename = `${slideId}-${Date.now()}-${base}${ext}`;

  const uploadDir = getUploadTargetDir();
  await mkdir(uploadDir, { recursive: true });

  const arrayBuffer = await file.arrayBuffer();
  const filePath = path.join(uploadDir, filename);
  await writeFile(filePath, Buffer.from(arrayBuffer));

  return `/uploads/${filename}`;
}

async function saveContent(formData: FormData) {
  "use server";

  const slideIdsRaw = String(formData.get("slideIds") ?? "");
  if (!slideIdsRaw) {
    return;
  }

  const slideIds = slideIdsRaw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const slides: HomeSlide[] = [];
  for (const id of slideIds) {
    let imageUrl = String(formData.get(`image_${id}`) ?? "").trim();
    const imageFile = formData.get(`imageFile_${id}`);

    if (typeof File !== "undefined" && imageFile instanceof File && imageFile.size > 0) {
      imageUrl = await saveUploadedImage(imageFile, id);
    }

    slides.push({
      id,
      title: String(formData.get(`title_${id}`) ?? "").trim(),
      subtitle: String(formData.get(`subtitle_${id}`) ?? "").trim(),
      description: String(formData.get(`description_${id}`) ?? "").trim(),
      cta: String(formData.get(`cta_${id}`) ?? "").trim(),
      badge: String(formData.get(`badge_${id}`) ?? "").trim(),
      stats: String(formData.get(`stats_${id}`) ?? "")
        .split("|")
        .map((item) => item.trim())
        .filter(Boolean),
      image: imageUrl,
      link: String(formData.get(`link_${id}`) ?? "").trim(),
      sortOrder: Number.parseInt(String(formData.get(`sort_${id}`) ?? "999"), 10) || 999,
      isActive: String(formData.get(`active_${id}`) ?? "") === "on",
    });
  }

  await saveHomeSlides(slides);
  await logAuditEvent({
    action: "CONTENT_SAVED",
    entityType: "home_slide",
    actor: "admin-ui",
    actorRole: "ADMIN",
    channel: "admin_ui",
    metadata: {
      totalSlides: slides.length,
      activeSlides: slides.filter((slide) => slide.isActive).length,
    },
  });
  revalidatePath("/admin/content");
  revalidatePath("/");
}

export default async function AdminContentPage() {
  const slides = await listHomeSlides();

  return (
    <main className="space-y-5">
      <section className="admin-card">
        <h2 className="text-2xl font-bold text-gray-900">Content Manager</h2>
        <p className="mt-1 text-sm text-gray-600">Manage homepage hero slides and marketing text without code changes.</p>
      </section>

      <form action={saveContent} className="space-y-4" encType="multipart/form-data">
        <input type="hidden" name="slideIds" value={slides.map((slide) => slide.id).join(",")} />

        {slides.map((slide, index) => (
          <article key={slide.id} className="admin-card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Slide {index + 1}</h3>
              <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700">ID: {slide.id}</span>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              <label className="text-sm text-gray-700">Title<input name={`title_${slide.id}`} defaultValue={slide.title} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" /></label>
              <label className="text-sm text-gray-700">Subtitle<input name={`subtitle_${slide.id}`} defaultValue={slide.subtitle} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" /></label>
              <label className="text-sm text-gray-700">Badge<input name={`badge_${slide.id}`} defaultValue={slide.badge} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" /></label>
              <label className="text-sm text-gray-700 md:col-span-2 xl:col-span-3">Description<textarea name={`description_${slide.id}`} defaultValue={slide.description} rows={3} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" /></label>
              <label className="text-sm text-gray-700">CTA Text<input name={`cta_${slide.id}`} defaultValue={slide.cta} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" /></label>
              <label className="text-sm text-gray-700">CTA Link<input name={`link_${slide.id}`} defaultValue={slide.link} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" /></label>
              <label className="text-sm text-gray-700">Sort Order<input name={`sort_${slide.id}`} type="number" min="1" defaultValue={slide.sortOrder} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" /></label>
              <label className="text-sm text-gray-700 md:col-span-2 xl:col-span-3">Image URL<input name={`image_${slide.id}`} defaultValue={slide.image} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" /></label>
              <label className="text-sm text-gray-700 md:col-span-2 xl:col-span-3">Upload New Image<input name={`imageFile_${slide.id}`} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" /></label>
              <label className="text-sm text-gray-700 md:col-span-2 xl:col-span-3">Stats (separate with |)<input name={`stats_${slide.id}`} defaultValue={slide.stats.join(" | ")} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" /></label>
              <label className="flex items-center gap-2 text-sm text-gray-700"><input name={`active_${slide.id}`} type="checkbox" defaultChecked={slide.isActive} className="h-4 w-4 rounded border-gray-300" /> Active</label>
            </div>
          </article>
        ))}

        <button type="submit" className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">Save Content</button>
      </form>
    </main>
  );
}
