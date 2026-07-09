import "server-only";

import { and, desc, eq, gte, inArray, notInArray, or, sql } from "drizzle-orm";
import type { DiscoveryRunResult, RecentTopic } from "@/core/discovery-models";
import type { TrustedSource } from "@/core/discovery-models";
import type { ResearchBrief, RiskLevel, TopicForBrief } from "@/core/research-brief-models";
import type { QualitySignal } from "@/core/content-models";
import {
  MIN_RELEVANCE_SCORE,
  STALE_AFTER_DAYS,
} from "@/server/discovery/brief-eligibility";
import type { LearningConcept } from "@/server/discovery/learning-catalog";
import { trustedSourceCatalog } from "@/server/discovery/source-catalog";
import type { getDb } from "@/server/db/client";
import {
  agentRuns,
  qualityChecks,
  sourceItems,
  sources,
  topicSources,
  topics,
} from "@/server/db/schema";
import type { DiscoveryRepository } from "@/server/repositories/discovery-repository";

type DbClient = ReturnType<typeof getDb>;

export class PostgresDiscoveryRepository implements DiscoveryRepository {
  private catalogEnsured = false;

  constructor(private readonly db: DbClient) {}

  async listSources() {
    await this.ensureCatalogSources();

    const rows = await this.db
      .select({
        name: sources.name,
        url: sources.url,
        type: sources.type,
        trustLevel: sources.trustLevel,
      })
      .from(sources)
      .where(eq(sources.enabled, true));

    return rows.map((row) => {
      const catalogItem = trustedSourceCatalog.find((source) => source.url === row.url);

      return {
        name: row.name,
        url: row.url,
        type: row.type,
        trustLevel: row.trustLevel,
        categories: catalogItem?.categories ?? ["software_engineering"],
        contentType: catalogItem?.contentType,
      } satisfies TrustedSource;
    });
  }

  async listSourceOverviews() {
    await this.ensureCatalogSources();

    const rows = await this.db
      .select({
        id: sources.id,
        name: sources.name,
        url: sources.url,
        type: sources.type,
        trustLevel: sources.trustLevel,
        enabled: sources.enabled,
        lastFetchedAt: sources.lastFetchedAt,
        itemCount: sql<number>`(SELECT count(*)::int FROM ${sourceItems} si WHERE si.source_id = ${sources.id})`,
      })
      .from(sources)
      .orderBy(desc(sources.trustLevel), sources.name);

    return rows;
  }

  async setSourceEnabled(sourceId: string, enabled: boolean) {
    const updated = await this.db
      .update(sources)
      .set({ enabled, updatedAt: sql`now()` })
      .where(eq(sources.id, sourceId))
      .returning({ id: sources.id });

    if (updated.length === 0) {
      throw new Error("Source not found.");
    }
  }

