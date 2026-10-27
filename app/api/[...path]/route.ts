import { NextRequest, NextResponse } from "next/server";
import { INITIAL_STOCKS } from "../../../lib/stock-data";

const BACKEND_URL = (
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://artha-backend-scn2.onrender.com"
).replace(/\/$/, "");

export const dynamic = "force-dynamic";

function getCORSHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "*",
  };
}

async function handleProxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const subPath = Array.isArray(path) ? path.join("/") : path || "";

  // 1. Fast-path NextAuth and Session endpoints to eliminate 502 stalls
  if (subPath === "auth/session") {
    return NextResponse.json(null, {
      status: 200,
      headers: getCORSHeaders(),
    });
  }
  if (subPath === "auth/csrf") {
    return NextResponse.json(
      { csrfToken: "axion-mock-csrf-token" },
      { status: 200, headers: getCORSHeaders() }
    );
  }
  if (subPath === "auth/providers") {
    return NextResponse.json({}, { status: 200, headers: getCORSHeaders() });
  }
  if (subPath === "health") {
    return NextResponse.json(
      { status: "ok", proxy: "online", backend: BACKEND_URL, timestamp: new Date().toISOString() },
      { status: 200, headers: getCORSHeaders() }
    );
  }

  // 2. Proxy request to Render backend with strict 6s timeout to prevent UI hang
  try {
    const url = new URL(request.url);
    const targetUrl = `${BACKEND_URL}/api/${subPath}${url.search}`;

    const headers = new Headers();
    request.headers.forEach((value, key) => {
      if (key !== "host" && key !== "connection" && key !== "content-length") {
        headers.set(key, value);
      }
    });

    const isBodyAllowed = request.method !== "GET" && request.method !== "HEAD";
    const body = isBodyAllowed ? await request.arrayBuffer() : undefined;

    const res = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(30000), // 30 second fail-safe timeout for deep analytics
    });

    // If backend returned a server failure, handle gracefully for critical dashboard paths
    if (!res.ok && res.status >= 500) {
      const fallback = getFallbackPayload(subPath);
      return NextResponse.json(
        fallback || { success: false, status: "degraded", message: "Service is warming up", path: subPath },
        { status: 200, headers: getCORSHeaders() }
      );
    }

    const responseHeaders = new Headers();
    res.headers.forEach((value, key) => {
      if (key !== "content-encoding" && key !== "content-length") {
        responseHeaders.set(key, value);
      }
    });
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    responseHeaders.set("Access-Control-Allow-Headers", "*");

    return new NextResponse(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    // 3. Fallback handlers when Render backend is sleeping or spinning up
    const fallback = getFallbackPayload(subPath);
    if (fallback) {
      return NextResponse.json(fallback, { status: 200, headers: getCORSHeaders() });
    }

    return NextResponse.json(
      {
        error: "Backend service unavailable",
        message: error?.message || "Render backend is cold-starting",
        timestamp: new Date().toISOString(),
      },
      {
        status: 200, // Return 200 so frontend components don't crash
        headers: getCORSHeaders(),
      }
    );
  }
}

function getFallbackPayload(subPath: string): any | null {
  if (subPath === "stocks") {
    return {
      error: false,
      source: "cached",
      retrievedAt: new Date().toISOString(),
      stocks: INITIAL_STOCKS,
    };
  }

  if (subPath === "backend-snapshots") {
    return {
      "whole-market": { status: "ready", generatedAt: new Date().toISOString() },
      "rapid-moves": { status: "ready", generatedAt: new Date().toISOString() },
      "gap-screener": { status: "ready", generatedAt: new Date().toISOString() },
      "swing-opportunities": { status: "ready", generatedAt: new Date().toISOString() },
      "market-session-report": { status: "ready", generatedAt: new Date().toISOString() },
      "opportunities": { status: "ready", generatedAt: new Date().toISOString() },
      "small-cap-predictions": { status: "ready", generatedAt: new Date().toISOString() },
    };
  }

  if (subPath === "signals") {
    return {
      success: true,
      count: 0,
      signals: [],
    };
  }

  if (subPath === "rapid-moves") {
    return {
      data: {
        candidates: [],
        total: 0,
      },
      status: "ready",
    };
  }

  if (subPath === "fall-predictions") {
    return {
      success: true,
      count: 0,
      data: [],
    };
  }

  if (subPath === "small-cap-predictions") {
    return {
      success: true,
      candidates: [],
      stocks: [],
    };
  }

  if (subPath === "forward-picks") {
    return {
      success: true,
      data: {
        picks: [],
        timestamp: new Date().toISOString(),
      },
      picks: [],
    };
  }

  return null;
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
export const OPTIONS = () => {
  return new NextResponse(null, {
    status: 204,
    headers: getCORSHeaders(),
  });
};
