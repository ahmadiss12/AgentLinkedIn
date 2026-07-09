import { NextResponse } from "next/server";
import { z } from "zod";
import { markScheduledPostPosted } from "@/server/application/schedule-service";
import { getCurrentUserId } from "@/server/auth/current-user";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  publishedUrl: z.string().url().optional().or(z.literal("")),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ scheduledPostId: string }> },
) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { scheduledPostId } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid mark-posted request.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    await markScheduledPostPosted(
      userId,
      scheduledPostId,
      parsed.data.publishedUrl ? parsed.data.publishedUrl : undefined,
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to mark post as posted.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
