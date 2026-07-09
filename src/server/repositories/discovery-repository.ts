import "server-only";

import type {
  DiscoveryRunResult,
  RecentTopic,
  TrustedSource,
} from "@/core/discovery-models";
import type { ResearchBrief, RiskLevel, TopicForBrief } from "@/core/research-brief-models";
import type { SourceOverview } from "@/core/source-models";
import type { LearningConcept } from "@/server/discovery/learning-catalog";

export interface DiscoveryRepository {
  // Sources are a shared catalog (same feeds for everyone) — these
  // methods are intentionally not scoped to a user.
  listSources(): Promise<TrustedSource[]>;
  listSourceOverviews(): Promise<SourceOverview[]>;
  setSourceEnabled(sourceId: string, enabled: boolean): Promise<void>;

  insertLearningTopics(
    userId: string,
    concepts: LearningConcept[],
  ): Promise<{ id: string; title: string }[]>;
  listUsedLearningSlugs(userId: string): Promise<string[]>;
  saveRun(userId: string, result: DiscoveryRunResult): Promise<void>;
  listKnownTopicFingerprints(
    userId: string,
    limit: number,
  ): Promise<{ slug: string; title: string; summary: string }[]>;
  listRecentTopics(userId: string, limit: number): Promise<RecentTopic[]>;
  listTopicsPendingBrief(userId: string, limit: number): Promise<TopicForBrief[]>;
  getTopicPendingBrief(userId: string, topicId: string): Promise<TopicForBrief | null>;
  saveBrief(topicId: string, brief: ResearchBrief, riskLevel: RiskLevel): Promise<void>;
  recordAgentRun(run: {
    runId: string;
    userId: string;
    kind: string;
    status: string;
    startedAt: Date;
    finishedAt: Date;
    summary: string;
    error?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}
