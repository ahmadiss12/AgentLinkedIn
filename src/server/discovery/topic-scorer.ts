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

const categoryKeywords: Record<TopicCategory, string[]> = {
  computer_science: [
    "algorithm",
    "complexity",
    "compiler",
    "database",
    "distributed",
    "formal",
    "systems",
  ],
  software_engineering: [
    "architecture",
    "testing",
    "observability",
    "performance",
    "release",
    "runtime",
    "framework",
  ],
  ai: [
    "ai",
    "agent",
    "model",
    "llm",
    "inference",
    "training",
    "embedding",
    "reasoning",
  ],
  cybersecurity: [
    "security",
    "vulnerability",
    "cve",
    "auth",
    "encryption",
    "malware",
    "zero trust",
    "passkey",
  ],
  developer_tools: [
    "developer",
    "cli",
    "sdk",
    "ide",
    "api",
    "tooling",
    "debug",
    "workflow",
  ],
  programming_languages: [
    "rust",
    "python",
    "javascript",
    "typescript",
    "go",
    "language",
    "compiler",
    "runtime",
  ],
  open_source: [
    "open source",
    "github",
    "release",
    "maintainer",
    "community",
    "license",
    "repository",
  ],
  cloud_computing: [
    "cloud",
    "kubernetes",
    "serverless",
    "container",
    "edge",
    "infrastructure",
    "region",
  ],
  data_engineering: [
    "data",
    "warehouse",
    "lakehouse",
    "pipeline",
    "streaming",
    "analytics",
    "postgres",
    "vector",
  ],
  emerging_tech: [
    "preview",
    "launch",
    "research",
    "prototype",
    "beta",
    "breakthrough",
    "roadmap",
  ],
};

const sourceTypeBonus = {
  official_blog: 8,
  research_paper: 6,
  github_release: 7,
  newsletter: 2,
  technical_news: 2,
  engineering_blog: 5,
  academic_source: 6,
};

export class TopicScorer {
  scoreItems(items: NormalizedSourceItem[], limit: number) {
    const seen = new Set<string>();

    return items
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
      })
      .slice(0, limit);
  }

  private scoreItem(item: NormalizedSourceItem): DiscoveryCandidate {
    const text = `${item.title} ${item.summary ?? ""}`.toLowerCase();
    const category = inferCategory(item.categories, text);
    const matchedSignals = keywordHits(text, category);
    const freshnessDays = getFreshnessDays(item.publishedAt ?? item.fetchedAt);
    const freshnessScore = Math.max(0, 25 - Math.min(freshnessDays, 25));
    const keywordScore = Math.min(40, matchedSignals.length * 8);
    const trustScore = item.sourceTrustLevel * 5;
    const typeScore = sourceTypeBonus[item.sourceType];
    const relevanceScore = clamp(
      10 + freshnessScore + keywordScore + trustScore + typeScore,
      0,
      100,
    );
    const noveltyScore = clamp(90 - Math.min(freshnessDays * 2, 50), 0, 100);
    const warnings = [
      ...(!item.publishedAt ? ["missing publication date"] : []),
      ...(freshnessDays > 21 ? ["possibly stale"] : []),
      ...(item.sourceTrustLevel < 4 ? ["lower-trust source"] : []),
      ...(matchedSignals.length === 0 ? ["weak topic match"] : []),
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
      category,
      publishedAt: item.publishedAt,
      fetchedAt: item.fetchedAt,
      freshnessDays,
      relevanceScore,
      noveltyScore,
      sourceStrength: item.sourceTrustLevel,
      signals: matchedSignals,
      warnings,
    };
  }
}

function inferCategory(categories: TopicCategory[], text: string) {
  const ranked = categories
    .map((category) => ({
      category,
      hits: keywordHits(text, category).length,
    }))
    .sort((left, right) => right.hits - left.hits);

  return ranked[0]?.category ?? categories[0] ?? "software_engineering";
}

function keywordHits(text: string, category: TopicCategory) {
  return categoryKeywords[category].filter((keyword) => text.includes(keyword));
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
