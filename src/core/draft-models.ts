import { z } from "zod";
import { draftStatusSchema, topicCategorySchema, topicTypeSchema } from "@/core/content-models";
import { researchBriefSchema } from "@/core/research-brief-models";

export const draftGenerationSchema = z.object({
  title: z.string(),
  hook: z.string(),
  body: z.string(),
  hashtags: z.array(z.string()),
  angle: z.string(),
  alternateAngles: z.array(z.string()),
});

export type LinkedinDraft = z.infer<typeof draftGenerationSchema>;

export const topicForDraftSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  category: topicCategorySchema,
  type: topicTypeSchema,
  brief: researchBriefSchema,
});

export type TopicForDraft = z.infer<typeof topicForDraftSchema>;

export const draftForReviewSchema = z.object({
  id: z.string(),
  topicId: z.string(),
  topicTitle: z.string(),
  topicCategory: topicCategorySchema,
  title: z.string(),
  hook: z.string(),
  body: z.string(),
  hashtags: z.array(z.string()),
  angle: z.string(),
  status: draftStatusSchema,
  currentVersion: z.number().int().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type DraftForReview = z.infer<typeof draftForReviewSchema>;

export const draftEditSchema = z.object({
  title: z.string().min(1).max(200),
  hook: z.string().min(1),
  body: z.string().min(1),
  hashtags: z.array(z.string().min(1)).max(10),
  angle: z.string().min(1).max(200),
});

export type DraftEdit = z.infer<typeof draftEditSchema>;
