import "server-only";

import { createScheduleRepository } from "@/server/repositories";

export class ScheduleService {
  private readonly repository = createScheduleRepository();

  async schedule(userId: string, draftId: string, scheduledFor: Date) {
    await this.repository.scheduleDraft(draftId, userId, scheduledFor);
  }

  async cancel(userId: string, scheduledPostId: string) {
    await this.repository.cancelScheduledPost(scheduledPostId, userId);
  }

  async markPosted(userId: string, scheduledPostId: string, publishedUrl?: string) {
    await this.repository.markPosted(scheduledPostId, userId, publishedUrl);
  }
}

export async function listApprovedDrafts(userId: string, limit = 20) {
  return createScheduleRepository().listApprovedDrafts(userId, limit);
}

export async function listScheduledPosts(userId: string, limit = 20) {
  return createScheduleRepository().listScheduledPosts(userId, limit);
}

export async function listPublishedPosts(userId: string, limit = 10) {
  return createScheduleRepository().listPublishedPosts(userId, limit);
}

export async function scheduleDraft(userId: string, draftId: string, scheduledFor: Date) {
  return new ScheduleService().schedule(userId, draftId, scheduledFor);
}

export async function cancelScheduledPost(userId: string, scheduledPostId: string) {
  return new ScheduleService().cancel(userId, scheduledPostId);
}

export async function markScheduledPostPosted(
  userId: string,
  scheduledPostId: string,
  publishedUrl?: string,
) {
  return new ScheduleService().markPosted(userId, scheduledPostId, publishedUrl);
}
