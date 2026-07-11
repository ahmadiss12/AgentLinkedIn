import "server-only";

import type {
  DiscoveryCandidate,
  NormalizedSourceItem,
} from "@/core/discovery-models";
import type { TopicCategory } from "@/core/content-models";
import {
  candidateSlug,
  stripHtml,
  truncateWords,
} from "@/server/discovery/text-utils";
import { textSimilarity } from "@/server/quality/text-similarity";

/**
 * Rule-based scoring, no AI calls.
 *
 * Improvements over the first version:
 * - Keywords match on word boundaries ("go" no longer matches "going",
 *   "ai" no longer matches "email").
 * - Keywords are weighted: specific terms ("kubernetes", "cve") count more
 *   than generic ones ("api", "data").
 * - A hit in the title counts double a hit in the summary.
 * - Promotional/clickbait phrasing is penalized and flagged.
 * - Release/version signals in the title get a small news bonus.
 * - Evergreen learning content is not penalized for age.
 * - Near-identical items in the same run (same story from two feeds) are
 *   collapsed, keeping the higher-ranked one.
 */

type WeightedKeyword = { term: string; weight: number };

function kw(term: string, weight = 1): WeightedKeyword {
  return { term, weight };
}

const categoryKeywords: Record<TopicCategory, WeightedKeyword[]> = {
  computer_science: [
    kw("algorithm", 2),
    kw("complexity", 2),
    kw("compiler", 2),
    kw("distributed systems", 2),
    kw("concurrency", 2),
    kw("data structure", 2),
    kw("database"),
    kw("distributed"),
    kw("consistency"),
    kw("formal"),
    kw("systems"),
  ],
  software_engineering: [
    kw("architecture", 2),
    kw("observability", 2),
    kw("refactoring", 2),
    kw("tech debt", 2),
    kw("code review", 2),
    kw("testing"),
    kw("performance"),
    kw("reliability"),
    kw("release"),
    kw("runtime"),
    kw("framework"),
    kw("microservices"),
    kw("monolith"),
  ],
  ai: [
    kw("llm", 2),
    kw("inference", 2),
    kw("fine-tuning", 2),
    kw("embedding", 2),
    kw("rag", 2),
    kw("prompt", 2),
    kw("agent"),
    kw("model"),
    kw("training"),
    kw("reasoning"),
    kw("transformer"),
    kw("ai"),
  ],
  cybersecurity: [
    kw("vulnerability", 2),
    kw("cve", 2),
    kw("zero-day", 2),
    kw("ransomware", 2),
    kw("zero trust", 2),
    kw("passkey", 2),
    kw("security"),
    kw("auth"),
    kw("authentication"),
    kw("encryption"),
    kw("malware"),
    kw("exploit"),
    kw("phishing"),
  ],
  developer_tools: [
    kw("cli", 2),
    kw("sdk", 2),
    kw("ide", 2),
    kw("devtools", 2),
    kw("linter", 2),
    kw("developer"),
    kw("api"),
    kw("tooling"),
    kw("debug"),
    kw("debugger"),
    kw("workflow"),
    kw("editor"),
  ],
  programming_languages: [
    kw("rust", 2),
    kw("golang", 2),
    kw("typescript", 2),
    kw("python", 2),
    kw("javascript", 2),
    kw("java", 2),
    kw("kotlin", 2),
    kw("swift", 2),
    kw("zig", 2),
    kw("language"),
    kw("compiler"),
    kw("runtime"),
    kw("garbage collect"),
    kw("type system"),
  ],
  open_source: [
    kw("open source", 2),
    kw("open-source", 2),
    kw("maintainer", 2),
    kw("license", 2),
    kw("github"),
    kw("release"),
    kw("community"),
    kw("repository"),
    kw("contributor"),
    kw("fork"),
  ],
  cloud_computing: [
    kw("kubernetes", 2),
    kw("serverless", 2),
    kw("terraform", 2),
    kw("aws", 2),
    kw("azure", 2),
    kw("gcp", 2),
    kw("cloud"),
    kw("container"),
    kw("docker"),
    kw("edge"),
    kw("infrastructure"),
    kw("region"),
    kw("latency"),
  ],
  data_engineering: [
    kw("warehouse", 2),
    kw("lakehouse", 2),
    kw("streaming", 2),
    kw("postgres", 2),
    kw("etl", 2),
    kw("vector database", 2),
    kw("kafka", 2),
    kw("data"),
    kw("pipeline"),
    kw("analytics"),
    kw("sql"),
    kw("vector"),
  ],
  emerging_tech: [
    kw("breakthrough", 2),
    kw("prototype", 2),
    kw("research", 2),
    kw("quantum", 2),
    kw("preview"),
    kw("launch"),
    kw("beta"),
    kw("roadmap"),
    kw("experimental"),
  ],
};

