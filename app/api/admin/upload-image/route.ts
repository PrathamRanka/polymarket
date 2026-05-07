import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface UploadBody {
  filename: string;
  base64: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UploadBody;
    if (!body?.filename || !body?.base64) {
      return NextResponse.json({ error: "Missing filename or base64" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();

    // bucket name - create 'market-images' in your Supabase project
    const bucket = "market-images";
    const key = `${Date.now()}_${body.filename}`;

    const buffer = Buffer.from(body.base64, "base64");

    const { error: uploadError } = await supabase.storage.from(bucket).upload(key, buffer, { upsert: true });
    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(key);

    return NextResponse.json({ publicUrl: data.publicUrl }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
