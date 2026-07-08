import "server-only";

import { randomUUID } from "node:crypto";
import type { ResearchBrief, RiskLevel } from "@/core/research-brief-models";
import { checkBriefEligibility } from "@/server/discovery/brief-eligibility";
import { ResearchBriefGenerator } from "@/server/discovery/research-brief-generator";
import { hasGeminiKey } from "@/server/ai/gemini-client";
import { createDiscoveryRepository } from "@/server/repositories";

export type RunBriefsOptions = {
  maxTopics?: number;
};

export type BriefRunResult = {
  runId: string;
  startedAt: Date;
  finishedAt: Date;
  briefed: { topicId: string; title: string; confidence: string }[];
  skipped: { topicId: string; title: string; reason: string }[];
  errors: { topicId: string; title: string; message: string }[];
};

function computeRiskLevel(brief: ResearchBrief): RiskLevel {
  if (brief.confidence === "low" || brief.warnings.length >= 2) {
    return "high";
  }

  if (brief.confidence === "medium" || brief.warnings.length === 1) {
    return "medium";
  }

  return "low";
}

export class ResearchBriefService {
  private readonly repository = createDiscoveryRepository();
  private readonly generator = new ResearchBriefGenerator();

  async run(options: RunBriefsOptions = {}): Promise<BriefRunResult> {
    const startedAt = new Date();
    const maxTopics = options.maxTopics ?? 5;

    if (!hasGeminiKey()) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }

    const candidates = await this.repository.listTopicsPendingBrief(maxTopics);
    const result: BriefRunResult = {
      runId: randomUUID(),
      startedAt,
      finishedAt: startedAt,
      briefed: [],
      skipped: [],
      errors: [],
    };

    for (const topic of candidates) {
      const eligibility = checkBriefEligibility(topic);

      if (!eligibility.eligible) {
        result.skipped.push({ topicId: topic.id, title: topic.title, reason: eligibility.reason });
        continue;
      }

      try {
        const brief = await this.generator.generate(topic);
        await this.repository.saveBrief(topic.id, brief, computeRiskLevel(brief));
        result.briefed.push({ topicId: topic.id, title: topic.title, confidence: brief.confidence });
      } catch (error) {
        result.errors.push({
          topicId: topic.id,
          title: topic.title,
          message: error instanceof Error ? error.message : "Unknown error generating brief.",
        });
      }
    }

    result.finishedAt = new Date();

    await this.repository.recordAgentRun({
      runId: result.runId,
      kind: "research_brief",
      status: result.errors.length > 0 ? "partial_failure" : "success",
      startedAt: result.startedAt,
      finishedAt: result.finishedAt,
      summary: `Briefed ${result.briefed.length} topics, skipped ${result.skipped.length}, ${result.errors.length} errors.`,
      error:
        result.errors.length > 0
          ? result.errors.map((item) => `${item.title}: ${item.message}`).join("\n")
          : undefined,
      metadata: {
        briefed: result.briefed.length,
        skipped: result.skipped.length,
        errors: result.errors.length,
      },
    });

    return result;
  }
}

export async function runResearchBriefs(options?: RunBriefsOptions) {
  return new ResearchBriefService().run(options);
}
