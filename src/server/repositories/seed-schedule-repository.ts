import "server-only";

import type { ScheduleRepository } from "@/server/repositories/schedule-repository";

export class SeedScheduleRepository implements ScheduleRepository {
  async listApprovedDrafts() {
    return [];
  }

  async listScheduledPosts() {
    return [];
  }

  async listPublishedPosts() {
    return [];
  }

  async scheduleDraft() {
    return;
  }

  async cancelScheduledPost() {
    return;
  }

  async markPosted() {
    return;
  }
}
