import { NextResponse } from "next/server";
import { cancelScheduledPost } from "@/server/application/schedule-service";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ scheduledPostId: string }> },
) {
  const { scheduledPostId } = await params;

  try {
    await cancelScheduledPost(scheduledPostId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to cancel scheduled post.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
