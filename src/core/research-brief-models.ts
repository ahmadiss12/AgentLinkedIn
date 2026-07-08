import { z } from "zod";
import { topicCategorySchema, topicTypeSchema } from "@/core/content-models";

export const riskLevelSchema = z.enum(["low", "medium", "high"]);
export type RiskLevel = z.infer<typeof riskLevelSchema>;

export const researchBriefSchema = z.object({
  technicalSummary: z.string(),
  whyItMatters: z.string(),
  keyFacts: z.array(z.string()),
  sourceAttributions: z.array(
    z.object({
      sourceName: z.string(),
      claim: z.string(),
    }),
  ),
  factualityNotes: z.string(),
  warnings: z.array(z.string()),
  confidence: z.enum(["low", "medium", "high"]),
});

export type ResearchBrief = z.infer<typeof researchBriefSchema>;

export type TopicSourceExcerpt = {
  sourceName: string;
  title: string;
  url: string;
  summary?: string;
};

export const topicForBriefSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  category: topicCategorySchema,
  type: topicTypeSchema,
  summary: z.string(),
  relevanceScore: z.number().int().min(0).max(100),
  lastSeenAt: z.date(),
  sources: z.array(
    z.object({
      sourceName: z.string(),
      title: z.string(),
      url: z.string().url(),
      summary: z.string().optional(),
    }),
  ),
});

export type TopicForBrief = z.infer<typeof topicForBriefSchema>;
