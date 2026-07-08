import "server-only";

import type { DraftEdit, LinkedinDraft } from "@/core/draft-models";
import { DraftGenerator } from "@/server/content/draft-generator";
import { hasGeminiKey } from "@/server/ai/gemini-client";
import { createDraftRepository, createSettingsRepository } from "@/server/repositories";

export class DraftReviewService {
  private readonly repository = createDraftRepository();
  private readonly generator = new DraftGenerator();

  async approve(draftId: string) {
    const existing = await this.repository.getDraftWithTopic(draftId);

    if (!existing) {
      throw new Error("Draft not found.");
    }

    if (existing.draft.status !== "needs_review") {
      throw new Error(`Cannot approve a draft with status "${existing.draft.status}".`);
    }

    const userId = await this.repository.getOrCreateDefaultUser();
    await this.repository.approveDraft(draftId, userId);
  }

  async reject(draftId: string, note?: string) {
    const existing = await this.repository.getDraftWithTopic(draftId);

    if (!existing) {
      throw new Error("Draft not found.");
    }

    if (existing.draft.status !== "needs_review") {
      throw new Error(`Cannot reject a draft with status "${existing.draft.status}".`);
    }

    const userId = await this.repository.getOrCreateDefaultUser();
    await this.repository.rejectDraft(draftId, userId, note);
  }

  async edit(draftId: string, edit: DraftEdit) {
    const existing = await this.repository.getDraftWithTopic(draftId);

    if (!existing) {
      throw new Error("Draft not found.");
    }

    if (existing.draft.status !== "needs_review") {
      throw new Error(`Cannot edit a draft with status "${existing.draft.status}".`);
    }

    const userId = await this.repository.getOrCreateDefaultUser();
    await this.repository.editDraft(draftId, userId, edit);
  }

  async regenerate(draftId: string): Promise<LinkedinDraft> {
    if (!hasGeminiKey()) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }

    const existing = await this.repository.getDraftWithTopic(draftId);

    if (!existing) {
      throw new Error("Draft not found.");
    }

    if (existing.draft.status !== "needs_review") {
      throw new Error(`Cannot regenerate a draft with status "${existing.draft.status}".`);
    }

    const userId = await this.repository.getOrCreateDefaultUser();
    const style = await createSettingsRepository().getPreferences(userId);
    const draft = await this.generator.generate(existing.topic, {
      avoidAngle: existing.draft.angle,
      style,
    });
    await this.repository.saveRegeneratedDraft(draftId, userId, draft);

    return draft;
  }
}

export async function listTopicsReadyToDraft(limit = 20) {
  return createDraftRepository().listTopicsPendingDraft(limit);
}

export async function listDraftsForReview(limit = 30) {
  return createDraftRepository().listDraftsForReview(limit);
}
