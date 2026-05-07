import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { hashPassword } from "@/lib/auth/password";

interface Body {
  email: string;
  password: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    if (!body?.email || !body?.password) {
      return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();

    // Create auth user (idempotent if already exists)
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { role: "admin" },
    });

    // compute password hash to store in local users table so our internal login works
    const passwordHash = await hashPassword(body.password);

    if (createError && !createData?.user) {
      // If user already exists, try to fetch by email from local users table as a fallback
      const { data: existingUserRow } = await supabase.from("users").select("id,email").eq("email", body.email).single();
      const existing: any = existingUserRow ?? null;
      if (!existing) {
        return NextResponse.json({ error: createError.message }, { status: 500 });
      }
      // ensure row in users table including password_hash
      await (supabase.from("users") as any).upsert({ id: existing.id, email: existing.email, username: (existing.email ?? "").split("@")[0], rank: "Legend", wallet_balance: 999999.0, password_hash: passwordHash }, { onConflict: ["id"] });
      return NextResponse.json({ email: existing.email, id: existing.id }, { status: 200 });
    }

    const user = createData?.user;
    if (!user) {
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }

    // create users table row including password_hash so local auth works
    await (supabase.from("users") as any).upsert({ id: user.id, email: user.email, username: (user.email ?? "").split("@")[0], rank: "Legend", wallet_balance: 999999.0, password_hash: passwordHash }, { onConflict: ["id"] });

    return NextResponse.json({ email: user.email, id: user.id }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
