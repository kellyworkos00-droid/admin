import { jsonOk } from "@/lib/api";
import { listHomeSlides } from "@/lib/content";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const slides = await listHomeSlides();
  return jsonOk(slides.filter((slide) => slide.isActive));
}
