import "server-only";

import type { QualitySignal } from "@/core/content-models";
import type {
  DiscoveryCandidate,
  QualityAssessment,
} from "@/core/discovery-models";
import {
  MIN_RELEVANCE_SCORE,
  STALE_AFTER_DAYS,
} from "@/server/discovery/brief-eligibility";
import { jaccardSimilarity, tokenize } from "@/server/quality/text-similarity";

export type KnownTopicFingerprint = {
  slug: string;
  title: string;
  summary: string;
};

const DUPLICATE_THRESHOLD = 0.5;
const LOW_RELEVANCE_BELOW = MIN_RELEVANCE_SCORE;

const SPECULATIVE_PATTERNS = [
  "rumor",
  "rumour",
  "reportedly",
  "allegedly",
  "unconfirmed",
  "leaked",
  "leak suggests",
  "might be",
  "may be planning",
  "could be",
  "expected to",
  "speculat",
  "possibly",
  "sources say",
];

function hasSpeculativeLanguage(text: string) {
  const lowered = text.toLowerCase();
  return SPECULATIVE_PATTERNS.some((pattern) => lowered.includes(pattern));
}

function candidateText(candidate: DiscoveryCandidate) {
  return `${candidate.title} ${candidate.summary}`;
}

export function evaluateCandidateQuality(
  candidates: DiscoveryCandidate[],
  knownTopics: KnownTopicFingerprint[],
): DiscoveryCandidate[] {
  const knownFingerprints = knownTopics.map((topic) => ({
    slug: topic.slug,
    tokens: tokenize(`${topic.title} ${topic.summary}`),
  }));
  const acceptedFingerprints: { slug: string; tokens: Set<string> }[] = [];

  return candidates.map((candidate) => {
    const tokens = tokenize(candidateText(candidate));
    const signals: QualitySignal[] = [];
    const warnings = [...candidate.warnings];

    // Duplicate detection: against persisted topics from earlier runs, and
    // against higher-ranked candidates in this run. Same slug means the same
    // article being re-seen, which is an update, not a duplicate.
    let duplicateScore = 0;
    let duplicateOf: string | undefined;

    for (const known of [...knownFingerprints, ...acceptedFingerprints]) {
      if (known.slug === candidate.slug) {
        continue;
      }

      const similarity = jaccardSimilarity(tokens, known.tokens);
      if (similarity > duplicateScore) {
        duplicateScore = similarity;
        duplicateOf = known.slug;
      }
    }

    if (duplicateScore >= DUPLICATE_THRESHOLD && duplicateOf) {
      signals.push("duplicate_risk");
      warnings.push(
        `possible duplicate (${Math.round(duplicateScore * 100)}% similar to ${duplicateOf})`,
      );
    }

    if (candidate.freshnessDays > STALE_AFTER_DAYS) {
      signals.push("stale");
    }

    if (candidate.relevanceScore < LOW_RELEVANCE_BELOW) {
      signals.push("low_relevance");
    }

    if (hasSpeculativeLanguage(candidateText(candidate))) {
      signals.push("speculative");
      warnings.push("speculative language detected");
    }

    if (candidate.sourceStrength < 4 || !candidate.publishedAt) {
      signals.push("needs_source_check");
    } else if (!signals.includes("duplicate_risk") && !signals.includes("speculative")) {
      signals.push("strong_sources");
    }

    acceptedFingerprints.push({ slug: candidate.slug, tokens });

    const quality: QualityAssessment = {
      signals,
      duplicateScore: Math.round(duplicateScore * 100) / 100,
      duplicateOf,
      freshnessScore: Math.max(0, Math.min(100, 100 - candidate.freshnessDays * 4)),
      sourceCoverageScore: Math.min(100, candidate.sourceStrength * 20),
    };

    return { ...candidate, warnings, quality };
  });
}