  async saveRun(userId: string, result: DiscoveryRunResult) {
    await this.db.insert(agentRuns).values({
      id: result.runId,
      userId,
      kind: "topic_discovery",
      status: result.errors.length > 0 ? "partial_failure" : "success",
      startedAt: result.startedAt,
      finishedAt: result.finishedAt,
      summary: `Checked ${result.sourcesChecked} sources and ranked ${result.candidates.length} candidates.`,
      error:
        result.errors.length > 0
          ? result.errors.map((error) => `${error.sourceName}: ${error.message}`).join("\n")
          : null,
      metadata: {
        sourcesChecked: result.sourcesChecked,
        itemsFetched: result.itemsFetched,
        candidates: result.candidates.length,
      },
    });

    await this.ensureCatalogSources();

    // Stamp fetch time on every enabled source that didn't error during
    // this run, so the Sources page can show real freshness per feed.
    const failedUrls = result.errors.map((error) => error.url);
    await this.db
      .update(sources)
      .set({ lastFetchedAt: result.finishedAt, updatedAt: sql`now()` })
      .where(
        failedUrls.length > 0
          ? and(eq(sources.enabled, true), notInArray(sources.url, failedUrls))
          : eq(sources.enabled, true),
      );

    if (result.candidates.length === 0) {
      return;
    }

    const sourceRows = await this.db
      .select({ id: sources.id, url: sources.url })
      .from(sources)
      .where(inArray(sources.url, result.candidates.map((candidate) => candidate.sourceUrl)));
    const sourceIdByUrl = new Map(sourceRows.map((source) => [source.url, source.id]));

    for (const candidate of result.candidates) {
      const sourceId = sourceIdByUrl.get(candidate.sourceUrl);

      if (!sourceId) {
        continue;
      }

      const [sourceItem] = await this.db
        .insert(sourceItems)
        .values({
          sourceId,
          externalId: candidate.slug,
          title: candidate.title,
          url: candidate.url,
          summary: candidate.summary,
          publishedAt: candidate.publishedAt,
          fetchedAt: candidate.fetchedAt,
          rawMetadata: {
            discoveryRunId: result.runId,
            relevanceScore: candidate.relevanceScore,
            noveltyScore: candidate.noveltyScore,
            signals: candidate.signals,
            warnings: candidate.warnings,
          },
        })
        .onConflictDoUpdate({
          target: sourceItems.url,
          set: {
            title: candidate.title,
            summary: candidate.summary,
            publishedAt: candidate.publishedAt,
            fetchedAt: candidate.fetchedAt,
            rawMetadata: {
              discoveryRunId: result.runId,
              relevanceScore: candidate.relevanceScore,
              noveltyScore: candidate.noveltyScore,
              signals: candidate.signals,
              warnings: candidate.warnings,
            },
          },
        })
        .returning({ id: sourceItems.id });

      const heuristicRisk = candidate.warnings.length > 1 ? "medium" : "low";
      const [topic] = await this.db
        .insert(topics)
        .values({
          userId,
          title: candidate.title,
          slug: candidate.slug,
          summary: candidate.summary,
          whyItMatters: candidate.whyItMatters,
          category: candidate.category,
          type: candidate.contentType,
          status: "discovered",
          relevanceScore: candidate.relevanceScore,
          noveltyScore: candidate.noveltyScore,
          riskLevel: heuristicRisk,
          firstSeenAt: candidate.fetchedAt,
          lastSeenAt: candidate.fetchedAt,
        })
        .onConflictDoUpdate({
          target: [topics.userId, topics.slug],
          set: {
            // Once a topic has moved past "discovered" (e.g. an AI brief was
            // generated), rediscovery must not clobber the curated fields.
            summary: sql`CASE WHEN ${topics.status} = 'discovered' THEN excluded.summary ELSE ${topics.summary} END`,
            whyItMatters: sql`CASE WHEN ${topics.status} = 'discovered' THEN excluded.why_it_matters ELSE ${topics.whyItMatters} END`,
            riskLevel: sql`CASE WHEN ${topics.status} = 'discovered' THEN excluded.risk_level ELSE ${topics.riskLevel} END`,
            relevanceScore: candidate.relevanceScore,
            noveltyScore: candidate.noveltyScore,
            lastSeenAt: candidate.fetchedAt,
            updatedAt: sql`now()`,
          },
        })
        .returning({ id: topics.id });

      if (sourceItem && topic) {
        await this.db
          .insert(topicSources)
          .values({
            topicId: topic.id,
            sourceItemId: sourceItem.id,
          })
          .onConflictDoNothing();
      }

      if (topic && candidate.quality) {
        await this.db.insert(qualityChecks).values({
          topicId: topic.id,
          signals: candidate.quality.signals,
          sourceCoverageScore: candidate.quality.sourceCoverageScore,
          freshnessScore: candidate.quality.freshnessScore,
          duplicateScore: candidate.quality.duplicateScore,
          warning: candidate.warnings.length > 0 ? candidate.warnings.join("\n") : null,
        });
      }
    }
  }

  async insertLearningTopics(userId: string, concepts: LearningConcept[]) {
    const created: { id: string; title: string }[] = [];

    for (const concept of concepts) {
      // Slug conflict (for this user) means this concept was already
      // suggested to them before — skip it silently.
      const [inserted] = await this.db
        .insert(topics)
        .values({
          userId,
          title: concept.title,
          slug: concept.slug,
          summary: concept.summary,
          whyItMatters: null,
          category: concept.category,
          type: "learning",
          status: "discovered",
          relevanceScore: 75,
          noveltyScore: 60,
          riskLevel: "low",
        })
        .onConflictDoNothing({ target: [topics.userId, topics.slug] })
        .returning({ id: topics.id, title: topics.title });

      if (inserted) {
        created.push(inserted);
      }
    }

    return created;
  }

