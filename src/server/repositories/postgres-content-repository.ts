import "server-only";

import { and, count, desc, eq, isNotNull } from "drizzle-orm";
import type { AnalyticsSummary } from "@/core/analytics-models";
import type { QualitySignal } from "@/core/content-models";
import type { ContentRepository } from "@/server/repositories/content-repository";
import {
  agentRuns,
  drafts,
  publishedPosts,
  qualityChecks,
  reviewEvents,
  scheduledPosts,
  topics,
} from "@/server/db/schema";
import type { getDb } from "@/server/db/client";

type DbClient = ReturnType<typeof getDb>;

const SIGNAL_LABEL: Record<QualitySignal, string> = {
  strong_sources: "Strong sources",
  needs_source_check: "Needs source check",
  stale: "Stale",
  duplicate_risk: "Duplicate risk",
  speculative: "Speculative",
  low_relevance: "Low relevance",
};

export class PostgresContentRepository implements ContentRepository {
  constructor(private readonly db: DbClient) {}

  async getDashboardSummary(userId: string) {
    const [
      freshTopicRows,
      needsReviewRows,
      queuedScheduleRows,
      warningRows,
      topicRows,
      reviewRows,
      nextScheduledRows,
      recentWarningRows,
    ] = await Promise.all([
      this.db.select({ count: count() }).from(topics).where(eq(topics.userId, userId)),
      this.db
        .select({ count: count() })
        .from(drafts)
        .where(and(eq(drafts.userId, userId), eq(drafts.status, "needs_review"))),
      this.db
        .select({ count: count() })
        .from(scheduledPosts)
        .innerJoin(drafts, eq(scheduledPosts.draftId, drafts.id))
        .where(and(eq(drafts.userId, userId), eq(scheduledPosts.status, "queued"))),
      this.db
        .select({ count: count() })
        .from(qualityChecks)
        .innerJoin(topics, eq(qualityChecks.topicId, topics.id))
        .where(and(eq(topics.userId, userId), isNotNull(qualityChecks.warning))),
      this.db
        .select({
          title: topics.title,
          source: topics.category,
          freshness: topics.lastSeenAt,
          score: topics.relevanceScore,
          status: topics.status,
        })
        .from(topics)
        .where(eq(topics.userId, userId))
        .orderBy(desc(topics.lastSeenAt))
        .limit(3),
      this.db
        .select({
          title: drafts.title,
          angle: drafts.angle,
          status: drafts.status,
          topicId: drafts.topicId,
        })
        .from(drafts)
        .where(eq(drafts.userId, userId))
        .orderBy(desc(drafts.updatedAt))
        .limit(3),
      this.db
        .select({
          title: drafts.title,
          scheduledFor: scheduledPosts.scheduledFor,
        })
        .from(scheduledPosts)
        .innerJoin(drafts, eq(scheduledPosts.draftId, drafts.id))
        .where(and(eq(drafts.userId, userId), eq(scheduledPosts.status, "queued")))
        .orderBy(scheduledPosts.scheduledFor)
        .limit(1),
      this.db
        .select({
          topicTitle: topics.title,
          warning: qualityChecks.warning,
        })
        .from(qualityChecks)
        .innerJoin(topics, eq(qualityChecks.topicId, topics.id))
        .where(and(eq(topics.userId, userId), isNotNull(qualityChecks.warning)))
        .orderBy(desc(qualityChecks.checkedAt))
        .limit(3),
    ]);

    const draftQueue = await Promise.all(
      reviewRows.map(async (draft) => {
        let quality = "No quality check yet";

        if (draft.topicId) {
          const [latestCheck] = await this.db
            .select({ signals: qualityChecks.signals })
            .from(qualityChecks)
            .where(eq(qualityChecks.topicId, draft.topicId))
            .orderBy(desc(qualityChecks.checkedAt))
            .limit(1);

          const firstSignal = latestCheck?.signals?.[0];
          if (firstSignal) {
            quality = SIGNAL_LABEL[firstSignal];
          }
        }

        return {
          title: draft.title,
          angle: draft.angle,
          status: draft.status.replaceAll("_", " "),
          quality,
        };
      }),
    );

    return {
      metrics: [
        {
          label: "Fresh topics",
          value: String(freshTopicRows[0]?.count ?? 0),
          detail: "stored topic candidates",
        },
        {
          label: "Drafts waiting",
          value: String(needsReviewRows[0]?.count ?? 0),
          detail: "awaiting your review",
        },
        {
          label: "Scheduled posts",
          value: String(queuedScheduleRows[0]?.count ?? 0),
          detail: "queued for publishing",
        },
        {
          label: "Quality warnings",
          value: String(warningRows[0]?.count ?? 0),
          detail: "flagged checks",
        },
      ],
      discoveredTopics: topicRows.map((topic) => ({
        title: topic.title,
        source: topic.source.replaceAll("_", " "),
        freshness: topic.freshness.toLocaleDateString(),
        score: topic.score >= 80 ? "High" : topic.score >= 50 ? "Medium" : "Low",
        status: topic.status.replaceAll("_", " "),
      })),
      draftQueue,
      nextScheduled: nextScheduledRows[0]
        ? {
            title: nextScheduledRows[0].title,
            scheduledFor: nextScheduledRows[0].scheduledFor.toISOString(),
          }
        : null,
      recentWarnings: recentWarningRows.map((row) => ({
        topicTitle: row.topicTitle,
        warning: row.warning ?? "",
      })),
    };
  }

