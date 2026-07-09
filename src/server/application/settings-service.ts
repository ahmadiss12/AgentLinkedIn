import "server-only";

import type { Preferences, PreferencesUpdate } from "@/core/settings-models";
import { createSettingsRepository } from "@/server/repositories";

export class SettingsService {
  private readonly repository = createSettingsRepository();

  async get(userId: string): Promise<Preferences> {
    return this.repository.getPreferences(userId);
  }

  async update(userId: string, update: PreferencesUpdate): Promise<Preferences> {
    return this.repository.updatePreferences(userId, update);
  }
}

export async function getPreferences(userId: string) {
  return new SettingsService().get(userId);
}

export async function updatePreferences(userId: string, update: PreferencesUpdate) {
  return new SettingsService().update(userId, update);
}
