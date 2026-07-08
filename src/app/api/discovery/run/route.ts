import { NextResponse } from "next/server";
import { z } from "zod";
import { runTopicDiscovery } from "@/server/application/topic-discovery-service";

export const dynamic = "force-dynamic";
// Fetches ~20 feeds in parallel; slow feeds need headroom.
export const maxDuration = 60;

const requestSchema = z.object({
  maxItemsPerSource: z.number().int().min(1).max(20).optional(),
  maxCandidates: z.number().int().min(1).max(30).optional(),
  persist: z.boolean().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid discovery options.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await runTopicDiscovery(parsed.data);

  return NextResponse.json({
    ...result,
    startedAt: result.startedAt.toISOString(),
    finishedAt: result.finishedAt.toISOString(),
    candidates: result.candidates.map((candidate) => ({
      ...candidate,
      publishedAt: candidate.publishedAt?.toISOString(),
      fetchedAt: candidate.fetchedAt.toISOString(),
    })),
  });
}
