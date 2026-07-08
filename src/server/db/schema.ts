import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type {
  ContentFocus,
  HashtagStyle,
  PostLength,
  QualitySignal,
  SourceType,
  TopicCategory,
} from "@/core/content-models";
import type { ResearchBrief } from "@/core/research-brief-models";

export const sourceTypeEnum = pgEnum("source_type", [
  "official_blog",
  "research_paper",
  "github_release",
  "newsletter",
  "technical_news",
  "engineering_blog",
  "academic_source",
]);

export const topicCategoryEnum = pgEnum("topic_category", [
  "computer_science",
  "software_engineering",
  "ai",
  "cybersecurity",
  "developer_tools",
  "programming_languages",
  "open_source",
  "cloud_computing",
  "data_engineering",
  "emerging_tech",
]);

export const reviewStatusEnum = pgEnum("review_status", [
  "discovered",
  "brief_ready",
  "drafted",
  "needs_review",
  "approved",
  "scheduled",
  "posted",
  "rejected",
  "archived",
]);

export const draftStatusEnum = pgEnum("draft_status", [
  "needs_review",
  "edit_requested",
  "regenerate_requested",
  "approved",
  "scheduled",
  "posted",
  "rejected",
]);

export const riskLevelEnum = pgEnum("risk_level", ["low", "medium", "high"]);
export const scheduledStatusEnum = pgEnum("scheduled_status", [
  "queued",
  "posting",
  "posted",
  "failed",
  "cancelled",
]);
export const notificationStatusEnum = pgEnum("notification_status", [
  "unread",
  "read",
  "dismissed",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  linkedinMemberUrn: text("linkedin_member_urn"),
  ...timestamps,
});

export const preferences = pgTable("preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  preferredTopics: jsonb("preferred_topics")
    .$type<TopicCategory[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  blockedTopics: jsonb("blocked_topics")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  tone: text("tone").notNull().default("professional, curious, accessible"),
  postLength: text("post_length").$type<PostLength>().notNull().default("medium"),
  hashtagStyle: text("hashtag_style")
    .$type<HashtagStyle>()
    .notNull()
    .default("balanced"),
  sourceTypes: jsonb("source_types")
    .$type<SourceType[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  postingFrequency: text("posting_frequency").notNull().default("3_per_week"),
  contentFocus: text("content_focus")
    .$type<ContentFocus>()
    .notNull()
    .default("advanced_technical"),
  requireApprovalBeforePublishing: boolean("require_approval_before_publishing")
    .notNull()
    .default(true),
  ...timestamps,
});

export const sources = pgTable(
  "sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    type: sourceTypeEnum("type").notNull(),
    trustLevel: integer("trust_level").notNull().default(3),
    enabled: boolean("enabled").notNull().default(true),
    lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    urlIdx: uniqueIndex("sources_url_idx").on(table.url),
    enabledIdx: index("sources_enabled_idx").on(table.enabled),
  }),
);

export const sourceItems = pgTable(
  "source_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    externalId: text("external_id"),
    title: text("title").notNull(),
    url: text("url").notNull(),
    summary: text("summary"),
    author: text("author"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    rawMetadata: jsonb("raw_metadata").$type<Record<string, unknown>>(),
  },
  (table) => ({
    urlIdx: uniqueIndex("source_items_url_idx").on(table.url),
    sourcePublishedIdx: index("source_items_source_published_idx").on(
      table.sourceId,
      table.publishedAt,
    ),
  }),
);

export const topics = pgTable(
  "topics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    summary: text("summary").notNull(),
    whyItMatters: text("why_it_matters"),
    category: topicCategoryEnum("category").notNull(),
    status: reviewStatusEnum("status").notNull().default("discovered"),
    relevanceScore: integer("relevance_score").notNull().default(0),
    noveltyScore: integer("novelty_score").notNull().default(0),
    riskLevel: riskLevelEnum("risk_level").notNull().default("low"),
    brief: jsonb("brief").$type<ResearchBrief>(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ...timestamps,
  },
  (table) => ({
    slugIdx: uniqueIndex("topics_slug_idx").on(table.slug),
    statusIdx: index("topics_status_idx").on(table.status),
    categoryIdx: index("topics_category_idx").on(table.category),
  }),
);

export const topicSources = pgTable(
  "topic_sources",
  {
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    sourceItemId: uuid("source_item_id")
      .notNull()
      .references(() => sourceItems.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.topicId, table.sourceItemId] }),
  }),
);

export const drafts = pgTable(
  "drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    hook: text("hook").notNull(),
    body: text("body").notNull(),
    hashtags: jsonb("hashtags").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    angle: text("angle").notNull(),
    status: draftStatusEnum("status").notNull().default("needs_review"),
    currentVersion: integer("current_version").notNull().default(1),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    statusIdx: index("drafts_status_idx").on(table.status),
    topicIdx: index("drafts_topic_idx").on(table.topicId),
  }),
);

export const draftVersions = pgTable(
  "draft_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    draftId: uuid("draft_id")
      .notNull()
      .references(() => drafts.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    hook: text("hook").notNull(),
    body: text("body").notNull(),
    hashtags: jsonb("hashtags").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    angle: text("angle").notNull(),
    changeReason: text("change_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    draftVersionIdx: uniqueIndex("draft_versions_draft_version_idx").on(
      table.draftId,
      table.version,
    ),
  }),
);

