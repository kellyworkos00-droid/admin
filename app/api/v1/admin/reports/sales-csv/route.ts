import { getSalesRows } from "@/lib/reports";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = (searchParams.get("range") ?? "30d") as "7d" | "30d" | "90d";

  const rows = await getSalesRows(range);

  const header = ["orderNumber", "customerName", "customerPhone", "paymentMethod", "status", "totalKES", "createdAt"];
  const data = rows.map((row) => [
    row.orderNumber,
    row.customerName,
    row.customerPhone,
    row.paymentMethod,
    row.status,
    row.total.toFixed(2),
    row.createdAt.toISOString(),
  ]);

  const csv = [header, ...data]
    .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sales-${range}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
