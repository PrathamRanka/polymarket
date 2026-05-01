const SESSION_COOKIE_NAME = "predictmarket_session";
const FALLBACK_SESSION_SECRET = "predictmarket-dev-session-secret-change-me";

function getSessionSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret || secret.length < 32) {
    return FALLBACK_SESSION_SECRET;
  }

  return secret;
}

function encodeBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const buffer = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";

  for (const byte of buffer) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function signPayload(payload: string): Promise<string> {
  const secretKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", secretKey, new TextEncoder().encode(payload));
  return encodeBase64Url(signature);
}

export async function createSessionToken(userId: string): Promise<string> {
  const signature = await signPayload(userId);
  return `${userId}.${signature}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<string | null> {
  if (!token) {
    return null;
  }

  const separatorIndex = token.lastIndexOf(".");
  if (separatorIndex <= 0) {
    return null;
  }

  const userId = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);

  try {
    const expectedSignature = await signPayload(userId);

    if (expectedSignature !== signature) {
      return null;
    }

    return userId;
  } catch {
    return null;
  }
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

export { SESSION_COOKIE_NAME };