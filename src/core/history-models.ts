import { z } from "zod";

export const reviewTimelineItemSchema = z.object({
  id: z.string(),
  action: z.string(),
  note: z.string().nullable(),
  draftTitle: z.string(),
  topicTitle: z.string(),
  createdAt: z.date(),
});

export const agentRunViewSchema = z.object({
  id: z.string(),
  kind: z.string(),
  status: z.string(),
  summary: z.string().nullable(),
  error: z.string().nullable(),
  startedAt: z.date(),
  finishedAt: z.date().nullable(),
});

export const postedHistoryItemSchema = z.object({
  id: z.string(),
  draftTitle: z.string(),
  hook: z.string(),
  angle: z.string(),
  publishedAt: z.date(),
  publishedUrl: z.string().nullable(),
});

export type ReviewTimelineItem = z.infer<typeof reviewTimelineItemSchema>;
export type AgentRunView = z.infer<typeof agentRunViewSchema>;
export type PostedHistoryItem = z.infer<typeof postedHistoryItemSchema>;
