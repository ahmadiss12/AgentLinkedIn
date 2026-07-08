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
  listSources(): Promise<TrustedSource[]>;
  listSourceOverviews(): Promise<SourceOverview[]>;
  setSourceEnabled(sourceId: string, enabled: boolean): Promise<void>;
  insertLearningTopics(concepts: LearningConcept[]): Promise<{ id: string; title: string }[]>;
  listUsedLearningSlugs(): Promise<string[]>;
  saveRun(result: DiscoveryRunResult): Promise<void>;
  listKnownTopicFingerprints(limit: number): Promise<
    { slug: string; title: string; summary: string }[]
  >;
  listRecentTopics(limit: number): Promise<RecentTopic[]>;
  listTopicsPendingBrief(limit: number): Promise<TopicForBrief[]>;
  getTopicPendingBrief(topicId: string): Promise<TopicForBrief | null>;
  saveBrief(topicId: string, brief: ResearchBrief, riskLevel: RiskLevel): Promise<void>;
  recordAgentRun(run: {
    runId: string;
    kind: string;
    status: string;
    startedAt: Date;
    finishedAt: Date;
    summary: string;
    error?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}
