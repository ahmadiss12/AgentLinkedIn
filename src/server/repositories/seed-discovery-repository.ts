import "server-only";

import type { DiscoveryRepository } from "@/server/repositories/discovery-repository";
import { trustedSourceCatalog } from "@/server/discovery/source-catalog";

export class SeedDiscoveryRepository implements DiscoveryRepository {
  async listSources() {
    return trustedSourceCatalog;
  }

  async listSourceOverviews() {
    return trustedSourceCatalog.map((source, index) => ({
      id: `seed-${index}`,
      name: source.name,
      url: source.url,
      type: source.type,
      trustLevel: source.trustLevel,
      enabled: true,
      lastFetchedAt: null,
      itemCount: 0,
    }));
  }

  async setSourceEnabled() {
    throw new Error("Connect a database to enable or disable sources.");
  }

  async insertLearningTopics(): Promise<{ id: string; title: string }[]> {
    throw new Error("Connect a database to add learning topics.");
  }

  async listUsedLearningSlugs() {
    return [];
  }

  async saveRun() {
    return;
  }

  async listKnownTopicFingerprints() {
    return [];
  }

  async listRecentTopics() {
    return [];
  }

  async listTopicsPendingBrief() {
    return [];
  }

  async getTopicPendingBrief() {
    return null;
  }

  async saveBrief() {
    return;
  }

  async recordAgentRun() {
    return;
  }
}
