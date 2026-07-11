import "server-only";

import { and, count, desc, eq, lte } from "drizzle-orm";
import type { NotificationView } from "@/core/notification-models";
import type { getDb } from "@/server/db/client";
import { drafts, notifications, scheduledPosts } from "@/server/db/schema";
import type { NotificationRepository } from "@/server/repositories/notification-repository";

type DbClient = ReturnType<typeof getDb>;

export class PostgresNotificationRepository implements NotificationRepository {
  constructor(private readonly db: DbClient) {}

  async syncDuePostNotifications(userId: string): Promise<number> {
    const duePosts = await this.db
      .select({
        id: scheduledPosts.id,
        scheduledFor: scheduledPosts.scheduledFor,
        draftTitle: drafts.title,
      })
      .from(scheduledPosts)
      .innerJoin(drafts, eq(scheduledPosts.draftId, drafts.id))
      .where(
        and(
          // Only this user's due posts — without this filter, whichever
          // user's bell polls first would claim the notification (and the
          // unique (kind, ref_id) index would then block the real owner's).
          eq(drafts.userId, userId),
          eq(scheduledPosts.status, "queued"),
          lte(scheduledPosts.scheduledFor, new Date()),
        ),
      );

    let created = 0;

    for (const post of duePosts) {
      // The unique (kind, ref_id) index makes this a no-op if the
      // notification for this scheduled post already exists.
      const inserted = await this.db
        .insert(notifications)
        .values({
          userId,
          kind: "post_due",
          refId: post.id,
          title: "Time to publish on LinkedIn",
          body: `"${post.draftTitle}" was scheduled for ${post.scheduledFor.toLocaleString()}. Copy it from the Schedule page, post it, then mark it as posted.`,
        })
        .onConflictDoNothing()
        .returning({ id: notifications.id });

      created += inserted.length;
    }

    return created;
  }

  async listNotifications(userId: string, limit: number): Promise<NotificationView[]> {
    return this.db
      .select({
        id: notifications.id,
        kind: notifications.kind,
        title: notifications.title,
        body: notifications.body,
        status: notifications.status,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async countUnread(userId: string): Promise<number> {
    const [row] = await this.db
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.status, "unread")));

    return row?.count ?? 0;
  }

  async markRead(notificationId: string, userId: string): Promise<void> {
    const updated = await this.db
      .update(notifications)
      .set({ status: "read" })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
      .returning({ id: notifications.id });

    if (updated.length === 0) {
      throw new Error("Notification not found.");
    }
  }

  async markAllRead(userId: string): Promise<void> {
    await this.db
      .update(notifications)
      .set({ status: "read" })
      .where(and(eq(notifications.userId, userId), eq(notifications.status, "unread")));
  }
}
