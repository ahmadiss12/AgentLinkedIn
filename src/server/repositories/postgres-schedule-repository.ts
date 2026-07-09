import "server-only";

import { and, desc, eq, ne, sql } from "drizzle-orm";
import type {
  ApprovedDraft,
  PublishedPostView,
  ScheduledPostView,
} from "@/core/schedule-models";
import type { getDb } from "@/server/db/client";
import {
  drafts,
  publishedPosts,
  reviewEvents,
  scheduledPosts,
  topics,
} from "@/server/db/schema";
import type { ScheduleRepository } from "@/server/repositories/schedule-repository";

type DbClient = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<DbClient["transaction"]>[0]>[0];

export class PostgresScheduleRepository implements ScheduleRepository {
  constructor(private readonly db: DbClient) {}

  async listApprovedDrafts(userId: string, limit: number): Promise<ApprovedDraft[]> {
    return this.db
      .select({
        id: drafts.id,
        topicId: drafts.topicId,
        topicTitle: topics.title,
        title: drafts.title,
        hook: drafts.hook,
        body: drafts.body,
        hashtags: drafts.hashtags,
        angle: drafts.angle,
      })
      .from(drafts)
      .innerJoin(topics, eq(drafts.topicId, topics.id))
      .where(and(eq(drafts.userId, userId), eq(drafts.status, "approved")))
      .orderBy(desc(drafts.updatedAt))
      .limit(limit);
  }

  async listScheduledPosts(userId: string, limit: number): Promise<ScheduledPostView[]> {
    return this.db
      .select({
        id: scheduledPosts.id,
        draftId: scheduledPosts.draftId,
        draftTitle: drafts.title,
        hook: drafts.hook,
        body: drafts.body,
        hashtags: drafts.hashtags,
        scheduledFor: scheduledPosts.scheduledFor,
        status: scheduledPosts.status,
        attempts: scheduledPosts.attempts,
        lastError: scheduledPosts.lastError,
      })
      .from(scheduledPosts)
      .innerJoin(drafts, eq(scheduledPosts.draftId, drafts.id))
      .where(
        and(
          eq(drafts.userId, userId),
          ne(scheduledPosts.status, "posted"),
          ne(scheduledPosts.status, "cancelled"),
        ),
      )
      .orderBy(scheduledPosts.scheduledFor)
      .limit(limit);
  }

  async listPublishedPosts(userId: string, limit: number): Promise<PublishedPostView[]> {
    return this.db
      .select({
        id: publishedPosts.id,
        draftId: publishedPosts.draftId,
        draftTitle: drafts.title,
        publishedAt: publishedPosts.publishedAt,
        publishedUrl: publishedPosts.publishedUrl,
        linkedinPostUrn: publishedPosts.linkedinPostUrn,
      })
      .from(publishedPosts)
      .innerJoin(drafts, eq(publishedPosts.draftId, drafts.id))
      .where(eq(drafts.userId, userId))
      .orderBy(desc(publishedPosts.publishedAt))
      .limit(limit);
  }

  async scheduleDraft(draftId: string, userId: string, scheduledFor: Date) {
    await this.db.transaction(async (tx) => {
      const [draftRow] = await tx
        .select({ status: drafts.status, topicId: drafts.topicId })
        .from(drafts)
        // Ownership check: only the draft's own owner can schedule it.
        .where(and(eq(drafts.id, draftId), eq(drafts.userId, userId)))
        .limit(1);

      if (!draftRow) {
        throw new Error("Draft not found.");
      }

      if (draftRow.status !== "approved") {
        throw new Error(`Cannot schedule a draft with status "${draftRow.status}".`);
      }

      const topicId = draftRow.topicId;

      await tx.insert(scheduledPosts).values({ draftId, scheduledFor, status: "queued" });

      await tx
        .update(drafts)
        .set({ status: "scheduled", updatedAt: sql`now()` })
        .where(eq(drafts.id, draftId));

      if (topicId) {
        await tx
          .update(topics)
          .set({ status: "scheduled", updatedAt: sql`now()` })
          .where(eq(topics.id, topicId));
      }

      await tx.insert(reviewEvents).values({
        draftId,
        userId,
        action: "schedule",
        note: `scheduled for ${scheduledFor.toISOString()}`,
      });
    });
  }

  async cancelScheduledPost(scheduledPostId: string, userId: string) {
    await this.db.transaction(async (tx) => {
      const [row] = await tx
        .select({
          draftId: scheduledPosts.draftId,
          status: scheduledPosts.status,
          draftOwnerId: drafts.userId,
        })
        .from(scheduledPosts)
        .innerJoin(drafts, eq(scheduledPosts.draftId, drafts.id))
        .where(eq(scheduledPosts.id, scheduledPostId))
        .limit(1);

      if (!row || row.draftOwnerId !== userId) {
        throw new Error("Scheduled post not found.");
      }

      if (row.status !== "queued") {
        throw new Error(`Cannot cancel a scheduled post with status "${row.status}".`);
      }

      const topicId = await this.getDraftTopicId(tx, row.draftId);

      await tx
        .update(scheduledPosts)
        .set({ status: "cancelled", updatedAt: sql`now()` })
        .where(eq(scheduledPosts.id, scheduledPostId));

      await tx
        .update(drafts)
        .set({ status: "approved", updatedAt: sql`now()` })
        .where(eq(drafts.id, row.draftId));

      if (topicId) {
        await tx
          .update(topics)
          .set({ status: "approved", updatedAt: sql`now()` })
          .where(eq(topics.id, topicId));
      }

      await tx.insert(reviewEvents).values({
        draftId: row.draftId,
        userId,
        action: "cancel_schedule",
      });
    });
  }

  async markPosted(scheduledPostId: string, userId: string, publishedUrl?: string) {
    await this.db.transaction(async (tx) => {
      const [row] = await tx
        .select({
          draftId: scheduledPosts.draftId,
          status: scheduledPosts.status,
          draftOwnerId: drafts.userId,
        })
        .from(scheduledPosts)
        .innerJoin(drafts, eq(scheduledPosts.draftId, drafts.id))
        .where(eq(scheduledPosts.id, scheduledPostId))
        .limit(1);

      if (!row || row.draftOwnerId !== userId) {
        throw new Error("Scheduled post not found.");
      }

      if (row.status !== "queued") {
        throw new Error(`Cannot mark a scheduled post with status "${row.status}" as posted.`);
      }

      const topicId = await this.getDraftTopicId(tx, row.draftId);

      await tx
        .update(scheduledPosts)
        .set({ status: "posted", updatedAt: sql`now()` })
        .where(eq(scheduledPosts.id, scheduledPostId));

      await tx.insert(publishedPosts).values({
        draftId: row.draftId,
        publishedUrl: publishedUrl ?? null,
        linkedinPostUrn: null,
      });

      await tx
        .update(drafts)
        .set({ status: "posted", updatedAt: sql`now()` })
        .where(eq(drafts.id, row.draftId));

      if (topicId) {
        await tx
          .update(topics)
          .set({ status: "posted", updatedAt: sql`now()` })
          .where(eq(topics.id, topicId));
      }

      await tx.insert(reviewEvents).values({
        draftId: row.draftId,
        userId,
        action: "mark_posted",
        note: publishedUrl,
      });
    });
  }

  private async getDraftTopicId(tx: Tx, draftId: string) {
    const [row] = await tx
      .select({ topicId: drafts.topicId })
      .from(drafts)
      .where(eq(drafts.id, draftId))
      .limit(1);

    return row?.topicId ?? null;
  }
}
