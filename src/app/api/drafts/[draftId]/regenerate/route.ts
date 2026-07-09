import { NextResponse } from "next/server";
import { DraftReviewService } from "@/server/application/draft-review-service";
import { getCurrentUserId } from "@/server/auth/current-user";

export const dynamic = "force-dynamic";
// Regeneration is a Gemini call (~10-15s).
export const maxDuration = 60;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { draftId } = await params;

  try {
    const draft = await new DraftReviewService().regenerate(userId, draftId);
    return NextResponse.json({ ok: true, draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to regenerate draft.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
