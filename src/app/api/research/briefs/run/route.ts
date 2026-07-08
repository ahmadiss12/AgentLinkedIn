import { NextResponse } from "next/server";
import { z } from "zod";
import { runResearchBriefs } from "@/server/application/research-brief-service";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  maxTopics: z.number().int().min(1).max(10).optional(),
  topicId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid research brief options.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await runResearchBriefs(parsed.data);

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
