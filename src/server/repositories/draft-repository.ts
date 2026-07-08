import "server-only";

import type {
  DraftEdit,
  DraftForReview,
  LinkedinDraft,
  TopicForDraft,
} from "@/core/draft-models";

export interface DraftRepository {
  listTopicsPendingDraft(limit: number): Promise<TopicForDraft[]>;
  getTopicForDraft(topicId: string): Promise<TopicForDraft | null>;
  getOrCreateDefaultUser(): Promise<string>;
  saveDraft(topicId: string, userId: string, draft: LinkedinDraft): Promise<void>;
  listDraftsForReview(limit: number): Promise<DraftForReview[]>;
  getDraftWithTopic(
    draftId: string,
  ): Promise<{ draft: DraftForReview; topic: TopicForDraft } | null>;
  approveDraft(draftId: string, userId: string): Promise<void>;
  rejectDraft(draftId: string, userId: string, note?: string): Promise<void>;
  editDraft(draftId: string, userId: string, edit: DraftEdit): Promise<void>;
  saveRegeneratedDraft(draftId: string, userId: string, draft: LinkedinDraft): Promise<void>;
  recordAgentRun(run: {
    runId: string;
    kind: string;
    status: string;
    startedAt: Date;
    finishedAt: Date;
    summary: string;
    error?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}
