"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { ApiError, ApiSuccess, User } from "@/types";

export type AuthMode = "login" | "signup";

export interface AuthFormProps {
  mode: AuthMode;
  initialValues?: Partial<AuthFormState>;
}

interface AuthFormState {
  username: string;
  email: string;
  password: string;
}

interface AuthResponse {
  user: User;
}

interface AuthErrorPayload extends ApiError {
  debug?: string;
}

export function AuthForm({ mode, initialValues }: AuthFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<AuthFormState>({
    username: "",
    email: initialValues?.email ?? "",
    password: initialValues?.password ?? "",
    ...initialValues,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignup = mode === "signup";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const payload = (await response.json()) as ApiSuccess<AuthResponse> | ApiError;

      if (!response.ok) {
        const errorData = payload as AuthErrorPayload;
        const errorMessage = errorData.error || "Authentication failed";
        const debug = errorData.debug ? ` - ${errorData.debug}` : "";
        throw new Error(errorMessage + debug);
      }

      toast.success(isSignup ? "Account created" : "Signed in");
      router.push("/markets");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed";
      console.error("[AuthForm]", message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
      {isSignup ? (
        <label className="block space-y-2">
          <span className="text-sm text-zinc-300">Username</span>
          <input
            type="text"
            autoComplete="username"
            minLength={3}
            maxLength={30}
            required
            value={form.username}
            onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-zinc-100 outline-none transition focus:border-blue-500"
          />
        </label>
      ) : null}

      <label className="block space-y-2">
        <span className="text-sm text-zinc-300">Email</span>
        <input
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-zinc-100 outline-none transition focus:border-blue-500"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm text-zinc-300">Password</span>
        <input
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          minLength={8}
          required
          value={form.password}
          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-zinc-100 outline-none transition focus:border-blue-500"
        />
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
        {isSignup ? "Create account" : "Sign in"}
      </button>
    </form>
  );
}

export default AuthForm;