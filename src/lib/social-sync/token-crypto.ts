import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

function deriveKey(): Buffer {
  // AUTH_SECRET is the NextAuth v5 name (replaces NEXTAUTH_SECRET).
  const raw =
    process.env.SOCIAL_OAUTH_ENCRYPTION_KEY?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim();
  if (!raw) {
    throw new Error(
      "SOCIAL_OAUTH_ENCRYPTION_KEY, AUTH_SECRET, or NEXTAUTH_SECRET is required for OAuth token encryption",
    );
  }
  if (/^[A-Za-z0-9+/=]+$/.test(raw) && raw.length >= 43) {
    const buf = Buffer.from(raw, "base64");
    if (buf.length === 32) return buf;
  }
  return createHash("sha256").update(raw).digest();
}

/** Encrypt plaintext for DB storage. Returns `iv.tag.ciphertext` (base64url). */
export function encryptSecret(plaintext: string): string {
  if (!plaintext) return "";
  const key = deriveKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((b) => b.toString("base64url")).join(".");
}

/** Decrypt ciphertext from DB. */
export function decryptSecret(ciphertext: string): string {
  if (!ciphertext) return "";
  const parts = ciphertext.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format");
  }
  const [ivB64, tagB64, dataB64] = parts;
  const key = deriveKey();
  const iv = Buffer.from(ivB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  const data = Buffer.from(dataB64, "base64url");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function isEncryptionConfigured(): boolean {
  return Boolean(
    process.env.SOCIAL_OAUTH_ENCRYPTION_KEY?.trim() ||
      process.env.NEXTAUTH_SECRET?.trim() ||
      process.env.AUTH_SECRET?.trim(),
  );
}
