import { z } from "zod";
import {
  contentFocusSchema,
  hashtagStyleSchema,
  postLengthSchema,
  topicCategorySchema,
} from "@/core/content-models";

export const postingFrequencySchema = z.enum([
  "daily",
  "3_per_week",
  "2_per_week",
  "weekly",
]);

export const preferencesSchema = z.object({
  preferredTopics: z.array(topicCategorySchema),
  blockedTopics: z.array(z.string()),
  tone: z.string().min(3).max(200),
  postLength: postLengthSchema,
  hashtagStyle: hashtagStyleSchema,
  postingFrequency: postingFrequencySchema,
  contentFocus: contentFocusSchema,
  requireApprovalBeforePublishing: z.boolean(),
});

export const preferencesUpdateSchema = preferencesSchema.partial();

export type PostingFrequency = z.infer<typeof postingFrequencySchema>;
export type Preferences = z.infer<typeof preferencesSchema>;
export type PreferencesUpdate = z.infer<typeof preferencesUpdateSchema>;
