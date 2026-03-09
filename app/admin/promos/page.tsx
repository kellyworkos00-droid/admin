import { revalidatePath } from "next/cache";
import { createPromo, listPromos, setPromoActive } from "@/lib/promos";
import { logAuditEvent } from "@/lib/audit";

async function addPromo(formData: FormData) {
  "use server";

  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const discountType = String(formData.get("discountType") ?? "PERCENT") as "PERCENT" | "FIXED";
  const discountValue = Number(formData.get("discountValue") ?? "0");
  const appliesToType = String(formData.get("appliesToType") ?? "ALL") as "ALL" | "CATEGORY" | "PRODUCT";
  const appliesToValue = String(formData.get("appliesToValue") ?? "").trim() || null;
  const startsAt = String(formData.get("startsAt") ?? "").trim() || null;
  const endsAt = String(formData.get("endsAt") ?? "").trim() || null;
  const usageLimitRaw = String(formData.get("usageLimit") ?? "").trim();
  const usageLimit = usageLimitRaw ? Number.parseInt(usageLimitRaw, 10) : null;
  const isActive = String(formData.get("isActive") ?? "") === "on";

  if (!code || !Number.isFinite(discountValue) || discountValue <= 0) {
    return;
  }

  await createPromo({
    code,
    discountType,
    discountValue,
    appliesToType,
    appliesToValue,
    startsAt,
    endsAt,
    usageLimit,
    isActive,
  });

  await logAuditEvent({
    action: "PROMO_CREATED",
    entityType: "promo",
    actor: "admin-ui",
    actorRole: "ADMIN",
    channel: "admin_ui",
    metadata: { code, discountType, discountValue, appliesToType, appliesToValue, isActive },
  });

  revalidatePath("/admin/promos");
}

async function togglePromo(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "").trim();
  const nextActive = String(formData.get("nextActive") ?? "false") === "true";
  if (!id) {
    return;
  }

  await setPromoActive(id, nextActive);
  await logAuditEvent({
    action: "PROMO_TOGGLED",
    entityType: "promo",
    entityId: id,
    actor: "admin-ui",
    actorRole: "ADMIN",
    channel: "admin_ui",
    metadata: { isActive: nextActive },
  });
  revalidatePath("/admin/promos");
}

export default async function AdminPromosPage() {
  const promos = await listPromos();

  return (
    <main className="space-y-5">
      <section className="admin-card">
        <h2 className="text-2xl font-bold text-gray-900">Promo / Coupon Engine</h2>
        <p className="mt-1 text-sm text-gray-600">Create percentage or fixed KES coupons with schedule and usage limits.</p>
      </section>

      <section className="admin-card">
        <h3 className="text-base font-bold text-gray-900">Create Coupon</h3>
        <form action={addPromo} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <input name="code" required placeholder="Code (e.g. KENYA10)" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          <select name="discountType" className="rounded-xl border border-gray-200 px-3 py-2 text-sm">
            <option value="PERCENT">Percent (%)</option>
            <option value="FIXED">Fixed (KES)</option>
          </select>
          <input name="discountValue" type="number" min="1" step="0.01" required placeholder="Discount value" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />

          <select name="appliesToType" className="rounded-xl border border-gray-200 px-3 py-2 text-sm">
            <option value="ALL">All products</option>
            <option value="CATEGORY">Category only</option>
            <option value="PRODUCT">Product only</option>
          </select>
          <input name="appliesToValue" placeholder="Category or Product ID (optional)" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          <input name="usageLimit" type="number" min="1" placeholder="Usage limit (optional)" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />

          <input name="startsAt" type="datetime-local" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          <input name="endsAt" type="datetime-local" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />

          <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700">
            <input name="isActive" type="checkbox" defaultChecked className="h-4 w-4 rounded border-gray-300" />
            Active
          </label>

          <button type="submit" className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 md:w-fit">
            Create Coupon
          </button>
        </form>
      </section>

      <section className="admin-card overflow-x-auto">
        <table className="admin-table min-w-[900px]">
          <thead>
            <tr>
              <th>Code</th>
              <th>Type</th>
              <th>Value</th>
              <th>Scope</th>
              <th>Window</th>
              <th>Usage</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {promos.map((promo) => (
              <tr key={promo.id}>
                <td className="font-semibold text-gray-900">{promo.code}</td>
                <td>{promo.discountType}</td>
                <td>{promo.discountType === "PERCENT" ? `${promo.discountValue}%` : `KES ${promo.discountValue}`}</td>
                <td>{promo.appliesToType}{promo.appliesToValue ? `: ${promo.appliesToValue}` : ""}</td>
                <td>{promo.startsAt || "-"} to {promo.endsAt || "-"}</td>
                <td>{promo.usageCount}/{promo.usageLimit ?? "∞"}</td>
                <td>
                  <span className={`rounded-full px-2 py-1 text-xs font-bold ${promo.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"}`}>
                    {promo.isActive ? "Active" : "Paused"}
                  </span>
                </td>
                <td>
                  <form action={togglePromo}>
                    <input type="hidden" name="id" value={promo.id} />
                    <input type="hidden" name="nextActive" value={String(!promo.isActive)} />
                    <button className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                      {promo.isActive ? "Pause" : "Activate"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
