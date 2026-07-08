import "server-only";

import { createDraftRepository, createScheduleRepository } from "@/server/repositories";

export class ScheduleService {
  private readonly repository = createScheduleRepository();
  private readonly draftRepository = createDraftRepository();

  async schedule(draftId: string, scheduledFor: Date) {
    const userId = await this.draftRepository.getOrCreateDefaultUser();
    await this.repository.scheduleDraft(draftId, userId, scheduledFor);
  }

  async cancel(scheduledPostId: string) {
    const userId = await this.draftRepository.getOrCreateDefaultUser();
    await this.repository.cancelScheduledPost(scheduledPostId, userId);
  }

  async markPosted(scheduledPostId: string, publishedUrl?: string) {
    const userId = await this.draftRepository.getOrCreateDefaultUser();
    await this.repository.markPosted(scheduledPostId, userId, publishedUrl);
  }
}

export async function listApprovedDrafts(limit = 20) {
  return createScheduleRepository().listApprovedDrafts(limit);
}

export async function listScheduledPosts(limit = 20) {
  return createScheduleRepository().listScheduledPosts(limit);
}

export async function listPublishedPosts(limit = 10) {
  return createScheduleRepository().listPublishedPosts(limit);
}

export async function scheduleDraft(draftId: string, scheduledFor: Date) {
  return new ScheduleService().schedule(draftId, scheduledFor);
}

export async function cancelScheduledPost(scheduledPostId: string) {
  return new ScheduleService().cancel(scheduledPostId);
}

export async function markScheduledPostPosted(scheduledPostId: string, publishedUrl?: string) {
  return new ScheduleService().markPosted(scheduledPostId, publishedUrl);
}
