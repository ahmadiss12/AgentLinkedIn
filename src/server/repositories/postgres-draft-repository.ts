import "server-only";

import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import type {
  DraftEdit,
  DraftForReview,
  LinkedinDraft,
  TopicForDraft,
} from "@/core/draft-models";
import type { getDb } from "@/server/db/client";
import {
  agentRuns,
  draftVersions,
  drafts,
  reviewEvents,
  topics,
  users,
} from "@/server/db/schema";
import type { DraftRepository } from "@/server/repositories/draft-repository";

type DbClient = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<DbClient["transaction"]>[0]>[0];

const DEFAULT_USER_EMAIL = "local@agentlinkedin.app";

const NO_ACTIVE_DRAFT = sql`NOT EXISTS (
  SELECT 1 FROM ${drafts} d
  WHERE d.topic_id = ${topics.id} AND d.status != 'rejected'
)`;

export class PostgresDraftRepository implements DraftRepository {
  constructor(private readonly db: DbClient) {}

  async listTopicsPendingDraft(limit: number): Promise<TopicForDraft[]> {
    const rows = await this.db
      .select({
        id: topics.id,
        title: topics.title,
        slug: topics.slug,
        category: topics.category,
        brief: topics.brief,
      })
      .from(topics)
      .where(and(eq(topics.status, "brief_ready"), isNotNull(topics.brief), NO_ACTIVE_DRAFT))
      .orderBy(desc(topics.relevanceScore))
      .limit(limit);

    return rows
      .filter((row) => row.brief !== null)
      .map((row) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        category: row.category,
        brief: row.brief!,
      }));
  }

  async getTopicForDraft(topicId: string): Promise<TopicForDraft | null> {
    const [row] = await this.db
      .select({
        id: topics.id,
        title: topics.title,
        slug: topics.slug,
        category: topics.category,
        brief: topics.brief,
      })
      .from(topics)
      .where(
        and(
          eq(topics.id, topicId),
          eq(topics.status, "brief_ready"),
          isNotNull(topics.brief),
          NO_ACTIVE_DRAFT,
        ),
      )
      .limit(1);

    if (!row || row.brief === null) {
      return null;
    }

    return { id: row.id, title: row.title, slug: row.slug, category: row.category, brief: row.brief };
  }

  async getOrCreateDefaultUser() {
    const [existing] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, DEFAULT_USER_EMAIL))
      .limit(1);

    if (existing) {
      return existing.id;
    }

    const [created] = await this.db
      .insert(users)
      .values({ email: DEFAULT_USER_EMAIL, name: "Local User" })
      .returning({ id: users.id });

    return created!.id;
  }

  async saveDraft(topicId: string, userId: string, draft: LinkedinDraft) {
    const [savedDraft] = await this.db
      .insert(drafts)
      .values({
        topicId,
        userId,
        title: draft.title,
        hook: draft.hook,
        body: draft.body,
        hashtags: draft.hashtags,
        angle: draft.angle,
        status: "needs_review",
        currentVersion: 1,
      })
      .returning({ id: drafts.id });

    if (savedDraft) {
      await this.db.insert(draftVersions).values({
        draftId: savedDraft.id,
        version: 1,
        hook: draft.hook,
        body: draft.body,
        hashtags: draft.hashtags,
        angle: draft.angle,
      });
    }

    await this.db
      .update(topics)
      .set({ status: "drafted", updatedAt: sql`now()` })
      .where(eq(topics.id, topicId));
  }

  async listDraftsForReview(limit: number): Promise<DraftForReview[]> {
    const rows = await this.db
      .select({
        id: drafts.id,
        topicId: drafts.topicId,
        topicTitle: topics.title,
        topicCategory: topics.category,
        title: drafts.title,
        hook: drafts.hook,
        body: drafts.body,
        hashtags: drafts.hashtags,
        angle: drafts.angle,
        status: drafts.status,
        currentVersion: drafts.currentVersion,
        createdAt: drafts.createdAt,
        updatedAt: drafts.updatedAt,
      })
      .from(drafts)
      .innerJoin(topics, eq(drafts.topicId, topics.id))
      .orderBy(desc(drafts.updatedAt))
      .limit(limit);

    return rows;
  }

  async getDraftWithTopic(draftId: string) {
    const [row] = await this.db
      .select({
        draft: {
          id: drafts.id,
          topicId: drafts.topicId,
          topicTitle: topics.title,
          topicCategory: topics.category,
          title: drafts.title,
          hook: drafts.hook,
          body: drafts.body,
          hashtags: drafts.hashtags,
          angle: drafts.angle,
          status: drafts.status,
          currentVersion: drafts.currentVersion,
          createdAt: drafts.createdAt,
          updatedAt: drafts.updatedAt,
        },
        topicBrief: topics.brief,
        topicSlug: topics.slug,
      })
      .from(drafts)
      .innerJoin(topics, eq(drafts.topicId, topics.id))
      .where(eq(drafts.id, draftId))
      .limit(1);

    if (!row || row.topicBrief === null) {
      return null;
    }

    return {
      draft: row.draft,
      topic: {
        id: row.draft.topicId,
        title: row.draft.topicTitle,
        slug: row.topicSlug,
        category: row.draft.topicCategory,
        brief: row.topicBrief,
      },
    };
  }

  async approveDraft(draftId: string, userId: string) {
    await this.db.transaction(async (tx) => {
      const topicId = await this.getDraftTopicId(tx, draftId);

      await tx
        .update(drafts)
        .set({ status: "approved", approvedAt: sql`now()`, updatedAt: sql`now()` })
        .where(eq(drafts.id, draftId));

      if (topicId) {
        await tx
          .update(topics)
          .set({ status: "approved", updatedAt: sql`now()` })
          .where(eq(topics.id, topicId));
      }

      await tx.insert(reviewEvents).values({ draftId, userId, action: "approve" });
    });
  }

  async rejectDraft(draftId: string, userId: string, note?: string) {
    await this.db.transaction(async (tx) => {
      const topicId = await this.getDraftTopicId(tx, draftId);

      await tx
        .update(drafts)
        .set({ status: "rejected", rejectedAt: sql`now()`, updatedAt: sql`now()` })
        .where(eq(drafts.id, draftId));

      if (topicId) {
        // The draft is rejected, not the topic — revert to brief_ready so
        // the topic reappears in the "ready to draft" queue for a fresh
        // attempt. This mirrors the NOT EXISTS(... status != 'rejected')
        // eligibility check in listTopicsPendingDraft / getTopicForDraft.
        await tx
          .update(topics)
          .set({ status: "brief_ready", updatedAt: sql`now()` })
          .where(eq(topics.id, topicId));
      }

      await tx.insert(reviewEvents).values({ draftId, userId, action: "reject", note });
    });
  }

  async editDraft(draftId: string, userId: string, edit: DraftEdit) {
    await this.applyNewVersion(draftId, userId, {
      title: edit.title,
      hook: edit.hook,
      body: edit.body,
      hashtags: edit.hashtags,
      angle: edit.angle,
      changeReason: "manual edit",
      action: "edit",
    });
  }

  async saveRegeneratedDraft(draftId: string, userId: string, draft: LinkedinDraft) {
    await this.applyNewVersion(draftId, userId, {
      title: draft.title,
      hook: draft.hook,
      body: draft.body,
      hashtags: draft.hashtags,
      angle: draft.angle,
      changeReason: "regenerated with a different angle",
      action: "regenerate",
    });
  }

  async recordAgentRun(run: {
    runId: string;
    kind: string;
    status: string;
    startedAt: Date;
    finishedAt: Date;
    summary: string;
    error?: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.db.insert(agentRuns).values({
      id: run.runId,
      kind: run.kind,
      status: run.status,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      summary: run.summary,
      error: run.error ?? null,
      metadata: run.metadata,
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

  private async applyNewVersion(
    draftId: string,
    userId: string,
    content: {
      title: string;
      hook: string;
      body: string;
      hashtags: string[];
      angle: string;
      changeReason: string;
      action: string;
    },
  ) {
    await this.db.transaction(async (tx) => {
      const [current] = await tx
        .select({ currentVersion: drafts.currentVersion })
        .from(drafts)
        .where(eq(drafts.id, draftId))
        .limit(1);

      if (!current) {
        throw new Error("Draft not found.");
      }

      const nextVersion = current.currentVersion + 1;

      await tx.insert(draftVersions).values({
        draftId,
        version: nextVersion,
        hook: content.hook,
        body: content.body,
        hashtags: content.hashtags,
        angle: content.angle,
        changeReason: content.changeReason,
      });

      await tx
        .update(drafts)
        .set({
          title: content.title,
          hook: content.hook,
          body: content.body,
          hashtags: content.hashtags,
          angle: content.angle,
          currentVersion: nextVersion,
          status: "needs_review",
          updatedAt: sql`now()`,
        })
        .where(eq(drafts.id, draftId));

      await tx.insert(reviewEvents).values({ draftId, userId, action: content.action });
    });
  }
}
