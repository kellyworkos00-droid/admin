export const dynamic = "force-dynamic";
export const revalidate = 0;

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCustomerProfiles, setCustomerVip } from "@/lib/customers";
import { logAuditEvent } from "@/lib/audit";

function formatKes(value: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(value);
}

async function toggleVip(formData: FormData) {
  "use server";

  const customerKey = String(formData.get("customerKey") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const nextVip = String(formData.get("nextVip") ?? "false") === "true";

  if (!customerKey) {
    return;
  }

  await setCustomerVip(customerKey, nextVip, {
    displayName: displayName || undefined,
    phone: phone || undefined,
    email: email || undefined,
  });

  await logAuditEvent({
    action: "CUSTOMER_VIP_TOGGLED",
    entityType: "customer",
    entityId: customerKey,
    actor: "admin-ui",
    actorRole: "ADMIN",
    channel: "admin_ui",
    metadata: { displayName, phone, email, isVip: nextVip },
  });

  revalidatePath("/admin/customers");
}

export default async function AdminCustomersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      orderNumber: true,
      customerName: true,
      customerPhone: true,
      customerEmail: true,
      total: true,
      createdAt: true,
      status: true,
    },
  });

  const customerMap = new Map<string, {
    key: string;
    name: string;
    phone: string;
    email: string;
    orderCount: number;
    totalSpend: number;
    recentOrders: Array<{ orderNumber: string; date: Date; status: string }>;
  }>();

  for (const order of orders) {
    const key = order.customerPhone || order.customerEmail || order.customerName;
    if (!key) {
      continue;
    }

    const existing = customerMap.get(key) ?? {
      key,
      name: order.customerName,
      phone: order.customerPhone,
      email: order.customerEmail ?? "",
      orderCount: 0,
      totalSpend: 0,
      recentOrders: [],
    };

    existing.orderCount += 1;
    existing.totalSpend += Number(order.total);
    if (existing.recentOrders.length < 3) {
      existing.recentOrders.push({
        orderNumber: order.orderNumber,
        date: order.createdAt,
        status: order.status,
      });
    }

    customerMap.set(key, existing);
  }

  const customers = Array.from(customerMap.values()).sort((a, b) => b.totalSpend - a.totalSpend);
  const profiles = await getCustomerProfiles(customers.map((item) => item.key));
  const profileMap = new Map(profiles.map((p) => [p.customerKey, p]));

  return (
    <main className="space-y-5">
      <section className="admin-card">
        <h2 className="text-2xl font-bold text-gray-900">Customers</h2>
        <p className="mt-1 text-sm text-gray-600">Track customer spend, order count, and set VIP tags.</p>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {customers.map((customer) => {
          const profile = profileMap.get(customer.key);
          const isVip = profile?.isVip ?? false;

          return (
            <article key={customer.key} className="admin-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{customer.name}</h3>
                  <p className="text-sm text-gray-600">{customer.phone || "-"}</p>
                  <p className="text-sm text-gray-600">{customer.email || "-"}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${isVip ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-700"}`}>
                  {isVip ? "VIP" : "Regular"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-gray-50 p-3"><p className="text-gray-500">Order Count</p><p className="mt-1 text-lg font-bold text-gray-900">{customer.orderCount}</p></div>
                <div className="rounded-lg bg-gray-50 p-3"><p className="text-gray-500">Total Spend</p><p className="mt-1 text-lg font-bold text-primary-700">{formatKes(customer.totalSpend)}</p></div>
              </div>

              <div className="mt-4">
                <p className="text-sm font-semibold text-gray-800">Quick Reorder History</p>
                <ul className="mt-2 space-y-2 text-sm text-gray-700">
                  {customer.recentOrders.map((entry) => (
                    <li key={entry.orderNumber} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                      <span>{entry.orderNumber}</span>
                      <span>{new Date(entry.date).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <form action={toggleVip} className="mt-4">
                <input type="hidden" name="customerKey" value={customer.key} />
                <input type="hidden" name="displayName" value={customer.name} />
                <input type="hidden" name="phone" value={customer.phone} />
                <input type="hidden" name="email" value={customer.email} />
                <input type="hidden" name="nextVip" value={String(!isVip)} />
                <button type="submit" className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                  {isVip ? "Remove VIP Tag" : "Mark as VIP"}
                </button>
              </form>
            </article>
          );
        })}
      </section>
    </main>
  );
}
