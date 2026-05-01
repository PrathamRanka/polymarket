"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { normalizeIndianPhoneNumber, signupSchema, type SignupPayload } from "@/lib/auth/validation";
import type { ApiError, ApiSuccess, User } from "@/types";

export type AuthMode = "login" | "signup";

export interface AuthFormProps {
  mode: AuthMode;
  initialValues?: Partial<AuthFormState>;
}

interface AuthFormState {
  username: string;
  email: string;
  phone_number: string;
  password: string;
}

interface AuthResponse {
  user: User;
}

interface AuthErrorPayload extends ApiError {
  debug?: string;
}

type SignupField = "username" | "email" | "phone_number" | "password";
type SignupFieldErrors = Partial<Record<SignupField, string>>;

function collectSignupErrors(payload: AuthFormState): { errors: SignupFieldErrors; normalized?: SignupPayload } {
  const parsed = signupSchema.safeParse(payload);

  if (parsed.success) {
    return { errors: {}, normalized: parsed.data };
  }

  const errors: SignupFieldErrors = {};

  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !errors[field as SignupField]) {
      errors[field as SignupField] = issue.message;
    }
  }

  return { errors };
}

export function AuthForm({ mode, initialValues }: AuthFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<AuthFormState>({
    username: "",
    email: initialValues?.email ?? "",
    phone_number: "",
    password: initialValues?.password ?? "",
    ...initialValues,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<SignupFieldErrors>({});

  const isSignup = mode === "signup";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    let signupPayload: SignupPayload | undefined;

    if (isSignup) {
      const validation = collectSignupErrors(form);
      if (Object.keys(validation.errors).length > 0 || !validation.normalized) {
        setFieldErrors(validation.errors);
        toast.error("Please fix the highlighted fields.");
        return;
      }
      signupPayload = validation.normalized;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          isSignup
            ? signupPayload
            : {
                email: form.email.trim().toLowerCase(),
                password: form.password,
              },
        ),
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
            className={`w-full rounded-xl border bg-zinc-950/70 px-4 py-3 text-zinc-100 outline-none transition focus:border-blue-500 ${
              fieldErrors.username ? "border-rose-500/70" : "border-zinc-700"
            }`}
          />
          {fieldErrors.username ? <p className="text-sm text-rose-300">{fieldErrors.username}</p> : null}
        </label>
      ) : null}

      {isSignup ? (
        <label className="block space-y-2">
          <span className="text-sm text-zinc-300">Phone Number</span>
          <input
            type="tel"
            autoComplete="tel-national"
            inputMode="numeric"
            placeholder="+919876543210"
            required
            value={form.phone_number}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                phone_number: normalizeIndianPhoneNumber(event.target.value),
              }))
            }
            className={`w-full rounded-xl border bg-zinc-950/70 px-4 py-3 text-zinc-100 outline-none transition focus:border-blue-500 ${
              fieldErrors.phone_number ? "border-rose-500/70" : "border-zinc-700"
            }`}
          />
          {fieldErrors.phone_number ? <p className="text-sm text-rose-300">{fieldErrors.phone_number}</p> : null}
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
          className={`w-full rounded-xl border bg-zinc-950/70 px-4 py-3 text-zinc-100 outline-none transition focus:border-blue-500 ${
            fieldErrors.email ? "border-rose-500/70" : "border-zinc-700"
          }`}
        />
        {fieldErrors.email ? <p className="text-sm text-rose-300">{fieldErrors.email}</p> : null}
      </label>

      <label className="block space-y-2">
        <span className="text-sm text-zinc-300">Password</span>
        <input
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          minLength={isSignup ? 8 : undefined}
          required
          value={form.password}
          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          className={`w-full rounded-xl border bg-zinc-950/70 px-4 py-3 text-zinc-100 outline-none transition focus:border-blue-500 ${
            fieldErrors.password ? "border-rose-500/70" : "border-zinc-700"
          }`}
        />
        {fieldErrors.password ? <p className="text-sm text-rose-300">{fieldErrors.password}</p> : null}
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