  async listUsedLearningSlugs(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ slug: topics.slug })
      .from(topics)
      .where(and(eq(topics.userId, userId), eq(topics.type, "learning")));

    return rows.map((row) => row.slug);
  }

  async listKnownTopicFingerprints(userId: string, limit: number) {
    return this.db
      .select({
        slug: topics.slug,
        title: topics.title,
        summary: topics.summary,
      })
      .from(topics)
      .where(eq(topics.userId, userId))
      .orderBy(desc(topics.lastSeenAt))
      .limit(limit);
  }

  async listRecentTopics(userId: string, limit: number): Promise<RecentTopic[]> {
    const rows = await this.db
      .select({
        id: topics.id,
        title: topics.title,
        slug: topics.slug,
        category: topics.category,
        type: topics.type,
        status: topics.status,
        relevanceScore: topics.relevanceScore,
        noveltyScore: topics.noveltyScore,
        riskLevel: topics.riskLevel,
        lastSeenAt: topics.lastSeenAt,
      })
      .from(topics)
      .where(eq(topics.userId, userId))
      .orderBy(desc(topics.lastSeenAt))
      .limit(limit);

    if (rows.length === 0) {
      return [];
    }

    const linkRows = await this.db
      .select({
        topicId: topicSources.topicId,
        sourceName: sources.name,
        title: sourceItems.title,
        url: sourceItems.url,
      })
      .from(topicSources)
      .innerJoin(sourceItems, eq(topicSources.sourceItemId, sourceItems.id))
      .innerJoin(sources, eq(sourceItems.sourceId, sources.id))
      .where(
        inArray(
          topicSources.topicId,
          rows.map((row) => row.id),
        ),
      );

    const linksByTopic = new Map<string, RecentTopic["sources"]>();
    for (const link of linkRows) {
      const list = linksByTopic.get(link.topicId) ?? [];
      list.push({ sourceName: link.sourceName, title: link.title, url: link.url });
      linksByTopic.set(link.topicId, list);
    }

    return rows.map((row) => ({
      ...row,
      sources: linksByTopic.get(row.id) ?? [],
    }));
  }

  async listTopicsPendingBrief(userId: string, limit: number): Promise<TopicForBrief[]> {
    const staleCutoff = new Date(Date.now() - STALE_AFTER_DAYS * 86_400_000);
    const rows = await this.db
      .select({
        id: topics.id,
        title: topics.title,
        slug: topics.slug,
        category: topics.category,
        type: topics.type,
        summary: topics.summary,
        relevanceScore: topics.relevanceScore,
        lastSeenAt: topics.lastSeenAt,
      })
      .from(topics)
      .where(
        and(
          eq(topics.userId, userId),
          eq(topics.status, "discovered"),
          // Relevance and staleness gates only apply to news — learning
          // topics are evergreen and always brief-worthy.
          or(
            eq(topics.type, "learning"),
            and(
              gte(topics.relevanceScore, MIN_RELEVANCE_SCORE),
              gte(topics.lastSeenAt, staleCutoff),
            ),
          ),
          // Topics whose most recent quality check flagged duplicate risk
          // should not consume brief-generation slots.
          sql`NOT EXISTS (
            SELECT 1 FROM ${qualityChecks} qc
            WHERE qc.topic_id = ${topics.id}
              AND qc.signals @> '["duplicate_risk"]'::jsonb
              AND qc.checked_at = (
                SELECT MAX(checked_at) FROM ${qualityChecks} qc2
                WHERE qc2.topic_id = ${topics.id}
              )
          )`,
        ),
      )
      // Learning topics take priority over news regardless of relevance
      // score — evergreen teaching content is the primary focus.
      .orderBy(
        sql`CASE WHEN ${topics.type} = 'learning' THEN 0 ELSE 1 END`,
        desc(topics.relevanceScore),
      )
      .limit(limit);

    if (rows.length === 0) {
      return [];
    }

    const sourceRows = await this.db
      .select({
        topicId: topicSources.topicId,
        sourceName: sources.name,
        title: sourceItems.title,
        url: sourceItems.url,
        summary: sourceItems.summary,
      })
      .from(topicSources)
      .innerJoin(sourceItems, eq(topicSources.sourceItemId, sourceItems.id))
      .innerJoin(sources, eq(sourceItems.sourceId, sources.id))
      .where(
        inArray(
          topicSources.topicId,
          rows.map((row) => row.id),
        ),
      );

    const sourcesByTopic = new Map<string, TopicForBrief["sources"]>();
    for (const row of sourceRows) {
      const list = sourcesByTopic.get(row.topicId) ?? [];
      list.push({
        sourceName: row.sourceName,
        title: row.title,
        url: row.url,
        summary: row.summary ?? undefined,
      });
      sourcesByTopic.set(row.topicId, list);
    }

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      category: row.category,
      type: row.type,
      summary: row.summary,
      relevanceScore: row.relevanceScore,
      lastSeenAt: row.lastSeenAt,
      sources: sourcesByTopic.get(row.id) ?? [],
    }));
  }

  async getTopicPendingBrief(userId: string, topicId: string): Promise<TopicForBrief | null> {
    const [row] = await this.db
      .select({
        id: topics.id,
        title: topics.title,
        slug: topics.slug,
        category: topics.category,
        type: topics.type,
        summary: topics.summary,
        relevanceScore: topics.relevanceScore,
        lastSeenAt: topics.lastSeenAt,
      })
      .from(topics)
      .where(
        and(eq(topics.id, topicId), eq(topics.userId, userId), eq(topics.status, "discovered")),
      )
      .limit(1);

    if (!row) {
      return null;
    }

    const sourceRows = await this.db
      .select({
        sourceName: sources.name,
        title: sourceItems.title,
        url: sourceItems.url,
        summary: sourceItems.summary,
      })
      .from(topicSources)
      .innerJoin(sourceItems, eq(topicSources.sourceItemId, sourceItems.id))
      .innerJoin(sources, eq(sourceItems.sourceId, sources.id))
      .where(eq(topicSources.topicId, topicId));

    return {
      ...row,
      sources: sourceRows.map((source) => ({
        sourceName: source.sourceName,
        title: source.title,
        url: source.url,
        summary: source.summary ?? undefined,
      })),
    };
  }

  async saveBrief(topicId: string, brief: ResearchBrief, riskLevel: RiskLevel) {
    const [updated] = await this.db
      .update(topics)
      .set({
        summary: brief.technicalSummary,
        whyItMatters: brief.whyItMatters,
        brief,
        status: "brief_ready",
        riskLevel,
        updatedAt: sql`now()`,
      })
      .where(eq(topics.id, topicId))
      .returning({ type: topics.type });

    // Source-quality checks only make sense for news briefs — learning
    // briefs are knowledge-based and intentionally have no sources.
    if (updated?.type === "learning") {
      return;
    }

    const signals: QualitySignal[] =
      brief.confidence === "high" && brief.warnings.length === 0
        ? ["strong_sources"]
        : ["needs_source_check"];

    await this.db.insert(qualityChecks).values({
      topicId,
      signals,
      sourceCoverageScore: Math.min(100, brief.sourceAttributions.length * 25),
      freshnessScore: 0,
      duplicateScore: 0,
      factualityNotes: brief.factualityNotes,
      warning: brief.warnings.length > 0 ? brief.warnings.join("\n") : null,
    });
  }

  async recordAgentRun(run: {
    runId: string;
    userId: string;
    kind: string;
    status: string;
    startedAt: Date;
    finishedAt: Date;
    summary: string;
    error?: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.db.insert(agentRuns).values({
      id: run.runId,
      userId: run.userId,
      kind: run.kind,
      status: run.status,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      summary: run.summary,
      error: run.error ?? null,
      metadata: run.metadata,
    });
  }

  private async ensureCatalogSources() {
    if (this.catalogEnsured) {
      return;
    }
    this.catalogEnsured = true;

    for (const source of trustedSourceCatalog) {
      await this.db
        .insert(sources)
        .values({
          name: source.name,
          url: source.url,
          type: source.type,
          trustLevel: source.trustLevel,
          enabled: true,
        })
        .onConflictDoUpdate({
          target: sources.url,
          set: {
            name: source.name,
            type: source.type,
            trustLevel: source.trustLevel,
            updatedAt: sql`now()`,
          },
        });
    }
  }
}
