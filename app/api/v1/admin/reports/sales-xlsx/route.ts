import * as XLSX from "xlsx";
import { getSalesRows } from "@/lib/reports";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = (searchParams.get("range") ?? "30d") as "7d" | "30d" | "90d";

  const rows = await getSalesRows(range);

  const sheetRows = rows.map((row) => ({
    orderNumber: row.orderNumber,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    paymentMethod: row.paymentMethod,
    status: row.status,
    totalKES: row.total,
    createdAt: row.createdAt.toISOString(),
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(sheetRows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "sales");

  const content = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;

  return new Response(new Uint8Array(content), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="sales-${range}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
