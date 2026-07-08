import "server-only";

import { eq, sql } from "drizzle-orm";
import type { Preferences, PreferencesUpdate } from "@/core/settings-models";
import { postingFrequencySchema } from "@/core/settings-models";
import type { getDb } from "@/server/db/client";
import { preferences } from "@/server/db/schema";
import type { SettingsRepository } from "@/server/repositories/settings-repository";

type DbClient = ReturnType<typeof getDb>;

type PreferencesRow = typeof preferences.$inferSelect;

function toPreferences(row: PreferencesRow): Preferences {
  const frequency = postingFrequencySchema.safeParse(row.postingFrequency);

  return {
    preferredTopics: row.preferredTopics,
    blockedTopics: row.blockedTopics,
    tone: row.tone,
    postLength: row.postLength,
    hashtagStyle: row.hashtagStyle,
    postingFrequency: frequency.success ? frequency.data : "3_per_week",
    contentFocus: row.contentFocus,
    requireApprovalBeforePublishing: row.requireApprovalBeforePublishing,
  };
}

export class PostgresSettingsRepository implements SettingsRepository {
  constructor(private readonly db: DbClient) {}

  async getPreferences(userId: string): Promise<Preferences> {
    const [existing] = await this.db
      .select()
      .from(preferences)
      .where(eq(preferences.userId, userId))
      .limit(1);

    if (existing) {
      return toPreferences(existing);
    }

    const [created] = await this.db
      .insert(preferences)
      .values({ userId })
      .returning();

    if (!created) {
      throw new Error("Failed to create default preferences.");
    }

    return toPreferences(created);
  }

  async updatePreferences(userId: string, update: PreferencesUpdate): Promise<Preferences> {
    // Ensure the row exists before updating so a fresh install can save
    // settings without a separate initialization step.
    await this.getPreferences(userId);

    const [updated] = await this.db
      .update(preferences)
      .set({ ...update, updatedAt: sql`now()` })
      .where(eq(preferences.userId, userId))
      .returning();

    if (!updated) {
      throw new Error("Failed to update preferences.");
    }

    return toPreferences(updated);
  }
}