// Promotional / clickbait phrasing: each hit is penalized and the item is
// flagged so a human reviewer sees why.
const PROMO_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /you won'?t believe/i, label: "clickbait" },
  { pattern: /\btop \d+\b/i, label: "listicle" },
  { pattern: /\bultimate guide\b/i, label: "clickbait" },
  { pattern: /game.?chang(er|ing)/i, label: "hype" },
  { pattern: /\bwebinar\b/i, label: "promotional" },
  { pattern: /\bsponsored\b/i, label: "promotional" },
  { pattern: /register (now|today)/i, label: "promotional" },
  { pattern: /sign up (now|today)/i, label: "promotional" },
  { pattern: /don'?t miss\b/i, label: "promotional" },
  { pattern: /\bexciting news\b/i, label: "hype" },
  { pattern: /thrilled to announce/i, label: "hype" },
  { pattern: /\bdiscount\b|\d+% off\b/i, label: "promotional" },
  { pattern: /\bwe'?re hiring\b/i, label: "promotional" },
];

const PROMO_PENALTY_PER_HIT = 6;
const PROMO_PENALTY_CAP = 12;

// "v1.2.3", "2.0 released", "generally available" in a title is a strong
// news signal for this app's audience.
const RELEASE_PATTERNS = [
  /\bv?\d+\.\d+(\.\d+)?\b/,
  /\breleased?\b/i,
  /\bgenerally available\b/i,
  /\bstable release\b/i,
];
const RELEASE_BONUS = 4;

const sourceTypeBonus = {
  official_blog: 8,
  research_paper: 6,
  github_release: 7,
  newsletter: 2,
  technical_news: 2,
  engineering_blog: 5,
  academic_source: 6,
};

const TITLE_HIT_MULTIPLIER = 2;
const KEYWORD_POINTS_PER_WEIGHT = 5;
const KEYWORD_SCORE_CAP = 40;
const LEARNING_FRESHNESS_SCORE = 15;
const LEARNING_NOVELTY_FLOOR = 60;
// Same story syndicated across two feeds → keep the higher-ranked copy.
const NEAR_DUPLICATE_THRESHOLD = 0.75;

// Compiled per-term regexes, built once at module load.
const keywordMatchers: Record<
  TopicCategory,
  { term: string; weight: number; regex: RegExp }[]
> = Object.fromEntries(
  Object.entries(categoryKeywords).map(([category, keywords]) => [
    category,
    keywords.map(({ term, weight }) => ({
      term,
      weight,
      regex: new RegExp(`\\b${escapeRegExp(term)}\\b`, "i"),
    })),
  ]),
) as Record<TopicCategory, { term: string; weight: number; regex: RegExp }[]>;

type KeywordHit = { term: string; weight: number; inTitle: boolean };

export class TopicScorer {
  scoreItems(items: NormalizedSourceItem[], limit: number) {
    const seen = new Set<string>();

    const ranked = items
      .map((item) => this.scoreItem(item))
      .sort((left, right) => {
        if (right.relevanceScore !== left.relevanceScore) {
          return right.relevanceScore - left.relevanceScore;
        }

        return left.freshnessDays - right.freshnessDays;
      })
      .filter((candidate) => {
        if (seen.has(candidate.slug)) {
          return false;
        }

        seen.add(candidate.slug);
        return true;
      });

    const deduped = collapseNearDuplicates(ranked);

    // News is fresher so it outscores evergreen teaching articles; without
    // a reserved share, learning items never make the candidate list.
    // Give learning at least half the slots whenever it has entries.
    const learningQuota = Math.ceil(limit / 2);
    const learning = deduped
      .filter((candidate) => candidate.contentType === "learning")
      .slice(0, learningQuota);
    const rest = deduped
      .filter((candidate) => !learning.includes(candidate))
      .slice(0, limit - learning.length);

    return [...learning, ...rest].sort(
      (left, right) => right.relevanceScore - left.relevanceScore,
    );
  }

  private scoreItem(item: NormalizedSourceItem): DiscoveryCandidate {
    const title = item.title;
    const summaryText = item.summary ? stripHtml(item.summary) : "";
    const isLearning = item.contentType === "learning";
    const category = inferCategory(item.categories, title, summaryText);
    const hits = keywordHits(title, summaryText, category);

    const freshnessDays = getFreshnessDays(item.publishedAt ?? item.fetchedAt);
    // Evergreen teaching content doesn't lose value with age, so it gets a
    // flat freshness contribution instead of a decay.
    const freshnessScore = isLearning
      ? LEARNING_FRESHNESS_SCORE
      : Math.max(0, 25 - Math.min(freshnessDays, 25));

    const keywordWeight = hits.reduce(
      (total, hit) => total + hit.weight * (hit.inTitle ? TITLE_HIT_MULTIPLIER : 1),
      0,
    );
    const keywordScore = Math.min(
      KEYWORD_SCORE_CAP,
      keywordWeight * KEYWORD_POINTS_PER_WEIGHT,
    );

    const trustScore = item.sourceTrustLevel * 4;
    const typeScore = sourceTypeBonus[item.sourceType];

    const promoHits = PROMO_PATTERNS.filter(({ pattern }) =>
      pattern.test(`${title} ${summaryText}`),
    );
    const promoPenalty = Math.min(
      PROMO_PENALTY_CAP,
      promoHits.length * PROMO_PENALTY_PER_HIT,
    );

    const releaseSignal =
      !isLearning && RELEASE_PATTERNS.some((pattern) => pattern.test(title));
    const releaseBonus = releaseSignal ? RELEASE_BONUS : 0;

    const relevanceScore = clamp(
      10 + freshnessScore + keywordScore + trustScore + typeScore + releaseBonus - promoPenalty,
      0,
      100,
    );

    const newsNovelty = clamp(90 - Math.min(freshnessDays * 2, 50), 0, 100);
    const noveltyScore = isLearning
      ? Math.max(newsNovelty, LEARNING_NOVELTY_FLOOR)
      : newsNovelty;

    const signals = [
      ...hits.map((hit) => (hit.inTitle ? `title:${hit.term}` : hit.term)),
      ...(releaseSignal ? ["release"] : []),
    ];

    const warnings = [
      ...(!item.publishedAt ? ["missing publication date"] : []),
      // Evergreen teaching content doesn't go stale like news does.
      ...(freshnessDays > 21 && !isLearning ? ["possibly stale"] : []),
      ...(item.sourceTrustLevel < 4 ? ["lower-trust source"] : []),
      ...(hits.length === 0 ? ["weak topic match"] : []),
      ...(promoHits.length > 0
        ? [
            `promotional phrasing (${[...new Set(promoHits.map((hit) => hit.label))].join(", ")})`,
          ]
        : []),
    ];

    const summary = buildSummary(item);

    return {
      title: item.title,
      slug: candidateSlug(item.title, item.url),
      summary,
      whyItMatters: whyItMatters(category),
      url: item.url,
      sourceName: item.sourceName,
      sourceUrl: item.sourceUrl,
      sourceType: item.sourceType,
      contentType: item.contentType,
      category,
      publishedAt: item.publishedAt,
      fetchedAt: item.fetchedAt,
      freshnessDays,
      relevanceScore,
      noveltyScore,
      sourceStrength: item.sourceTrustLevel,
      signals,
      warnings,
    };
  }
}

/** Drop lower-ranked candidates that are near-identical to a kept one. */
function collapseNearDuplicates(ranked: DiscoveryCandidate[]) {
  const kept: DiscoveryCandidate[] = [];

  for (const candidate of ranked) {
    const candidateText = `${candidate.title} ${candidate.summary}`;
    const isDuplicate = kept.some(
      (existing) =>
        textSimilarity(candidateText, `${existing.title} ${existing.summary}`) >=
        NEAR_DUPLICATE_THRESHOLD,
    );

    if (!isDuplicate) {
      kept.push(candidate);
    }
  }

  return kept;
}

/**
 * Score every category (weighted, word-boundary), with a small prior for
 * the categories the source itself declares. This lets a strongly
 * security-flavored post from a general engineering blog land in
 * cybersecurity instead of being stuck with the feed's default category.
 */
function inferCategory(
  declared: TopicCategory[],
  title: string,
  summary: string,
): TopicCategory {
  const declaredSet = new Set(declared);
  let best: { category: TopicCategory; score: number } | null = null;

  for (const category of Object.keys(keywordMatchers) as TopicCategory[]) {
    const hits = keywordHits(title, summary, category);
    const hitWeight = hits.reduce(
      (total, hit) => total + hit.weight * (hit.inTitle ? TITLE_HIT_MULTIPLIER : 1),
      0,
    );
    const prior = declaredSet.has(category) ? 1.5 : 0;
    const score = hitWeight + prior;

    if (score > 0 && (!best || score > best.score)) {
      best = { category, score };
    }
  }

  return best?.category ?? declared[0] ?? "software_engineering";
}

function keywordHits(
  title: string,
  summary: string,
  category: TopicCategory,
): KeywordHit[] {
  return keywordMatchers[category].flatMap(({ term, weight, regex }): KeywordHit[] => {
    if (regex.test(title)) {
      return [{ term, weight, inTitle: true }];
    }

    if (summary && regex.test(summary)) {
      return [{ term, weight, inTitle: false }];
    }

    return [];
  });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getFreshnessDays(date: Date) {
  const diff = Date.now() - date.getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function buildSummary(item: NormalizedSourceItem) {
  if (item.summary) {
    return truncateWords(stripHtml(item.summary), 34);
  }

  return `A fresh item from ${item.sourceName} about ${item.title}.`;
}

function whyItMatters(category: TopicCategory) {
  const copy: Record<TopicCategory, string> = {
    computer_science:
      "It may point to a deeper systems or theory shift that developers can turn into better engineering decisions.",
    software_engineering:
      "It can help engineering teams reason about architecture, quality, delivery, or maintainability.",
    ai: "It may affect how builders design AI features, evaluate models, or deploy agentic systems responsibly.",
    cybersecurity:
      "Security-related changes often create practical lessons for protecting users, teams, and infrastructure.",
    developer_tools:
      "Developer tooling changes can reshape everyday workflows and quietly compound team productivity.",
    programming_languages:
      "Language and runtime updates can change how developers write, ship, and maintain production software.",
    open_source:
      "Open-source movement often reveals where real developer communities and ecosystems are heading.",
    cloud_computing:
      "Cloud and infrastructure updates can change cost, reliability, scalability, and deployment choices.",
    data_engineering:
      "Data platform changes can influence how teams move, query, govern, and trust production data.",
    emerging_tech:
      "Early technical signals can help separate durable shifts from short-lived hype.",
  };

  return copy[category];
}

