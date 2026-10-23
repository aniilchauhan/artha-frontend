import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    name: "Artha API Proxy Gateway",
    status: "online",
    backend: "https://artha-backend-scn2.onrender.com",
    timestamp: new Date().toISOString(),
  });
}
