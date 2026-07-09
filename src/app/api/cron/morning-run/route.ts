import { NextResponse } from "next/server";
import { runResearchBriefs } from "@/server/application/research-brief-service";
import { runTopicDiscovery } from "@/server/application/topic-discovery-service";
import { createDraftRepository } from "@/server/repositories";

export const dynamic = "force-dynamic";
// Discovery hits ~20 feeds and each brief is a Gemini call, once per
// user — give the scheduled run room to finish on serverless.
export const maxDuration = 300;

// Vercel Cron calls this endpoint on the schedule in vercel.json, sending
// "Authorization: Bearer <CRON_SECRET>". The same header lets you trigger
// it manually with curl.
function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const userIds = await createDraftRepository().listAllUserIds();
  const perUser: Array<{
    userId: string;
    discovery: { sourcesChecked: number; itemsFetched: number; candidates: number; errors: number };
    briefs: { briefed: string[]; skipped: number; errors: number };
    failure?: string;
  }> = [];

  for (const userId of userIds) {
    try {
      const discovery = await runTopicDiscovery(userId);
      // A small brief batch per user keeps the shared free Gemini quota
      // available for the drafts everyone generates by hand during the day.
      const briefs = await runResearchBriefs(userId, { maxTopics: 2 });

      perUser.push({
        userId,
        discovery: {
          sourcesChecked: discovery.sourcesChecked,
          itemsFetched: discovery.itemsFetched,
          candidates: discovery.candidates.length,
          errors: discovery.errors.length,
        },
        briefs: {
          briefed: briefs.briefed.map((item) => item.title),
          skipped: briefs.skipped.length,
          errors: briefs.errors.length,
        },
      });
    } catch (error) {
      perUser.push({
        userId,
        discovery: { sourcesChecked: 0, itemsFetched: 0, candidates: 0, errors: 1 },
        briefs: { briefed: [], skipped: 0, errors: 1 },
        failure: error instanceof Error ? error.message : "Unknown error.",
      });
    }
  }

  return NextResponse.json({ users: userIds.length, results: perUser });
}
