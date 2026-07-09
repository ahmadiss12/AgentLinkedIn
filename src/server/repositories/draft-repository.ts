import "server-only";

import type {
  DraftEdit,
  DraftForReview,
  LinkedinDraft,
  TopicForDraft,
} from "@/core/draft-models";

export interface DraftRepository {
  listAllUserIds(): Promise<string[]>;
  listTopicsPendingDraft(userId: string, limit: number): Promise<TopicForDraft[]>;
  getTopicForDraft(userId: string, topicId: string): Promise<TopicForDraft | null>;
  saveDraft(topicId: string, userId: string, draft: LinkedinDraft): Promise<void>;
  listDraftsForReview(userId: string, limit: number): Promise<DraftForReview[]>;
  getDraftWithTopic(
    userId: string,
    draftId: string,
  ): Promise<{ draft: DraftForReview; topic: TopicForDraft } | null>;
  approveDraft(draftId: string, userId: string): Promise<void>;
  rejectDraft(draftId: string, userId: string, note?: string): Promise<void>;
  editDraft(draftId: string, userId: string, edit: DraftEdit): Promise<void>;
  saveRegeneratedDraft(draftId: string, userId: string, draft: LinkedinDraft): Promise<void>;
  recordAgentRun(run: {
    runId: string;
    userId: string;
    kind: string;
    status: string;
    startedAt: Date;
    finishedAt: Date;
    summary: string;
    error?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}
