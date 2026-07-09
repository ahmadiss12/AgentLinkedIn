import { NextResponse } from "next/server";
import { z } from "zod";
import { runResearchBriefs } from "@/server/application/research-brief-service";
import { getCurrentUserId } from "@/server/auth/current-user";

export const dynamic = "force-dynamic";
// Each brief is a Gemini call (~10-15s); a batch of 5 needs headroom.
export const maxDuration = 120;

const requestSchema = z.object({
  maxTopics: z.number().int().min(1).max(10).optional(),
  topicId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid research brief options.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await runResearchBriefs(userId, parsed.data);

    return NextResponse.json({
      ...result,
      startedAt: result.startedAt.toISOString(),
      finishedAt: result.finishedAt.toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate research briefs.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
