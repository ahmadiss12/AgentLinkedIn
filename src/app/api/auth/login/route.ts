import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/session";
import { verifyPassword } from "@/lib/password";
import { getDb, hasDatabaseUrl } from "@/server/db/client";
import { users } from "@/server/db/schema";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
});

// Slow down brute-force guessing: every failed attempt costs ~1 second.
const FAILED_ATTEMPT_DELAY_MS = 1000;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
  const secret = process.env.AUTH_SECRET;

  if (!secret || !hasDatabaseUrl()) {
    return NextResponse.json(
      { error: "Login is not configured — AUTH_SECRET or DATABASE_URL is missing." },
      { status: 500 },
    );
  }

  let body: z.infer<typeof bodySchema>;

  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "A valid email and password are required." }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();
  const [account] = await getDb()
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!account || !account.passwordHash || !(await verifyPassword(body.password, account.passwordHash))) {
    await delay(FAILED_ATTEMPT_DELAY_MS);
    // Same message either way — don't reveal whether the email exists.
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const token = await createSessionToken(account.id, secret);
  const response = NextResponse.json({ ok: true });

  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return response;
}
