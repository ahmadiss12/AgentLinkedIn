import "server-only";

import type { Preferences, PreferencesUpdate } from "@/core/settings-models";
import { createDraftRepository, createSettingsRepository } from "@/server/repositories";

export class SettingsService {
  private readonly repository = createSettingsRepository();
  private readonly draftRepository = createDraftRepository();

  async get(): Promise<Preferences> {
    const userId = await this.draftRepository.getOrCreateDefaultUser();
    return this.repository.getPreferences(userId);
  }

  async update(update: PreferencesUpdate): Promise<Preferences> {
    const userId = await this.draftRepository.getOrCreateDefaultUser();
    return this.repository.updatePreferences(userId, update);
  }
}

export async function getPreferences() {
  return new SettingsService().get();
}

export async function updatePreferences(update: PreferencesUpdate) {
  return new SettingsService().update(update);
}
