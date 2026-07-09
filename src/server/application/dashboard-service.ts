import "server-only";

import type { DashboardSummary } from "@/core/content-models";
import { createContentRepository } from "@/server/repositories";

export class DashboardService {
  async getSummary(userId: string): Promise<DashboardSummary> {
    return createContentRepository().getDashboardSummary(userId);
  }
}

export async function getDashboardSummary(userId: string) {
  return new DashboardService().getSummary(userId);
}

export async function listReviewTimeline(userId: string, limit = 50) {
  return createContentRepository().listReviewTimeline(userId, limit);
}

export async function listAgentRuns(userId: string, limit = 30) {
  return createContentRepository().listAgentRuns(userId, limit);
}

export async function listPostedHistory(userId: string, limit = 20) {
  return createContentRepository().listPostedHistory(userId, limit);
}

export async function getAnalyticsSummary(userId: string) {
  return createContentRepository().getAnalyticsSummary(userId);
}
