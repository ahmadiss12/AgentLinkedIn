import { NextResponse } from "next/server";
import { runResearchBriefs } from "@/server/application/research-brief-service";
import { runTopicDiscovery } from "@/server/application/topic-discovery-service";

export const dynamic = "force-dynamic";
// Discovery hits ~20 feeds and each brief is a Gemini call — give the
// scheduled run room to finish on serverless.
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

  try {
    const discovery = await runTopicDiscovery();
    // A small brief batch keeps the free Gemini quota available for the
    // drafts you generate by hand during the day.
    const briefs = await runResearchBriefs({ maxTopics: 3 });

    return NextResponse.json({
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
    const message = error instanceof Error ? error.message : "Morning run failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
