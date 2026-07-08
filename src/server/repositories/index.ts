import "server-only";

import { getDb, hasDatabaseUrl } from "@/server/db/client";
import type { ContentRepository } from "@/server/repositories/content-repository";
import type { DiscoveryRepository } from "@/server/repositories/discovery-repository";
import type { DraftRepository } from "@/server/repositories/draft-repository";
import type { ScheduleRepository } from "@/server/repositories/schedule-repository";
import type { SettingsRepository } from "@/server/repositories/settings-repository";
import { PostgresContentRepository } from "@/server/repositories/postgres-content-repository";
import { PostgresDiscoveryRepository } from "@/server/repositories/postgres-discovery-repository";
import { PostgresDraftRepository } from "@/server/repositories/postgres-draft-repository";
import { PostgresScheduleRepository } from "@/server/repositories/postgres-schedule-repository";
import { PostgresSettingsRepository } from "@/server/repositories/postgres-settings-repository";
import { SeedContentRepository } from "@/server/repositories/seed-content-repository";
import { SeedDiscoveryRepository } from "@/server/repositories/seed-discovery-repository";
import { SeedDraftRepository } from "@/server/repositories/seed-draft-repository";
import { SeedScheduleRepository } from "@/server/repositories/seed-schedule-repository";
import { SeedSettingsRepository } from "@/server/repositories/seed-settings-repository";

export function createContentRepository(): ContentRepository {
  if (!hasDatabaseUrl()) {
    return new SeedContentRepository();
  }

  return new PostgresContentRepository(getDb());
}

export function createDiscoveryRepository(): DiscoveryRepository {
  if (!hasDatabaseUrl()) {
    return new SeedDiscoveryRepository();
  }

  return new PostgresDiscoveryRepository(getDb());
}

export function createDraftRepository(): DraftRepository {
  if (!hasDatabaseUrl()) {
    return new SeedDraftRepository();
  }

  return new PostgresDraftRepository(getDb());
}

export function createScheduleRepository(): ScheduleRepository {
  if (!hasDatabaseUrl()) {
    return new SeedScheduleRepository();
  }

  return new PostgresScheduleRepository(getDb());
}

export function createSettingsRepository(): SettingsRepository {
  if (!hasDatabaseUrl()) {
    return new SeedSettingsRepository();
  }

  return new PostgresSettingsRepository(getDb());
}
