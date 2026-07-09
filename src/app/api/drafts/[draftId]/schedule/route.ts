import { NextResponse } from "next/server";
import { z } from "zod";
import { scheduleDraft } from "@/server/application/schedule-service";
import { getCurrentUserId } from "@/server/auth/current-user";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  scheduledFor: z.iso.datetime({ offset: true }),
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
      { error: "Invalid schedule request.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const scheduledFor = new Date(parsed.data.scheduledFor);

  if (scheduledFor.getTime() < Date.now()) {
    return NextResponse.json({ error: "scheduledFor must be in the future." }, { status: 400 });
  }

  try {
    await scheduleDraft(userId, draftId, scheduledFor);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to schedule draft.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
