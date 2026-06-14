/**
 * E2E Chat Encryption - WebCrypto Implementation
 *
 * Uses AES-GCM for encryption + HKDF for key derivation.
 * Compatible with the Python Fernet approach but more secure (AES-256 vs AES-128).
 */

const ENCODER = new TextEncoder();
const DECODER = new TextDecoder();

/**
 * Derive a case-specific key from the master key using HKDF
 */
export async function deriveCaseKey(
  masterKey: Uint8Array,
  caseId: string
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey('raw', masterKey, 'HKDF', false, [
    'deriveKey',
  ]);

  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      salt: ENCODER.encode('zeroclaw-chat-v1'),
      info: ENCODER.encode(caseId),
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a message
 */
export async function encryptMessage(
  key: CryptoKey,
  plaintext: string
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    ENCODER.encode(plaintext)
  );

  return {
    ciphertext: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv),
  };
}

/**
 * Decrypt a message
 */
export async function decryptMessage(
  key: CryptoKey,
  ciphertext: string,
  iv: string
): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToArrayBuffer(iv) },
    key,
    base64ToArrayBuffer(ciphertext)
  );

  return DECODER.decode(decrypted);
}

// Base64 helpers
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
