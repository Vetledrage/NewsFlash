import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const upstream = new URL(`${API_BASE_URL}/api/articles`);
  upstream.search = url.search;

  const res = await fetch(upstream.toString(), {
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

