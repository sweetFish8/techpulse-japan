import { NextRequest, NextResponse } from "next/server";
import { getTrends } from "@/lib/trends";

export const revalidate = 900;

export async function GET(request: NextRequest) {
  const value = Number(request.nextUrl.searchParams.get("days") ?? 7);
  const days = value === 1 || value === 30 ? value : 7;
  return NextResponse.json(await getTrends(days));
}
