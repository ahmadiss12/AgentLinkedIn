import { z } from "zod";
import { sourceTypeSchema } from "@/core/content-models";

export const sourceOverviewSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  type: sourceTypeSchema,
  trustLevel: z.number().int().min(1).max(5),
  enabled: z.boolean(),
  lastFetchedAt: z.date().nullable(),
  itemCount: z.number().int().min(0),
});

export type SourceOverview = z.infer<typeof sourceOverviewSchema>;