export const qualityChecks = pgTable(
  "quality_checks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    draftId: uuid("draft_id").references(() => drafts.id, {
      onDelete: "cascade",
    }),
    topicId: uuid("topic_id").references(() => topics.id, {
      onDelete: "cascade",
    }),
    signals: jsonb("signals")
      .$type<QualitySignal[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    sourceCoverageScore: integer("source_coverage_score").notNull().default(0),
    freshnessScore: integer("freshness_score").notNull().default(0),
    duplicateScore: real("duplicate_score").notNull().default(0),
    factualityNotes: text("factuality_notes"),
    warning: text("warning"),
    checkedAt: timestamp("checked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    draftIdx: index("quality_checks_draft_idx").on(table.draftId),
    topicIdx: index("quality_checks_topic_idx").on(table.topicId),
  }),
);

export const reviewEvents = pgTable(
  "review_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    draftId: uuid("draft_id")
      .notNull()
      .references(() => drafts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    draftIdx: index("review_events_draft_idx").on(table.draftId),
  }),
);

export const scheduledPosts = pgTable(
  "scheduled_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    draftId: uuid("draft_id")
      .notNull()
      .references(() => drafts.id, { onDelete: "cascade" }),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    status: scheduledStatusEnum("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    ...timestamps,
  },
  (table) => ({
    scheduledForIdx: index("scheduled_posts_scheduled_for_idx").on(
      table.scheduledFor,
    ),
    statusIdx: index("scheduled_posts_status_idx").on(table.status),
  }),
);

export const publishedPosts = pgTable(
  "published_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    draftId: uuid("draft_id")
      .notNull()
      .references(() => drafts.id, { onDelete: "restrict" }),
    linkedinPostUrn: text("linkedin_post_urn"),
    publishedUrl: text("published_url"),
    publishedAt: timestamp("published_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    impressions: integer("impressions").notNull().default(0),
    reactions: integer("reactions").notNull().default(0),
    comments: integer("comments").notNull().default(0),
    shares: integer("shares").notNull().default(0),
  },
  (table) => ({
    draftIdx: uniqueIndex("published_posts_draft_idx").on(table.draftId),
  }),
);

export const agentRuns = pgTable(
  "agent_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").notNull(),
    status: text("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    summary: text("summary"),
    error: text("error"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  },
  (table) => ({
    kindStatusIdx: index("agent_runs_kind_status_idx").on(
      table.kind,
      table.status,
    ),
  }),
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    status: notificationStatusEnum("status").notNull().default("unread"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userStatusIdx: index("notifications_user_status_idx").on(
      table.userId,
      table.status,
    ),
  }),
);

export const linkedinAccounts = pgTable("linkedin_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  memberUrn: text("member_urn").notNull(),
  accessTokenEncrypted: text("access_token_encrypted"),
  refreshTokenEncrypted: text("refresh_token_encrypted"),
  scopes: jsonb("scopes").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  ...timestamps,
});

export const analyticsSnapshots = pgTable(
  "analytics_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publishedPostId: uuid("published_post_id")
      .notNull()
      .references(() => publishedPosts.id, { onDelete: "cascade" }),
    capturedAt: timestamp("captured_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    impressions: integer("impressions").notNull().default(0),
    reactions: integer("reactions").notNull().default(0),
    comments: integer("comments").notNull().default(0),
    shares: integer("shares").notNull().default(0),
  },
  (table) => ({
    postCapturedIdx: index("analytics_snapshots_post_captured_idx").on(
      table.publishedPostId,
      table.capturedAt,
    ),
  }),
);

export const usersRelations = relations(users, ({ many, one }) => ({
  preferences: one(preferences),
  drafts: many(drafts),
  reviewEvents: many(reviewEvents),
  notifications: many(notifications),
  linkedinAccounts: many(linkedinAccounts),
}));

export const preferencesRelations = relations(preferences, ({ one }) => ({
  user: one(users, {
    fields: [preferences.userId],
    references: [users.id],
  }),
}));

export const sourcesRelations = relations(sources, ({ many }) => ({
  items: many(sourceItems),
}));

export const sourceItemsRelations = relations(sourceItems, ({ one, many }) => ({
  source: one(sources, {
    fields: [sourceItems.sourceId],
    references: [sources.id],
  }),
  topicLinks: many(topicSources),
}));

export const topicsRelations = relations(topics, ({ many }) => ({
  sourceLinks: many(topicSources),
  drafts: many(drafts),
  qualityChecks: many(qualityChecks),
}));

export const topicSourcesRelations = relations(topicSources, ({ one }) => ({
  topic: one(topics, {
    fields: [topicSources.topicId],
    references: [topics.id],
  }),
  sourceItem: one(sourceItems, {
    fields: [topicSources.sourceItemId],
    references: [sourceItems.id],
  }),
}));

export const draftsRelations = relations(drafts, ({ one, many }) => ({
  topic: one(topics, {
    fields: [drafts.topicId],
    references: [topics.id],
  }),
  user: one(users, {
    fields: [drafts.userId],
    references: [users.id],
  }),
  versions: many(draftVersions),
  qualityChecks: many(qualityChecks),
  reviewEvents: many(reviewEvents),
  scheduledPosts: many(scheduledPosts),
  publishedPost: one(publishedPosts),
}));
