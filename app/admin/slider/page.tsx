export const dynamic = "force-dynamic";
export const revalidate = 0;

import { revalidatePath } from "next/cache";
import { getSliderManagerRows, saveSliderConfig } from "@/lib/slider";
import { logAuditEvent } from "@/lib/audit";
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
  await logAuditEvent({
    action: "SLIDER_CONFIG_SAVED",
    entityType: "slider",
    actor: "admin-ui",
    actorRole: "ADMIN",
    channel: "admin_ui",
    metadata: {
      totalItems: parsed.length,
      featuredItems: parsed.filter((item) => item.isFeatured).length,
    },
  });

  revalidatePath("/admin/slider");
}

export default async function AdminSliderManagerPage() {
  const rows = await getSliderManagerRows();

  return <SliderManagerClient initialRows={rows} saveAction={saveSliderItems} />;
}
