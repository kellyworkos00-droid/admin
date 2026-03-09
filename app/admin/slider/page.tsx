import { revalidatePath } from "next/cache";
import { getSliderManagerRows, saveSliderConfig } from "@/lib/slider";
import SliderManagerClient from "./SliderManagerClient";

async function saveSliderItems(formData: FormData) {
  "use server";

  const configJson = String(formData.get("configJson") ?? "");
  if (!configJson) {
    return;
  }

  const parsed = JSON.parse(configJson) as Array<{
    productId: string;
    isFeatured: boolean;
    sliderOrder: number;
    startAt: string | null;
    endAt: string | null;
  }>;

  await saveSliderConfig(parsed);

  revalidatePath("/admin/slider");
}

export default async function AdminSliderManagerPage() {
  const rows = await getSliderManagerRows();

  return <SliderManagerClient initialRows={rows} saveAction={saveSliderItems} />;
}
