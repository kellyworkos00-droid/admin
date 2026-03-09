import { jsonOk } from "@/lib/api";
import { getSliderProducts } from "@/lib/slider";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const items = await getSliderProducts(8);
  return jsonOk(items);
}
