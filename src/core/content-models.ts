import { z } from "zod";

export const sourceTypeSchema = z.enum([
  "official_blog",
  "research_paper",
  "github_release",
  "newsletter",
  "technical_news",
  "engineering_blog",
  "academic_source",
]);

export const topicCategorySchema = z.enum([
  "computer_science",
  "software_engineering",
  "ai",
  "cybersecurity",
  "developer_tools",
  "programming_languages",
  "open_source",
  "cloud_computing",
  "data_engineering",
  "emerging_tech",
]);

export const topicTypeSchema = z.enum(["news", "learning"]);

export const reviewStatusSchema = z.enum([
  "discovered",
  "brief_ready",
  "drafted",
  "needs_review",
  "approved",
  "scheduled",
  "posted",
  "rejected",
  "archived",
]);

export const draftStatusSchema = z.enum([
  "needs_review",
  "edit_requested",
  "regenerate_requested",
  "approved",
  "scheduled",
  "posted",
  "rejected",
]);

export const qualitySignalSchema = z.enum([
  "strong_sources",
  "needs_source_check",
  "stale",
  "duplicate_risk",
  "speculative",
  "low_relevance",
]);

export const postLengthSchema = z.enum(["short", "medium", "long"]);
export const hashtagStyleSchema = z.enum(["minimal", "balanced", "expanded"]);
export const contentFocusSchema = z.enum([
  "beginner_friendly",
  "advanced_technical",
  "career_oriented",
  "industry_trend",
]);

export type SourceType = z.infer<typeof sourceTypeSchema>;
export type TopicType = z.infer<typeof topicTypeSchema>;
export type TopicCategory = z.infer<typeof topicCategorySchema>;
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;
export type DraftStatus = z.infer<typeof draftStatusSchema>;
export type QualitySignal = z.infer<typeof qualitySignalSchema>;
export type PostLength = z.infer<typeof postLengthSchema>;
export type HashtagStyle = z.infer<typeof hashtagStyleSchema>;
export type ContentFocus = z.infer<typeof contentFocusSchema>;

export type DashboardMetric = {
  label: string;
  value: string;
  detail: string;
};

export type TopicCandidate = {
  title: string;
  source: string;
  freshness: string;
  score: string;
  status: string;
};

export type DraftQueueItem = {
  title: string;
  angle: string;
  status: string;
  quality: string;
};

export type NextScheduledSlot = {
  title: string;
  scheduledFor: string;
} | null;

export type QualityWarningItem = {
  topicTitle: string;
  warning: string;
};

export type DashboardSummary = {
  metrics: DashboardMetric[];
  discoveredTopics: TopicCandidate[];
  draftQueue: DraftQueueItem[];
  nextScheduled: NextScheduledSlot;
  recentWarnings: QualityWarningItem[];
};
