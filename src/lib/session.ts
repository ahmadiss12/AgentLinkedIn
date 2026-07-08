// Session token helpers shared by the login route (Node) and the
// middleware (Edge). Uses Web Crypto so it runs in both runtimes.
//
// Token format: "<expiresAtMs>.<hmacSha256Hex>" signed with APP_PASSWORD.

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

export async function createSessionToken(password: string) {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const signature = await hmacHex(`agentlinkedin:${expiresAt}`, password);

  return `${expiresAt}.${signature}`;
}

export async function isValidSessionToken(token: string, password: string) {
  const [expiresAtRaw, signature] = token.split(".");
  const expiresAt = Number(expiresAtRaw);

  if (!expiresAtRaw || !signature || Number.isNaN(expiresAt) || expiresAt < Date.now()) {
    return false;
  }

  const expected = await hmacHex(`agentlinkedin:${expiresAt}`, password);

  return signature === expected;
}
