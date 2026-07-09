import "server-only";

import { randomUUID } from "node:crypto";
import type {
  DiscoveryOverview,
  DiscoveryRunResult,
  NormalizedSourceItem,
} from "@/core/discovery-models";
import { hasDatabaseUrl } from "@/server/db/client";
import { FeedFetcher } from "@/server/discovery/feed-fetcher";
import { TopicScorer } from "@/server/discovery/topic-scorer";
import { evaluateCandidateQuality } from "@/server/quality/topic-quality-evaluator";
import { createDiscoveryRepository, createSettingsRepository } from "@/server/repositories";

export type RunDiscoveryOptions = {
  maxItemsPerSource?: number;
  maxCandidates?: number;
  persist?: boolean;
};

export class TopicDiscoveryService {
  private readonly repository = createDiscoveryRepository();
  private readonly fetcher = new FeedFetcher();
  private readonly scorer = new TopicScorer();

  async getOverview(): Promise<DiscoveryOverview> {
    const sources = await this.repository.listSources();

    return {
      persistenceEnabled: hasDatabaseUrl(),
      sourceCount: sources.length,
      sources,
    };
  }

  async run(userId: string, options: RunDiscoveryOptions = {}): Promise<DiscoveryRunResult> {
    const startedAt = new Date();
    const maxItemsPerSource = options.maxItemsPerSource ?? 6;
    const maxCandidates = options.maxCandidates ?? 12;
    const shouldPersist = options.persist ?? true;
    const sources = await this.repository.listSources();
    const fetched = await Promise.allSettled(
      sources.map((source) => this.fetcher.fetchSource(source)),
    );
    const items: NormalizedSourceItem[] = [];
    const errors: DiscoveryRunResult["errors"] = [];

    fetched.forEach((result, index) => {
      const source = sources[index];

      if (!source) {
        return;
      }

      if (result.status === "fulfilled") {
        items.push(...result.value.items.slice(0, maxItemsPerSource));
        return;
      }

      errors.push({
        sourceName: source.name,
        url: source.url,
        message: result.reason instanceof Error ? result.reason.message : "Unknown fetch error",
      });
    });

    const scored = this.scorer.scoreItems(items, maxCandidates);
    const preferences = await this.loadPreferences(userId);
    const filtered = scored.filter((candidate) => {
      const haystack = `${candidate.title} ${candidate.summary}`.toLowerCase();
      return !preferences.blockedTopics.some((blocked) => haystack.includes(blocked));
    });

    for (const candidate of filtered) {
      if (preferences.preferredTopics.includes(candidate.category)) {
        candidate.relevanceScore = Math.min(100, candidate.relevanceScore + 10);
      }
    }

    const knownTopics = await this.repository.listKnownTopicFingerprints(userId, 200);
    const candidates = evaluateCandidateQuality(filtered, knownTopics);
    const result: DiscoveryRunResult = {
      runId: randomUUID(),
      startedAt,
      finishedAt: new Date(),
      persisted: Boolean(shouldPersist && hasDatabaseUrl()),
      sourcesChecked: sources.length,
      itemsFetched: items.length,
      candidates,
      errors,
    };

    if (result.persisted) {
      await this.repository.saveRun(userId, result);
    }

    return result;
  }

  private async loadPreferences(userId: string) {
    try {
      return await createSettingsRepository().getPreferences(userId);
    } catch {
      // Discovery should still work if preferences can't be loaded
      // (e.g. seed mode without a database).
      return { blockedTopics: [] as string[], preferredTopics: [] as string[] };
    }
  }
}

export async function getDiscoveryOverview() {
  return new TopicDiscoveryService().getOverview();
}

export async function runTopicDiscovery(userId: string, options?: RunDiscoveryOptions) {
  return new TopicDiscoveryService().run(userId, options);
}

export async function listRecentTopics(userId: string, limit = 30) {
  return createDiscoveryRepository().listRecentTopics(userId, limit);
}

export async function listSourceOverviews() {
  return createDiscoveryRepository().listSourceOverviews();
}

export async function setSourceEnabled(sourceId: string, enabled: boolean) {
  return createDiscoveryRepository().setSourceEnabled(sourceId, enabled);
}
