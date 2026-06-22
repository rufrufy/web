import { NextRequest, NextResponse } from "next/server";

const UPSTREAM = "https://secure-sadewa.semarangkota.go.id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join("/");
  const url = `${UPSTREAM}/${path}`;

  const authToken = req.headers.get("x-auth-token") || "";

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const contentType = req.headers.get("content-type") || "";

  let body: BodyInit | undefined;
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    body = formData;
  } else if (contentType.includes("application/x-www-form-urlencoded")) {
    body = await req.text();
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  } else {
    body = await req.text();
  }

  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
    });

    const text = await upstream.text();
    const respHeaders: Record<string, string> = {
      "Content-Type": upstream.headers.get("content-type") || "application/json",
    };

    return new NextResponse(text, {
      status: upstream.status,
      headers: respHeaders,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: String(err) },
      { status: 502 }
    );
  }
}
