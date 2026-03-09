import { NextResponse } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-token",
};

function withCors(init: ResponseInit = {}): ResponseInit {
  return {
    ...init,
    headers: {
      ...CORS_HEADERS,
      ...(init.headers ?? {}),
    },
  };
}

export function jsonOk(data: unknown, status = 200) {
  return NextResponse.json({ data }, withCors({ status }));
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, withCors({ status }));
}

export function jsonNoContent(status = 204) {
  return new NextResponse(null, withCors({ status }));
}

export function parsePageParams(searchParams: URLSearchParams) {
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "20");

  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safeLimit = Number.isFinite(limit) && limit > 0 && limit <= 100 ? limit : 20;
  const skip = (safePage - 1) * safeLimit;

  return { page: safePage, limit: safeLimit, skip };
}

export function decimalToNumber(value: unknown): number {
  return Number(value);
}
