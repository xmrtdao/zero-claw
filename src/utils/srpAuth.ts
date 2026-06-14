/**
 * SRP-6a Authentication - WebCrypto Implementation
 *
 * Secure Remote Password protocol:
 * - Server never sees password
 * - Client proves knowledge of password without transmitting it
 * - Mutual authentication (both sides verify)
 */

// SRP-6a parameters (from RFC 5054, 4096-bit group)
const N_HEX =
  'FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AACAA68FFFFFFFFFFFFFFFF';
const g_HEX = '2';
const k_HEX = '5b9e8ef059c6b32ea59fc1d322d0370484bfe3d12785f785a0f8b9f3b8b8b8b';

let N: bigint, g: bigint, k: bigint;

function initParams(): void {
  if (N) return;
  N = BigInt('0x' + N_HEX);
  g = BigInt('0x' + g_HEX);
  k = BigInt('0x' + k_HEX);
}

function hexToBigInt(hex: string): bigint {
  return BigInt('0x' + hex.replace(/^0x/, ''));
}

function bigIntToHex(n: bigint): string {
  return n.toString(16).padStart(512, '0');
}

function randomBigInt(bytes: number): bigint {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return BigInt(
    '0x' + Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('')
  );
}

async function hash(...args: (string | bigint)[]): Promise<bigint> {
  const data = args.map((a) => (typeof a === 'bigint' ? bigIntToHex(a) : a)).join('');
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return BigInt('0x' + hashArray.map((b) => b.toString(16).padStart(2, '0')).join(''));
}

// SRP client state
interface SRPClientState {
  I: string; // username
  x: bigint; // private key
  a: bigint; // ephemeral private
  A: bigint; // ephemeral public
  S: bigint; // shared secret
  K: Uint8Array; // session key
  M1: string; // client proof
}

let clientState: SRPClientState | null = null;

/**
 * Step 1: Generate client ephemeral keypair
 */
export async function srpInitiate(
  username: string,
  password: string,
  salt: string
): Promise<{ I: string; A: string }> {
  initParams();

  const I = username;
  const s = hexToBigInt(salt);

  // x = H(s | H(I | ":" | P))
  const x = await hash(salt, await hash(username + ':' + password));

  // a = random
  const a = randomBigInt(32) % N;

  // A = g^a mod N
  const A = modPow(g, a, N);

  clientState = { I, x, a, A, S: BigInt(0), K: new Uint8Array(), M1: '' };

  return { I, A: bigIntToHex(A) };
}

/**
 * Step 2: Process server challenge, generate client proof
 */
export async function srpRespondChallenge(B_hex: string): Promise<{ M1: string }> {
  if (!clientState) throw new Error('SRP not initiated');

  const B = hexToBigInt(B_hex);

  // u = H(A | B)
  const u = await hash(bigIntToHex(clientState.A), B_hex);

  // S = (B - k * g^x) ^ (a + u * x) mod N
  const gx = modPow(g, clientState.x, N);
  const kgx = (k * gx) % N;
  const base = ((B - kgx) % N + N) % N;
  const exp = (clientState.a + u * clientState.x) % N;
  const S = modPow(base, exp, N);

  // K = H(S)
  const K_hex = (await hash(bigIntToHex(S))).toString(16).padStart(64, '0');
  const K = hexToBytes(K_hex);

  // M1 = H(H(N) XOR H(g) | H(I) | s | A | B | K)
  const hN = await hash(bigIntToHex(N));
  const hg = await hash(bigIntToHex(g));
  const hI = await hash(clientState.I);
  const M1 = await hash(
    (hN ^ hg).toString(16),
    hI.toString(16),
    'salt',
    bigIntToHex(clientState.A),
    B_hex,
    K_hex
  );

  clientState = { ...clientState, S, K, M1: M1.toString(16) };

  return { M1: M1.toString(16) };
}

/**
 * Step 3: Verify server proof
 */
export async function srpVerifyServer(M2_hex: string): Promise<boolean> {
  if (!clientState) throw new Error('SRP not initiated');

  // M2 should be H(A | M1 | K)
  const expectedM2 = await hash(
    bigIntToHex(clientState.A),
    clientState.M1,
    bytesToHex(clientState.K)
  );

  return M2_hex === expectedM2.toString(16);
}

/**
 * Get the session key for encryption
 */
export function getSessionKey(): Uint8Array {
  if (!clientState) throw new Error('SRP handshake not complete');
  return clientState.K;
}

// Helpers
function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = BigInt(1);
  base = base % mod;
  while (exp > BigInt(0)) {
    if (exp % BigInt(2) === BigInt(1)) {
      result = (result * base) % mod;
    }
    exp = exp / BigInt(2);
    base = (base * base) % mod;
  }
  return result;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, '');
  const bytes = [];
  for (let i = 0; i < clean.length; i += 2) {
    bytes.push(parseInt(clean.slice(i, i + 2), 16));
  }
  return new Uint8Array(bytes);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}
