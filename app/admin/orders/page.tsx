import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

type OrdersPageProps = {
  searchParams?: {
    status?: string;
    payment?: string;
    date?: string;
    q?: string;
  };
};

function formatKes(value: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(value);
}

async function updateOrderStatus(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as Prisma.OrderStatus;
  if (!id || !status) {
    return;
  }

  const current = await prisma.order.findUnique({ where: { id }, select: { status: true, orderNumber: true } });
  await prisma.order.update({ where: { id }, data: { status } });
  await logAuditEvent({
    action: "ORDER_STATUS_UPDATED",
    entityType: "order",
    entityId: id,
    actor: "admin-ui",
    actorRole: "ADMIN",
    channel: "admin_ui",
    metadata: {
      orderNumber: current?.orderNumber ?? null,
      previousStatus: current?.status ?? null,
      nextStatus: status,
    },
  });
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

export default async function AdminOrdersPage({ searchParams }: OrdersPageProps) {
  const status = searchParams?.status?.trim();
  const payment = searchParams?.payment?.trim();
  const date = searchParams?.date?.trim();
  const query = searchParams?.q?.trim();

  const where: Prisma.OrderWhereInput = {
    ...(status ? { status: status as Prisma.OrderStatus } : {}),
    ...(payment ? { paymentMethod: payment as Prisma.PaymentMethod } : {}),
    ...(query
      ? {
          OR: [
            { orderNumber: { contains: query, mode: "insensitive" } },
            { customerName: { contains: query, mode: "insensitive" } },
            { customerPhone: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    where.createdAt = { gte: start, lt: end };
  }

  const [orders, pendingCount, inTransitCount, deliveredTodayCount] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { status: { in: ["SHIPPED", "PACKING"] } } }),
    prisma.order.count({
      where: {
        status: "DELIVERED",
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
  ]);

  return (
    <main className="space-y-5">
      <section className="admin-card">
        <h2 className="text-2xl font-bold text-gray-900">Orders</h2>
        <p className="mt-1 text-sm text-gray-600">Filter, search, and update order statuses quickly.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="admin-card">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{pendingCount}</p>
        </div>
        <div className="admin-card">
          <p className="text-sm text-gray-500">In Transit</p>
          <p className="mt-2 text-3xl font-bold text-sky-600">{inTransitCount}</p>
        </div>
        <div className="admin-card">
          <p className="text-sm text-gray-500">Delivered Today</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{deliveredTodayCount}</p>
        </div>
      </section>

      <section className="admin-card">
        <form className="grid gap-3 md:grid-cols-4">
          <input name="q" defaultValue={query ?? ""} placeholder="Search order/phone/customer" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          <select name="status" defaultValue={status ?? ""} className="rounded-xl border border-gray-200 px-3 py-2 text-sm">
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PACKING">Packing</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <select name="payment" defaultValue={payment ?? ""} className="rounded-xl border border-gray-200 px-3 py-2 text-sm">
            <option value="">All payments</option>
            <option value="CARD">Card</option>
            <option value="MPESA">M-Pesa</option>
            <option value="BANK">Bank</option>
            <option value="COD">Cash on Delivery</option>
          </select>
          <input type="date" name="date" defaultValue={date ?? ""} className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
          <button type="submit" className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 md:col-span-4 md:w-fit">
            Apply Filters
          </button>
        </form>
      </section>

      <section className="space-y-4">
        {orders.map((order) => (
          <article key={order.id} className="admin-card">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-bold text-gray-900">{order.orderNumber}</p>
                <p className="text-sm text-gray-600">{order.customerName} • {order.customerPhone}</p>
                <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString()}</p>
              </div>

              <div className="text-sm font-semibold text-primary-700">{formatKes(Number(order.total))}</div>

              <div className="flex flex-wrap gap-2">
                <form action={updateOrderStatus}><input type="hidden" name="id" value={order.id} /><input type="hidden" name="status" value="CONFIRMED" /><button className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700">Confirm</button></form>
                <form action={updateOrderStatus}><input type="hidden" name="id" value={order.id} /><input type="hidden" name="status" value="PACKING" /><button className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700">Pack</button></form>
                <form action={updateOrderStatus}><input type="hidden" name="id" value={order.id} /><input type="hidden" name="status" value="SHIPPED" /><button className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700">Ship</button></form>
                <form action={updateOrderStatus}><input type="hidden" name="id" value={order.id} /><input type="hidden" name="status" value="DELIVERED" /><button className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white">Deliver</button></form>
              </div>
            </div>

            <details className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-gray-800">Order Details</summary>
              <div className="mt-3 space-y-3 text-sm text-gray-700">
                <p><span className="font-semibold">Status:</span> {order.status}</p>
                <p><span className="font-semibold">Payment:</span> {order.paymentMethod} ({order.paymentStatus})</p>
                <p><span className="font-semibold">Address:</span> {order.addressLine1}, {order.city}</p>
                <p><span className="font-semibold">Notes:</span> {order.notes || "-"}</p>
                <div>
                  <p className="font-semibold">Items</p>
                  <ul className="mt-1 space-y-1">
                    {order.items.map((item) => (
                      <li key={item.id} className="flex items-center justify-between">
                        <span>{item.product?.name ?? item.productId} x {item.quantity}</span>
                        <span>{formatKes(Number(item.lineTotal))}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex items-center justify-between border-t border-gray-200 pt-2 font-semibold">
                  <span>Total</span>
                  <span>{formatKes(Number(order.total))}</span>
                </div>
              </div>
            </details>
          </article>
        ))}
      </section>
    </main>
  );
}
