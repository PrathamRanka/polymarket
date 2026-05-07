import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth/session";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface Body {
  market_id: string;
  image_url: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    if (!body?.market_id || !body?.image_url) {
      return NextResponse.json({ error: "Missing market_id or image_url" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;
    const userId = await verifySessionToken(sessionToken);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdminClient();

    // optional: verify user is admin
    interface ProfileRow { rank?: string; email?: string }
    const profileRow = (await supabase.from("users").select("rank,email").eq("id", userId).single()).data as ProfileRow | null;
    const rank = profileRow?.rank;
    const email = profileRow?.email;
    if (rank !== "Legend" && email !== "admin@predictmarket.com" && email !== "pratham@gmail.com") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase.from("markets").update({ image_url: body.image_url }).eq("id", body.market_id).select("id,title,image_url").single();
    if (error || !data) {
      return NextResponse.json({ error: "Failed to update market image" }, { status: 500 });
    }

    return NextResponse.json({ data, message: "Market image updated" }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
