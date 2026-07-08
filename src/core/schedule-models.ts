import { z } from "zod";

export const scheduledStatusSchema = z.enum([
  "queued",
  "posting",
  "posted",
  "failed",
  "cancelled",
]);

export type ScheduledStatus = z.infer<typeof scheduledStatusSchema>;

export const approvedDraftSchema = z.object({
  id: z.string(),
  topicId: z.string(),
  topicTitle: z.string(),
  title: z.string(),
  hook: z.string(),
  body: z.string(),
  hashtags: z.array(z.string()),
  angle: z.string(),
});

export type ApprovedDraft = z.infer<typeof approvedDraftSchema>;

export const scheduledPostViewSchema = z.object({
  id: z.string(),
  draftId: z.string(),
  draftTitle: z.string(),
  hook: z.string(),
  body: z.string(),
  hashtags: z.array(z.string()),
  scheduledFor: z.date(),
  status: scheduledStatusSchema,
  attempts: z.number().int().min(0),
  lastError: z.string().nullable(),
});

export type ScheduledPostView = z.infer<typeof scheduledPostViewSchema>;

export const publishedPostViewSchema = z.object({
  id: z.string(),
  draftId: z.string(),
  draftTitle: z.string(),
  publishedAt: z.date(),
  publishedUrl: z.string().nullable(),
  linkedinPostUrn: z.string().nullable(),
});

export type PublishedPostView = z.infer<typeof publishedPostViewSchema>;
