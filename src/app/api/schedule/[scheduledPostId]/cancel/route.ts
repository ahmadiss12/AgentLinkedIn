import { NextResponse } from "next/server";
import { cancelScheduledPost } from "@/server/application/schedule-service";
import { getCurrentUserId } from "@/server/auth/current-user";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ scheduledPostId: string }> },
) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { scheduledPostId } = await params;

  try {
    await cancelScheduledPost(userId, scheduledPostId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to cancel scheduled post.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
