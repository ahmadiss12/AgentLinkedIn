import "server-only";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { getDb, hasDatabaseUrl } from "@/server/db/client";
import { users } from "@/server/db/schema";

export async function getCurrentUserId(): Promise<string | null> {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    return null;
  }

  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const result = await verifySessionToken(token, secret);

  return result?.userId ?? null;
}

// For pages: the proxy already guarantees a valid session before a
// protected page renders, but this is a defensive second check.
export async function requireCurrentUserId(): Promise<string> {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("Not authenticated.");
  }

  return userId;
}

export async function getCurrentUserEmail(): Promise<string | null> {
  if (!hasDatabaseUrl()) {
    return null;
  }

  const userId = await getCurrentUserId();

  if (!userId) {
    return null;
  }

  const [row] = await getDb()
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return row?.email ?? null;
}
