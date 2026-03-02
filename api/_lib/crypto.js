import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Get the encryption key from environment variable.
 * Must be a 32-byte hex string (64 hex characters).
 */
function getKey() {
  const key = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!key) throw new Error("CREDENTIAL_ENCRYPTION_KEY environment variable is not set");
  return Buffer.from(key, "hex");
}

/**
 * Encrypt plaintext using AES-256-GCM.
 * Returns a string in format: iv:authTag:ciphertext (all hex-encoded).
 */
export function encrypt(plaintext) {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypt a string produced by encrypt().
 * Expects format: iv:authTag:ciphertext (all hex-encoded).
 */
export function decrypt(encryptedString) {
  const key = getKey();
  const [ivHex, authTagHex, ciphertext] = encryptedString.split(":");

  if (!ivHex || !authTagHex || !ciphertext) {
    throw new Error("Invalid encrypted string format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
