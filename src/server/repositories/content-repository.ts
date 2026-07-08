import "server-only";

import type { AnalyticsSummary } from "@/core/analytics-models";
import type { DashboardSummary } from "@/core/content-models";
import type {
  AgentRunView,
  PostedHistoryItem,
  ReviewTimelineItem,
} from "@/core/history-models";

export interface ContentRepository {
  getDashboardSummary(): Promise<DashboardSummary>;
  listReviewTimeline(limit: number): Promise<ReviewTimelineItem[]>;
  listAgentRuns(limit: number): Promise<AgentRunView[]>;
  listPostedHistory(limit: number): Promise<PostedHistoryItem[]>;
  getAnalyticsSummary(): Promise<AnalyticsSummary>;
}
