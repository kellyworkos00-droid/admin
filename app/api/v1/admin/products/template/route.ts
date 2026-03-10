import * as XLSX from "xlsx";

export async function GET() {
  const templateRows = [
    {
      sku: "ET-RICE-50KG",
      name: "Premium Rice (50kg Bag)",
      slug: "premium-rice-50kg-bag",
      description: "Long grain rice ideal for wholesale buyers.",
      category: "Groceries",
      imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=1200&q=80",
      price: 4500,
      bulkPrice: 4200,
      minOrder: 10,
      sizes: "5kg|10kg|25kg|50kg",
      sizePrices: "5kg:850|10kg:1600|25kg:3900|50kg:7600",
      stockQty: 120,
      discountPct: 7,
    },
  ];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(templateRows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "products-template");

  const content = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const body = new Uint8Array(content);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="products-import-template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
