import "server-only";

import type {
  ApprovedDraft,
  PublishedPostView,
  ScheduledPostView,
} from "@/core/schedule-models";

export interface ScheduleRepository {
  listApprovedDrafts(limit: number): Promise<ApprovedDraft[]>;
  listScheduledPosts(limit: number): Promise<ScheduledPostView[]>;
  listPublishedPosts(limit: number): Promise<PublishedPostView[]>;
  scheduleDraft(draftId: string, userId: string, scheduledFor: Date): Promise<void>;
  cancelScheduledPost(scheduledPostId: string, userId: string): Promise<void>;
  markPosted(scheduledPostId: string, userId: string, publishedUrl?: string): Promise<void>;
}
