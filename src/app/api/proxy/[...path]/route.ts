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
  let bodyContentType: string | undefined;

  if (contentType.includes("multipart/form-data")) {
    const rawBytes = await req.arrayBuffer();
    body = rawBytes;
    bodyContentType = contentType;
  } else if (contentType.includes("application/x-www-form-urlencoded")) {
    body = await req.text();
    bodyContentType = "application/x-www-form-urlencoded";
  } else {
    body = await req.text();
  }

  if (bodyContentType) {
    headers["Content-Type"] = bodyContentType;
  }

  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
      duplex: "half",
    } as RequestInit);

    const text = await upstream.text();

    if (process.env.NODE_ENV !== "production") {
      console.log(`[proxy] ${path} → ${upstream.status}`, {
        contentType: bodyContentType || "none",
        bodySize: typeof body === "string" ? body.length : body instanceof ArrayBuffer ? body.byteLength : "n/a",
        upstreamStatus: upstream.status,
        responsePreview: text.slice(0, 300),
      });
    }
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
