import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import bcrypt from "bcryptjs";

const scrypt = promisify(scryptCallback);
const FALLBACK_PASSWORD_SECRET = "predictmarket-dev-password-secret-change-me";

function getPasswordSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret || secret.length < 32) {
    return FALLBACK_PASSWORD_SECRET;
  }

  return secret;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password + getPasswordSecret(), salt, 64)) as Buffer;

  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // Support two formats for backwards compatibility:
  // - bcrypt hashes (start with $2) used in DB seeds
  // - scrypt-derived hex format: salt:hex

  if (storedHash.startsWith("$2")) {
    try {
      return await bcrypt.compare(password, storedHash);
    } catch {
      return false;
    }
  }

  const [salt, digest] = storedHash.split(":");

  if (!salt || !digest) {
    return false;
  }

  const derivedKey = (await scrypt(password + getPasswordSecret(), salt, 64)) as Buffer;
  const expectedKey = Buffer.from(digest, "hex");

  if (expectedKey.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(expectedKey, derivedKey);
}