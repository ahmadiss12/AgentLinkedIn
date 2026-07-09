import { NextResponse } from "next/server";
import { z } from "zod";
import { DraftReviewService } from "@/server/application/draft-review-service";
import { getCurrentUserId } from "@/server/auth/current-user";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  note: z.string().max(500).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { draftId } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid reject options.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    await new DraftReviewService().reject(userId, draftId, parsed.data.note);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reject draft.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
