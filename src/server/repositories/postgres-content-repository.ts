import "server-only";

import { count, desc, eq, isNotNull, sql } from "drizzle-orm";
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

  async getDashboardSummary() {
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
      this.db.select({ count: count() }).from(topics),
      this.db
        .select({ count: count() })
        .from(drafts)
        .where(eq(drafts.status, "needs_review")),
      this.db
        .select({ count: count() })
        .from(scheduledPosts)
        .where(eq(scheduledPosts.status, "queued")),
      this.db
        .select({ count: count() })
        .from(qualityChecks)
        .where(isNotNull(qualityChecks.warning)),
      this.db
        .select({
          title: topics.title,
          source: topics.category,
          freshness: topics.lastSeenAt,
          score: topics.relevanceScore,
          status: topics.status,
        })
        .from(topics)
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
        .orderBy(desc(drafts.updatedAt))
        .limit(3),
      this.db
        .select({
          title: drafts.title,
          scheduledFor: scheduledPosts.scheduledFor,
        })
        .from(scheduledPosts)
        .innerJoin(drafts, eq(scheduledPosts.draftId, drafts.id))
        .where(eq(scheduledPosts.status, "queued"))
        .orderBy(scheduledPosts.scheduledFor)
        .limit(1),
      this.db
        .select({
          topicTitle: topics.title,
          warning: qualityChecks.warning,
        })
        .from(qualityChecks)
        .innerJoin(topics, eq(qualityChecks.topicId, topics.id))
        .where(isNotNull(qualityChecks.warning))
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

  async listReviewTimeline(limit: number) {
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
      .orderBy(desc(reviewEvents.createdAt))
      .limit(limit);
  }

  async listAgentRuns(limit: number) {
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
      .orderBy(desc(agentRuns.startedAt))
      .limit(limit);
  }

  async listPostedHistory(limit: number) {
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
      .orderBy(desc(publishedPosts.publishedAt))
      .limit(limit);
  }

  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
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
        .groupBy(topics.status),
      this.db
        .select({ status: drafts.status, count: count() })
        .from(drafts)
        .groupBy(drafts.status),
      this.db
        .select({ action: reviewEvents.action, count: count() })
        .from(reviewEvents)
        .groupBy(reviewEvents.action),
      this.db
        .select({
          signal: sql<string>`signal_item`,
          count: count(),
        })
        .from(
          sql`${qualityChecks}, jsonb_array_elements_text(${qualityChecks.signals}) AS signal_item`,
        )
        .groupBy(sql`signal_item`),
      this.db.select({ count: count() }).from(publishedPosts),
      this.db
        .select({ status: agentRuns.status, count: count() })
        .from(agentRuns)
        .groupBy(agentRuns.status),
    ]);

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
      qualitySignals: signalRows.map((row) => ({
        signal: row.signal,
        count: row.count,
      })),
      totalTopics,
      totalDrafts,
      totalPublished: publishedRows[0]?.count ?? 0,
      approvalRate: reviewedTotal > 0 ? Math.round((approvals / reviewedTotal) * 100) : null,
      agentRunSuccessRate: totalRuns > 0 ? Math.round((successRuns / totalRuns) * 100) : null,
    };
  }
}
