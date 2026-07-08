import "server-only";

import type { Preferences } from "@/core/settings-models";
import type { SettingsRepository } from "@/server/repositories/settings-repository";

const defaults: Preferences = {
  preferredTopics: [],
  blockedTopics: [],
  tone: "professional, curious, accessible",
  postLength: "medium",
  hashtagStyle: "balanced",
  postingFrequency: "3_per_week",
  contentFocus: "advanced_technical",
  requireApprovalBeforePublishing: true,
};

export class SeedSettingsRepository implements SettingsRepository {
  async getPreferences() {
    return defaults;
  }

  async updatePreferences(): Promise<Preferences> {
    throw new Error("Connect a database to save preferences.");
  }
}
