import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/session";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  password: z.string().min(1).max(200),
});

// Slow down brute-force guessing: every failed attempt costs ~1 second.
// Combined with a strong APP_PASSWORD this makes online guessing useless.
const FAILED_ATTEMPT_DELAY_MS = 1000;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function passwordsMatch(provided: string, expected: string) {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

export async function POST(request: Request) {
  const appPassword = process.env.APP_PASSWORD;

  if (!appPassword) {
    return NextResponse.json(
      { error: "Login is disabled — APP_PASSWORD is not configured." },
      { status: 400 },
    );
  }

  let body: z.infer<typeof bodySchema>;

  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }

  if (!passwordsMatch(body.password, appPassword)) {
    await delay(FAILED_ATTEMPT_DELAY_MS);
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  const token = await createSessionToken(appPassword);
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
