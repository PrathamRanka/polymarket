import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Endpoint not available" }, { status: 404 });
}
