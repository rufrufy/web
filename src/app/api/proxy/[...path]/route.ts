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

  // For multipart/form-data, pass the raw request body through as-is.
  // Parsing with req.formData() loses file metadata (filename, content-type)
  // when re-serialized by fetch(); using arrayBuffer() + forwarded Content-Type
  // can mismatch boundaries. The only reliable way is streaming the raw bytes
  // with the original Content-Type header intact.
  if (contentType.includes("multipart/form-data")) {
    headers["Content-Type"] = contentType;

    const rawBody = await req.arrayBuffer();
    const text = await upstreamPost(url, headers, rawBody);
    return makeResponse(text);
  }

  // Non-multipart: simple text body.
  if (contentType.includes("application/x-www-form-urlencoded")) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }
  const body = await req.text();
  const text = await upstreamPost(url, headers, body);
  return makeResponse(text);
}

async function upstreamPost(
  url: string,
  headers: Record<string, string>,
  body: ArrayBuffer | string
): Promise<string> {
  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
    });

    const text = await upstream.text();

    if (process.env.NODE_ENV !== "production") {
      console.log(`[proxy] ${url} → ${upstream.status}`, {
        bodySize: typeof body === "string" ? body.length : body.byteLength,
        upstreamStatus: upstream.status,
        responsePreview: text.slice(0, 500),
      });
    }

    return text;
  } catch (err) {
    return JSON.stringify({
      success: false,
      message: String(err),
    });
  }
}

function makeResponse(text: string): NextResponse {
  let status = 200;
  let contentType = "application/json";

  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") {
      // Preserve upstream error status if present.
    }
  } catch {
    contentType = "text/plain";
  }

  return new NextResponse(text, {
    status,
    headers: { "Content-Type": contentType },
  });
}
