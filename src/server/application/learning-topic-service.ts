import "server-only";

import { randomUUID } from "node:crypto";
import { learningConceptCatalog } from "@/server/discovery/learning-catalog";
import { createDiscoveryRepository, createSettingsRepository } from "@/server/repositories";

export type LearningSuggestResult = {
  created: { id: string; title: string }[];
  remainingInCatalog: number;
};

export class LearningTopicService {
  private readonly repository = createDiscoveryRepository();

  async suggest(userId: string, count = 3): Promise<LearningSuggestResult> {
    const startedAt = new Date();
    const usedSlugs = new Set(await this.repository.listUsedLearningSlugs(userId));
    const blockedTopics = await this.loadBlockedTopics(userId);
    const unused = learningConceptCatalog.filter((concept) => {
      if (usedSlugs.has(concept.slug)) {
        return false;
      }

      const haystack = `${concept.title} ${concept.summary}`.toLowerCase();
      return !blockedTopics.some((blocked) => haystack.includes(blocked));
    });

    // Shuffle so consecutive clicks don't always surface the same concepts.
    const shuffled = [...unused].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, count);
    const created =
      picked.length > 0 ? await this.repository.insertLearningTopics(userId, picked) : [];

    await this.repository.recordAgentRun({
      runId: randomUUID(),
      userId,
      kind: "learning_topics",
      status: "success",
      startedAt,
      finishedAt: new Date(),
      summary: `Suggested ${created.length} learning topics (${unused.length - created.length} unused concepts left).`,
      metadata: {
        created: created.length,
        remainingInCatalog: unused.length - created.length,
      },
    });

    return {
      created,
      remainingInCatalog: unused.length - created.length,
    };
  }

  private async loadBlockedTopics(userId: string): Promise<string[]> {
    try {
      const preferences = await createSettingsRepository().getPreferences(userId);
      return preferences.blockedTopics;
    } catch {
      // Suggestions should still work if preferences can't be loaded.
      return [];
    }
  }
}

export async function suggestLearningTopics(userId: string, count = 3) {
  return new LearningTopicService().suggest(userId, count);
}
