// Session token helpers shared by auth routes (Node), current-user lookup
// (Node, via next/headers), and the proxy gate (Edge). Uses Web Crypto so
// it runs identically in every runtime.
//
// Token format: "<userId>.<expiresAtMs>.<hmacSha256Hex>" signed with
// AUTH_SECRET. userId is a UUID (no "." characters), so splitting on "."
// into exactly 3 parts is safe.

export const SESSION_COOKIE = "agentlinkedin_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

async function hmacHex(message: string, key: string) {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionToken(userId: string, secret: string) {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `${userId}.${expiresAt}`;
  const signature = await hmacHex(payload, secret);

  return `${payload}.${signature}`;
}

export async function verifySessionToken(
  token: string,
  secret: string,
): Promise<{ userId: string } | null> {
  const parts = token.split(".");

  if (parts.length !== 3) {
    return null;
  }

  const [userId, expiresAtRaw, signature] = parts;
  const expiresAt = Number(expiresAtRaw);

  if (!userId || !signature || Number.isNaN(expiresAt) || expiresAt < Date.now()) {
    return null;
  }

  const expected = await hmacHex(`${userId}.${expiresAt}`, secret);

  return timingSafeEqualString(signature, expected) ? { userId } : null;
}

// Constant-time comparison (works on Edge and Node runtimes alike) so the
// signature check doesn't leak how many leading characters matched.
function timingSafeEqualString(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;

  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return diff === 0;
}
