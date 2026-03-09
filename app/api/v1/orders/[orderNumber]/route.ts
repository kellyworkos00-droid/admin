import { prisma } from "@/lib/prisma";
import { jsonError, jsonNoContent, jsonOk } from "@/lib/api";
import { serializeOrder } from "@/lib/serializers";

type RouteContext = {
  params: {
    orderNumber: string;
  };
};

export async function GET(_request: Request, { params }: RouteContext) {
  const order = await prisma.order.findUnique({
    where: { orderNumber: params.orderNumber },
    include: { items: true },
  });

  if (!order) {
    return jsonError("Order not found", 404);
  }

  return jsonOk(serializeOrder(order));
}

export function OPTIONS() {
  return jsonNoContent();
}
