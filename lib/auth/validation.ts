import { z } from "zod";

const disposableEmailDomains = new Set([
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "yopmail.com",
  "sharklasers.com",
]);

function isLikelyRealEmail(email: string): boolean {
  const [localPart, domain] = email.toLowerCase().split("@");

  if (!localPart || !domain) return false;
  if (domain.endsWith(".invalid") || domain.endsWith(".local")) return false;
  if (disposableEmailDomains.has(domain)) return false;
  if (["test", "fake", "demo", "temp", "asdf"].includes(localPart)) return false;

  return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain);
}

export function normalizeIndianPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }

  return value.trim();
}

export const signupSchema = z.object({
  username: z
    .string({ error: "Please choose a username." })
    .trim()
    .min(3, "Username must be at least 3 characters.")
    .max(30, "Username must be at most 30 characters.")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores."),
  email: z
    .email("Enter a valid email address.")
    .trim()
    .toLowerCase()
    .max(254, "Email is too long.")
    .refine(isLikelyRealEmail, "Please use a real, non-disposable email address."),
  phone_number: z
    .string({ error: "Please enter your phone number." })
    .trim()
    .transform(normalizeIndianPhoneNumber)
    .refine((value) => /^\+91[6-9]\d{9}$/.test(value), {
      message: "Enter a valid Indian mobile number (for example, +919876543210).",
    }),
  password: z
    .string({ error: "Please create a password." })
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password must be at most 72 characters.")
    .refine((value) => /[A-Z]/.test(value), "Password must include at least one uppercase letter.")
    .refine((value) => /[a-z]/.test(value), "Password must include at least one lowercase letter.")
    .refine((value) => /\d/.test(value), "Password must include at least one number.")
    .refine(
      (value) => /[^A-Za-z0-9]/.test(value),
      "Password must include at least one special character.",
    )
    .refine((value) => !/\s/.test(value), "Password cannot contain spaces."),
});

export type SignupPayload = z.infer<typeof signupSchema>;