  async listReviewTimeline(userId: string, limit: number) {
    return this.db
      .select({
        id: reviewEvents.id,
        action: reviewEvents.action,
        note: reviewEvents.note,
        draftTitle: drafts.title,
        topicTitle: topics.title,
        createdAt: reviewEvents.createdAt,
      })
      .from(reviewEvents)
      .innerJoin(drafts, eq(reviewEvents.draftId, drafts.id))
      .innerJoin(topics, eq(drafts.topicId, topics.id))
      .where(eq(drafts.userId, userId))
      .orderBy(desc(reviewEvents.createdAt))
      .limit(limit);
  }

  async listAgentRuns(userId: string, limit: number) {
    return this.db
      .select({
        id: agentRuns.id,
        kind: agentRuns.kind,
        status: agentRuns.status,
        summary: agentRuns.summary,
        error: agentRuns.error,
        startedAt: agentRuns.startedAt,
        finishedAt: agentRuns.finishedAt,
      })
      .from(agentRuns)
      .where(eq(agentRuns.userId, userId))
      .orderBy(desc(agentRuns.startedAt))
      .limit(limit);
  }

  async listPostedHistory(userId: string, limit: number) {
    return this.db
      .select({
        id: publishedPosts.id,
        draftTitle: drafts.title,
        hook: drafts.hook,
        angle: drafts.angle,
        publishedAt: publishedPosts.publishedAt,
        publishedUrl: publishedPosts.publishedUrl,
      })
      .from(publishedPosts)
      .innerJoin(drafts, eq(publishedPosts.draftId, drafts.id))
      .where(eq(drafts.userId, userId))
      .orderBy(desc(publishedPosts.publishedAt))
      .limit(limit);
  }

  async getAnalyticsSummary(userId: string): Promise<AnalyticsSummary> {
    const [
      topicsByStatus,
      draftsByStatus,
      reviewActions,
      signalRows,
      publishedRows,
      runRows,
    ] = await Promise.all([
      this.db
        .select({ status: topics.status, count: count() })
        .from(topics)
        .where(eq(topics.userId, userId))
        .groupBy(topics.status),
      this.db
        .select({ status: drafts.status, count: count() })
        .from(drafts)
        .where(eq(drafts.userId, userId))
        .groupBy(drafts.status),
      this.db
        .select({ action: reviewEvents.action, count: count() })
        .from(reviewEvents)
        .innerJoin(drafts, eq(reviewEvents.draftId, drafts.id))
        .where(eq(drafts.userId, userId))
        .groupBy(reviewEvents.action),
      this.db
        .select({ signals: qualityChecks.signals })
        .from(qualityChecks)
        .innerJoin(topics, eq(qualityChecks.topicId, topics.id))
        .where(eq(topics.userId, userId)),
      this.db
        .select({ count: count() })
        .from(publishedPosts)
        .innerJoin(drafts, eq(publishedPosts.draftId, drafts.id))
        .where(eq(drafts.userId, userId)),
      this.db
        .select({ status: agentRuns.status, count: count() })
        .from(agentRuns)
        .where(eq(agentRuns.userId, userId))
        .groupBy(agentRuns.status),
    ]);

    const signalCounts = new Map<string, number>();
    for (const row of signalRows) {
      for (const signal of row.signals) {
        signalCounts.set(signal, (signalCounts.get(signal) ?? 0) + 1);
      }
    }

    const totalTopics = topicsByStatus.reduce((sum, row) => sum + row.count, 0);
    const totalDrafts = draftsByStatus.reduce((sum, row) => sum + row.count, 0);
    const approvals =
      reviewActions.find((row) => row.action === "approve")?.count ?? 0;
    const rejections =
      reviewActions.find((row) => row.action === "reject")?.count ?? 0;
    const reviewedTotal = approvals + rejections;
    const successRuns = runRows.find((row) => row.status === "success")?.count ?? 0;
    const totalRuns = runRows.reduce((sum, row) => sum + row.count, 0);

    return {
      topicsByStatus: topicsByStatus.map((row) => ({
        status: row.status,
        count: row.count,
      })),
      draftsByStatus: draftsByStatus.map((row) => ({
        status: row.status,
        count: row.count,
      })),
      reviewActions: reviewActions.map((row) => ({
        action: row.action,
        count: row.count,
      })),
      qualitySignals: Array.from(signalCounts.entries()).map(([signal, signalCount]) => ({
        signal,
        count: signalCount,
      })),
      totalTopics,
      totalDrafts,
      totalPublished: publishedRows[0]?.count ?? 0,
      approvalRate: reviewedTotal > 0 ? Math.round((approvals / reviewedTotal) * 100) : null,
      agentRunSuccessRate: totalRuns > 0 ? Math.round((successRuns / totalRuns) * 100) : null,
    };
  }
}
