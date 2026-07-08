import "server-only";

import type { TopicForDraft } from "@/core/draft-models";

export type DraftEligibility =
  | { eligible: true }
  | { eligible: false; reason: string };

export function checkDraftEligibility(topic: TopicForDraft): DraftEligibility {
  if (topic.brief.confidence === "low") {
    return {
      eligible: false,
      reason: "brief confidence is low — needs a stronger brief or manual review before drafting",
    };
  }

  // Learning briefs are written from general engineering knowledge and
  // intentionally carry no source attributions.
  if (topic.type !== "learning" && topic.brief.sourceAttributions.length === 0) {
    return { eligible: false, reason: "brief has no source attributions to draft from" };
  }

  return { eligible: true };
}
