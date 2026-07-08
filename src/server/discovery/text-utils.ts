import "server-only";

import { createHash } from "node:crypto";

export function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&hellip;/g, "...")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCharCode(Number.parseInt(code, 16)),
    )
    .replace(/\s+/g, " ")
    .trim();
}

export function truncateWords(value: string, maxWords: number) {
  const words = value.split(/\s+/).filter(Boolean);

  if (words.length <= maxWords) {
    return value;
  }

  return `${words.slice(0, maxWords).join(" ")}...`;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function stableHash(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 10);
}

export function candidateSlug(title: string, url: string) {
  const base = slugify(title) || "topic";
  return `${base}-${stableHash(url)}`;
}
