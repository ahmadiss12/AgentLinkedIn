import "server-only";

import type { Preferences, PreferencesUpdate } from "@/core/settings-models";

export interface SettingsRepository {
  getPreferences(userId: string): Promise<Preferences>;
  updatePreferences(userId: string, update: PreferencesUpdate): Promise<Preferences>;
}
