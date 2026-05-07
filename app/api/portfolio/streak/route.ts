import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const userId = await verifySessionToken(sessionToken);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    const { data: bets, error: betsError } = await supabase
      .from("bets")
      .select("id, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (betsError) throw betsError;

    return NextResponse.json(bets || []);
  } catch (error) {
    console.error("Win streak error:", error);
    return NextResponse.json({ error: "Failed to fetch win streak" }, { status: 500 });
  }
}
