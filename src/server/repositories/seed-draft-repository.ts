import "server-only";

import type { DraftRepository } from "@/server/repositories/draft-repository";

export class SeedDraftRepository implements DraftRepository {
  async listTopicsPendingDraft() {
    return [];
  }

  async getTopicForDraft() {
    return null;
  }

  async getOrCreateDefaultUser() {
    return "seed-user";
  }

  async saveDraft() {
    return;
  }

  async listDraftsForReview() {
    return [];
  }

  async getDraftWithTopic() {
    return null;
  }

  async approveDraft() {
    return;
  }

  async rejectDraft() {
    return;
  }

  async editDraft() {
    return;
  }

  async saveRegeneratedDraft() {
    return;
  }

  async recordAgentRun() {
    return;
  }
}
