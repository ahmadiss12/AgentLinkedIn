import { NextResponse } from "next/server";
import { DraftReviewService } from "@/server/application/draft-review-service";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  const { draftId } = await params;

  try {
    await new DraftReviewService().approve(draftId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to approve draft.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
