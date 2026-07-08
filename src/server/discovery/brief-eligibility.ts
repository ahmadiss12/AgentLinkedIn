import "server-only";

import type { TopicForBrief } from "@/core/research-brief-models";

export const STALE_AFTER_DAYS = 21;
export const MIN_RELEVANCE_SCORE = 40;

export type BriefEligibility =
  | { eligible: true }
  | { eligible: false; reason: string };

export function checkBriefEligibility(topic: TopicForBrief): BriefEligibility {
  if (topic.sources.length === 0) {
    return { eligible: false, reason: "no linked source material to ground a brief" };
  }

  if (topic.relevanceScore < MIN_RELEVANCE_SCORE) {
    return {
      eligible: false,
      reason: `relevance score ${topic.relevanceScore} is below the ${MIN_RELEVANCE_SCORE} threshold`,
    };
  }

  const freshnessDays = Math.floor(
    (Date.now() - topic.lastSeenAt.getTime()) / 86_400_000,
  );

  if (freshnessDays > STALE_AFTER_DAYS) {
    return {
      eligible: false,
      reason: `last seen ${freshnessDays}d ago, past the ${STALE_AFTER_DAYS}d staleness window`,
    };
  }

  return { eligible: true };
}
