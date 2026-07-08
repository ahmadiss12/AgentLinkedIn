import "server-only";

import { XMLParser } from "fast-xml-parser";
import {
  normalizedSourceItemSchema,
  type NormalizedSourceItem,
  type TrustedSource,
} from "@/core/discovery-models";
import { stripHtml, truncateWords } from "@/server/discovery/text-utils";

type FeedRecord = Record<string, unknown>;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  cdataPropName: "__cdata",
  textNodeName: "#text",
  trimValues: true,
});

export type FeedFetchResult = {
  source: TrustedSource;
  items: NormalizedSourceItem[];
};

export class FeedFetcher {
  async fetchSource(source: TrustedSource): Promise<FeedFetchResult> {
    const response = await fetch(source.url, {
      headers: {
        accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
        "user-agent": "AgentLinkedIn/0.1 topic-discovery",
      },
      signal: AbortSignal.timeout(10_000),
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      throw new Error(`Feed returned ${response.status} ${response.statusText}`);
    }

    const xml = await response.text();
    const parsed = parser.parse(xml) as FeedRecord;
    const records = extractFeedRecords(parsed);
    const fetchedAt = new Date();

    const items = records
      .map((record) => normalizeFeedRecord(source, record, fetchedAt))
      .filter((item): item is NormalizedSourceItem => Boolean(item));

    return { source, items };
  }
}

function extractFeedRecords(parsed: FeedRecord) {
  const rss = parsed.rss as FeedRecord | undefined;
  const channel = rss?.channel as FeedRecord | undefined;
  const rssItems = channel?.item;

  if (rssItems) {
    return toArray(rssItems);
  }

  const feed = parsed.feed as FeedRecord | undefined;
  const atomEntries = feed?.entry;

  if (atomEntries) {
    return toArray(atomEntries);
  }

  return [];
}

function normalizeFeedRecord(
  source: TrustedSource,
  record: FeedRecord,
  fetchedAt: Date,
) {
  const title = textValue(record.title);
  const url = linkValue(record.link, source.url) ?? textValue(record.guid);

  if (!title || !url) {
    return null;
  }

  const summary =
    textValue(record.description) ??
    textValue(record.summary) ??
    textValue(record.content) ??
    textValue(record["content:encoded"]);
  const publishedAt = dateValue(
    textValue(record.pubDate) ??
      textValue(record.published) ??
      textValue(record.updated) ??
      textValue(record["dc:date"]),
  );
  const author =
    textValue(record.author) ??
    textValue(record["dc:creator"]) ??
    textValue(record.creator);

  const candidate = normalizedSourceItemSchema.safeParse({
    sourceName: source.name,
    sourceUrl: source.url,
    sourceType: source.type,
    sourceTrustLevel: source.trustLevel,
    contentType: source.contentType ?? "news",
    title: stripHtml(title),
    url: absolutizeUrl(url, source.url),
    summary: summary ? truncateWords(stripHtml(summary), 60) : undefined,
    author: author ? stripHtml(author) : undefined,
    publishedAt,
    fetchedAt,
    categories: source.categories,
    rawMetadata: {
      guid: textValue(record.guid),
      updated: textValue(record.updated),
      published: textValue(record.published),
    },
  });

  return candidate.success ? candidate.data : null;
}

function toArray(value: unknown): FeedRecord[] {
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }

  return isRecord(value) ? [value] : [];
}

function isRecord(value: unknown): value is FeedRecord {
  return typeof value === "object" && value !== null;
}

function textValue(value: unknown): string | undefined {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(textValue).find(Boolean);
  }

  if (isRecord(value)) {
    return (
      textValue(value["#text"]) ??
      textValue(value.__cdata) ??
      textValue(value.name) ??
      textValue(value.href) ??
      textValue(value.url)
    );
  }

  return undefined;
}

function linkValue(value: unknown, baseUrl: string) {
  if (typeof value === "string") {
    return absolutizeUrl(value, baseUrl);
  }

  if (Array.isArray(value)) {
    const alternate = value.find(
      (item) => isRecord(item) && (!item.rel || item.rel === "alternate"),
    );
    return linkValue(alternate ?? value[0], baseUrl);
  }

  if (isRecord(value)) {
    return absolutizeUrl(textValue(value.href) ?? textValue(value["#text"]) ?? "", baseUrl);
  }

  return undefined;
}

function absolutizeUrl(value: string, baseUrl: string) {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

function dateValue(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
}
