import "server-only";

import type { DashboardSummary } from "@/core/content-models";
import type { ContentRepository } from "@/server/repositories/content-repository";

const seedDashboardSummary: DashboardSummary = {
  metrics: [
    { label: "Fresh topics", value: "18", detail: "6 need review" },
    { label: "Drafts waiting", value: "7", detail: "0 auto-approved" },
    { label: "Scheduled posts", value: "3", detail: "next: Thu 09:00" },
    { label: "Quality warnings", value: "4", detail: "mostly source depth" },
  ],
  discoveredTopics: [
    {
      title: "Rust in the Linux kernel keeps expanding",
      source: "Kernel.org, GitHub releases",
      freshness: "Today",
      score: "High",
      status: "Ready for brief",
    },
    {
      title: "New vector database patterns for agent memory",
      source: "Engineering blogs, papers",
      freshness: "2 days ago",
      score: "Medium",
      status: "Needs source check",
    },
    {
      title: "Passkeys adoption in developer platforms",
      source: "Official security blogs",
      freshness: "This week",
      score: "High",
      status: "Draft candidate",
    },
  ],
  draftQueue: [
    {
      title: "Why passkeys matter for developer tooling",
      angle: "Practical security lesson",
      status: "Needs approval",
      quality: "Strong sources",
    },
    {
      title: "What kernel Rust teaches teams about gradual adoption",
      angle: "Engineering process",
      status: "Edit requested",
      quality: "Fresh and specific",
    },
    {
      title: "Agent memory is becoming a product design problem",
      angle: "Trend commentary",
      status: "Needs verification",
      quality: "Speculative",
    },
  ],
  nextScheduled: {
    title: "Why passkeys matter for developer tooling",
    scheduledFor: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  },
  recentWarnings: [
    {
      topicTitle: "New vector database patterns for agent memory",
      warning: "Source depth is thin — only one blog post backs this claim.",
    },
  ],
};

export class SeedContentRepository implements ContentRepository {
  async getDashboardSummary() {
    return seedDashboardSummary;
  }

  async listReviewTimeline() {
    return [];
  }

  async listAgentRuns() {
    return [];
  }

  async listPostedHistory() {
    return [];
  }

  async getAnalyticsSummary() {
    return {
      topicsByStatus: [],
      draftsByStatus: [],
      reviewActions: [],
      qualitySignals: [],
      totalTopics: 0,
      totalDrafts: 0,
      totalPublished: 0,
      approvalRate: null,
      agentRunSuccessRate: null,
    };
  }
}
