import { z } from "zod";
import {
  qualitySignalSchema,
  reviewStatusSchema,
  sourceTypeSchema,
  topicCategorySchema,
  topicTypeSchema,
} from "@/core/content-models";
import { riskLevelSchema } from "@/core/research-brief-models";

export const qualityAssessmentSchema = z.object({
  signals: z.array(qualitySignalSchema),
  duplicateScore: z.number().min(0).max(1),
  duplicateOf: z.string().optional(),
  freshnessScore: z.number().int().min(0).max(100),
  sourceCoverageScore: z.number().int().min(0).max(100),
});

export type QualityAssessment = z.infer<typeof qualityAssessmentSchema>;

export const trustedSourceSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  type: sourceTypeSchema,
  trustLevel: z.number().int().min(1).max(5),
  categories: z.array(topicCategorySchema).min(1),
});

export const normalizedSourceItemSchema = z.object({
  sourceName: z.string(),
  sourceUrl: z.string().url(),
  sourceType: sourceTypeSchema,
  sourceTrustLevel: z.number().int().min(1).max(5),
  title: z.string().min(1),
  url: z.string().url(),
  summary: z.string().optional(),
  author: z.string().optional(),
  publishedAt: z.date().optional(),
  fetchedAt: z.date(),
  categories: z.array(topicCategorySchema),
  rawMetadata: z.record(z.string(), z.unknown()).optional(),
});

export const discoveryCandidateSchema = z.object({
  title: z.string(),
  slug: z.string(),
  summary: z.string(),
  whyItMatters: z.string(),
  url: z.string().url(),
  sourceName: z.string(),
  sourceUrl: z.string().url(),
  sourceType: sourceTypeSchema,
  category: topicCategorySchema,
  publishedAt: z.date().optional(),
  fetchedAt: z.date(),
  freshnessDays: z.number().int().min(0),
  relevanceScore: z.number().int().min(0).max(100),
  noveltyScore: z.number().int().min(0).max(100),
  sourceStrength: z.number().int().min(1).max(5),
  signals: z.array(z.string()),
  warnings: z.array(z.string()),
  quality: qualityAssessmentSchema.optional(),
});

export const discoveryRunResultSchema = z.object({
  runId: z.string(),
  startedAt: z.date(),
  finishedAt: z.date(),
  persisted: z.boolean(),
  sourcesChecked: z.number().int().min(0),
  itemsFetched: z.number().int().min(0),
  candidates: z.array(discoveryCandidateSchema),
  errors: z.array(
    z.object({
      sourceName: z.string(),
      url: z.string().url(),
      message: z.string(),
    }),
  ),
});

export const discoveryOverviewSchema = z.object({
  persistenceEnabled: z.boolean(),
  sourceCount: z.number().int().min(0),
  sources: z.array(trustedSourceSchema),
});

export const recentTopicSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  category: topicCategorySchema,
  type: topicTypeSchema,
  status: reviewStatusSchema,
  relevanceScore: z.number().int().min(0).max(100),
  noveltyScore: z.number().int().min(0).max(100),
  riskLevel: riskLevelSchema,
  lastSeenAt: z.date(),
  sources: z.array(
    z.object({
      sourceName: z.string(),
      title: z.string(),
      url: z.string(),
    }),
  ),
});

export type RecentTopic = z.infer<typeof recentTopicSchema>;

export type TrustedSource = z.infer<typeof trustedSourceSchema>;
export type NormalizedSourceItem = z.infer<typeof normalizedSourceItemSchema>;
export type DiscoveryCandidate = z.infer<typeof discoveryCandidateSchema>;
export type DiscoveryRunResult = z.infer<typeof discoveryRunResultSchema>;
export type DiscoveryOverview = z.infer<typeof discoveryOverviewSchema>;
