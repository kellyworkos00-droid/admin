import { revalidatePath } from "next/cache";
import { listHomeSlides, saveHomeSlides, type HomeSlide } from "@/lib/content";
import { logAuditEvent } from "@/lib/audit";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const inputClass =
  "mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100";

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
  const activeSlides = slides.filter((slide) => slide.isActive).length;

  return (
    <main className="space-y-5 pb-28">
      <section className="admin-card overflow-hidden p-0">
        <div className="bg-gradient-to-r from-rose-700 via-red-600 to-rose-700 px-5 py-6 text-white md:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-100">Content Studio</p>
          <h2 className="mt-1 text-2xl font-bold">Homepage Hero Manager</h2>
          <p className="mt-2 max-w-3xl text-sm text-rose-50/95">
            Curate messaging, visuals, and CTA flow for your storefront hero section. Update text, upload photos, and reorder
            slides without touching code.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 border-t border-rose-100 bg-white px-5 py-4 md:grid-cols-3 md:px-6">
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Slides</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{slides.length}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Active</p>
            <p className="mt-1 text-xl font-bold text-emerald-800">{activeSlides}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Inactive</p>
            <p className="mt-1 text-xl font-bold text-amber-800">{slides.length - activeSlides}</p>
          </div>
        </div>
      </section>

      <form action={saveContent} className="space-y-4" encType="multipart/form-data">
        <input type="hidden" name="slideIds" value={slides.map((slide) => slide.id).join(",")} />

        {slides.map((slide, index) => (
          <article key={slide.id} className="admin-card border border-gray-200/90 p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-4 md:px-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Slide {index + 1}</h3>
                <p className="text-xs text-gray-500">Configure headline, image, CTA, and status.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700">ID: {slide.id}</span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    slide.isActive ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {slide.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 px-5 py-5 md:px-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Messaging</p>

                <label className="block text-sm font-medium text-gray-700">
                  Title
                  <input name={`title_${slide.id}`} defaultValue={slide.title} className={inputClass} />
                </label>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Subtitle
                    <input name={`subtitle_${slide.id}`} defaultValue={slide.subtitle} className={inputClass} />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Badge
                    <input name={`badge_${slide.id}`} defaultValue={slide.badge} className={inputClass} />
                  </label>
                </div>

                <label className="block text-sm font-medium text-gray-700">
                  Description
                  <textarea name={`description_${slide.id}`} defaultValue={slide.description} rows={4} className={inputClass} />
                </label>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="block text-sm font-medium text-gray-700">
                    CTA Text
                    <input name={`cta_${slide.id}`} defaultValue={slide.cta} className={inputClass} />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    CTA Link
                    <input name={`link_${slide.id}`} defaultValue={slide.link} className={inputClass} />
                  </label>
                </div>

                <label className="block text-sm font-medium text-gray-700">
                  Stats (separate with |)
                  <input name={`stats_${slide.id}`} defaultValue={slide.stats.join(" | ")} className={inputClass} />
                </label>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Sort Order
                    <input name={`sort_${slide.id}`} type="number" min="1" defaultValue={slide.sortOrder} className={inputClass} />
                  </label>
                  <label className="mt-7 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700">
                    <input name={`active_${slide.id}`} type="checkbox" defaultChecked={slide.isActive} className="h-4 w-4 rounded border-gray-300" />
                    Show this slide
                  </label>
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-rose-200 bg-rose-50/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Visual</p>

                <label className="block text-sm font-medium text-gray-700">
                  Image URL
                  <input name={`image_${slide.id}`} defaultValue={slide.image} className={inputClass} />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  Upload New Image
                  <input
                    name={`imageFile_${slide.id}`}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-rose-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-rose-700 hover:file:bg-rose-200"
                  />
                  <span className="mt-1 block text-xs text-gray-500">Leave empty to keep the current image. Max size: 8MB.</span>
                </label>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Current Image Preview</p>
                  <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <img src={slide.image} alt={`Slide ${index + 1} preview`} className="h-48 w-full object-cover" />
                  </div>
                </div>
              </div>
            </div>
          </article>
        ))}

        <div className="fixed bottom-4 right-4 z-30">
          <button
            type="submit"
            className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-gray-900/20 transition hover:-translate-y-0.5 hover:bg-gray-800"
          >
            Save Content Changes
          </button>
        </div>
      </form>
    </main>
  );
}
