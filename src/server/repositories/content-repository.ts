import "server-only";

import type { AnalyticsSummary } from "@/core/analytics-models";
import type { DashboardSummary } from "@/core/content-models";
import type {
  AgentRunView,
  PostedHistoryItem,
  ReviewTimelineItem,
} from "@/core/history-models";

export interface ContentRepository {
  getDashboardSummary(userId: string): Promise<DashboardSummary>;
  listReviewTimeline(userId: string, limit: number): Promise<ReviewTimelineItem[]>;
  listAgentRuns(userId: string, limit: number): Promise<AgentRunView[]>;
  listPostedHistory(userId: string, limit: number): Promise<PostedHistoryItem[]>;
  getAnalyticsSummary(userId: string): Promise<AnalyticsSummary>;
}
