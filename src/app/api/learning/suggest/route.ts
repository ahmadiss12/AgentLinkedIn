import { NextResponse } from "next/server";
import { z } from "zod";
import { suggestLearningTopics } from "@/server/application/learning-topic-service";
import { getCurrentUserId } from "@/server/auth/current-user";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  count: z.number().int().min(1).max(10).optional(),
});

export async function POST(request: Request) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let count = 3;

  try {
    const raw = await request.text();

    if (raw) {
      count = bodySchema.parse(JSON.parse(raw)).count ?? 3;
    }
  } catch {
    return NextResponse.json(
      { error: "Body must be JSON like {\"count\": 3}." },
      { status: 400 },
    );
  }

  try {
    const result = await suggestLearningTopics(userId, count);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to suggest learning topics.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
