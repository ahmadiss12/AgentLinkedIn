import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/session";
import { hashPassword } from "@/lib/password";
import { getDb, hasDatabaseUrl } from "@/server/db/client";
import { users } from "@/server/db/schema";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.string().email().max(200),
  name: z.string().min(1).max(120),
  password: z.string().min(8).max(200),
});

export async function POST(request: Request) {
  const secret = process.env.AUTH_SECRET;

  if (!secret || !hasDatabaseUrl()) {
    return NextResponse.json(
      { error: "Sign up is not configured — AUTH_SECRET or DATABASE_URL is missing." },
      { status: 500 },
    );
  }

  let body: z.infer<typeof bodySchema>;

  try {
    body = bodySchema.parse(await request.json());
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? (error.issues[0]?.message ?? "Invalid signup details.")
        : "Invalid signup details.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();
  const db = getDb();
  const passwordHash = await hashPassword(body.password);

  const [existing] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  let userId: string;

  if (existing) {
    // A row with no password is a legacy/local account created before
    // accounts existed — the first person to sign up with that exact
    // email claims it (and its existing topics/drafts) instead of
    // colliding with it.
    if (existing.passwordHash) {
      return NextResponse.json({ error: "That email is already registered." }, { status: 409 });
    }

    await db
      .update(users)
      .set({ passwordHash, name: body.name })
      .where(eq(users.id, existing.id));
    userId = existing.id;
  } else {
    const [created] = await db
      .insert(users)
      .values({ email, name: body.name, passwordHash })
      .returning({ id: users.id });

    if (!created) {
      return NextResponse.json({ error: "Failed to create account." }, { status: 500 });
    }

    userId = created.id;
  }

  const token = await createSessionToken(userId, secret);
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
