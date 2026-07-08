import { NextResponse } from "next/server";
import { draftEditSchema } from "@/core/draft-models";
import { DraftReviewService } from "@/server/application/draft-review-service";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  const { draftId } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = draftEditSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid draft edit.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    await new DraftReviewService().edit(draftId, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to edit draft.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
