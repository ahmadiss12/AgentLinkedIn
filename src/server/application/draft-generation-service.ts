import "server-only";

import { randomUUID } from "node:crypto";
import type { TopicForDraft } from "@/core/draft-models";
import { checkDraftEligibility } from "@/server/content/draft-eligibility";
import { DraftGenerator } from "@/server/content/draft-generator";
import { hasGeminiKey } from "@/server/ai/gemini-client";
import { createDraftRepository, createSettingsRepository } from "@/server/repositories";

export type RunDraftsOptions = {
  maxTopics?: number;
  topicId?: string;
};

export type DraftRunResult = {
  runId: string;
  startedAt: Date;
  finishedAt: Date;
  drafted: {
    topicId: string;
    title: string;
    hook: string;
    body: string;
    angle: string;
    hashtags: string[];
  }[];
  skipped: { topicId: string; title: string; reason: string }[];
  errors: { topicId: string; title: string; message: string }[];
};

export class DraftGenerationService {
  private readonly repository = createDraftRepository();
  private readonly generator = new DraftGenerator();

  async run(options: RunDraftsOptions = {}): Promise<DraftRunResult> {
    const startedAt = new Date();
    const maxTopics = options.maxTopics ?? 5;

    if (!hasGeminiKey()) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }

    const result: DraftRunResult = {
      runId: randomUUID(),
      startedAt,
      finishedAt: startedAt,
      drafted: [],
      skipped: [],
      errors: [],
    };

    let candidates: TopicForDraft[];

    if (options.topicId) {
      const topic = await this.repository.getTopicForDraft(options.topicId);
      candidates = topic ? [topic] : [];

      if (!topic) {
        result.errors.push({
          topicId: options.topicId,
          title: options.topicId,
          message: "Topic is not eligible for drafting (not brief-ready, or an active draft already exists).",
        });
      }
    } else {
      candidates = await this.repository.listTopicsPendingDraft(maxTopics);
    }

    if (candidates.length > 0) {
      const userId = await this.repository.getOrCreateDefaultUser();
      const style = await createSettingsRepository().getPreferences(userId);

      for (const topic of candidates) {
        const eligibility = checkDraftEligibility(topic);

        if (!eligibility.eligible) {
          result.skipped.push({ topicId: topic.id, title: topic.title, reason: eligibility.reason });
          continue;
        }

        try {
          const draft = await this.generator.generate(topic, { style });
          await this.repository.saveDraft(topic.id, userId, draft);
          result.drafted.push({
            topicId: topic.id,
            title: draft.title,
            hook: draft.hook,
            body: draft.body,
            angle: draft.angle,
            hashtags: draft.hashtags,
          });
        } catch (error) {
          result.errors.push({
            topicId: topic.id,
            title: topic.title,
            message: error instanceof Error ? error.message : "Unknown error generating draft.",
          });
        }
      }
    }

    result.finishedAt = new Date();

    await this.repository.recordAgentRun({
      runId: result.runId,
      kind: "draft_generation",
      status: result.errors.length > 0 ? "partial_failure" : "success",
      startedAt: result.startedAt,
      finishedAt: result.finishedAt,
      summary: `Drafted ${result.drafted.length} topics, skipped ${result.skipped.length}, ${result.errors.length} errors.`,
      error:
        result.errors.length > 0
          ? result.errors.map((item) => `${item.title}: ${item.message}`).join("\n")
          : undefined,
      metadata: {
        drafted: result.drafted.length,
        skipped: result.skipped.length,
        errors: result.errors.length,
      },
    });

    return result;
  }
}

export async function runDraftGeneration(options?: RunDraftsOptions) {
  return new DraftGenerationService().run(options);
}
