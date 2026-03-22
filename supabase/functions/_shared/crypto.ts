// AES-256-GCM encrypt/decrypt utilities using Web Crypto API
// Format: base64(iv):base64(ciphertext):base64(authTag)

const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12; // 96 bits recommended for GCM
const TAG_LENGTH = 128; // bits

async function getKey(): Promise<CryptoKey> {
  const keyB64 = Deno.env.get("TOTP_ENCRYPTION_KEY");
  if (!keyB64) {
    throw new Error("TOTP_ENCRYPTION_KEY is not configured");
  }
  const keyBytes = Uint8Array.from(atob(keyB64), (c) => c.charCodeAt(0));
  if (keyBytes.length !== 32) {
    throw new Error("TOTP_ENCRYPTION_KEY must be exactly 32 bytes (256 bits)");
  }
  return crypto.subtle.importKey("raw", keyBytes, { name: ALGORITHM }, false, [
    "encrypt",
    "decrypt",
  ]);
}

function toBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export async function encrypt(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertextWithTag = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    key,
    encoded
  );

  // Web Crypto appends the auth tag to the ciphertext
  const combined = new Uint8Array(ciphertextWithTag);
  const tagStart = combined.length - TAG_LENGTH / 8;
  const ciphertext = combined.slice(0, tagStart);
  const authTag = combined.slice(tagStart);

  return `${toBase64(iv)}:${toBase64(ciphertext)}:${toBase64(authTag)}`;
}

export async function decrypt(encryptedStr: string): Promise<string> {
  const parts = encryptedStr.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted format — expected iv:ciphertext:tag");
  }

  const key = await getKey();
  const iv = fromBase64(parts[0]);
  const ciphertext = fromBase64(parts[1]);
  const authTag = fromBase64(parts[2]);

  // Web Crypto expects ciphertext + tag concatenated
  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext);
  combined.set(authTag, ciphertext.length);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    key,
    combined
  );

  return new TextDecoder().decode(decrypted);
}

/** Check if a value looks like our encrypted format (iv:ciphertext:tag) */
export function isEncrypted(value: string): boolean {
  const parts = value.split(":");
  if (parts.length !== 3) return false;
  try {
    // All three parts should be valid base64
    for (const p of parts) {
      atob(p);
    }
    return true;
  } catch {
    return false;
  }
}
