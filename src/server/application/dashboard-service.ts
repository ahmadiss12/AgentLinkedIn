import "server-only";

import type { DashboardSummary } from "@/core/content-models";
import { createContentRepository } from "@/server/repositories";

export class DashboardService {
  async getSummary(): Promise<DashboardSummary> {
    return createContentRepository().getDashboardSummary();
  }
}

export async function getDashboardSummary() {
  return new DashboardService().getSummary();
}

export async function listReviewTimeline(limit = 50) {
  return createContentRepository().listReviewTimeline(limit);
}

export async function listAgentRuns(limit = 30) {
  return createContentRepository().listAgentRuns(limit);
}

export async function listPostedHistory(limit = 20) {
  return createContentRepository().listPostedHistory(limit);
}

export async function getAnalyticsSummary() {
  return createContentRepository().getAnalyticsSummary();
}
