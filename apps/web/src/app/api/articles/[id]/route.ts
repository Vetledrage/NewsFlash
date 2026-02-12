import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const upstream = `${API_BASE_URL}/api/articles/${encodeURIComponent(id)}`;

  const res = await fetch(upstream, {
    headers: {
      Accept: "application/json"
    },
    cache: "no-store"
  });

  const body = await res.text();

  return new NextResponse(body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store"
    }
  });
}

