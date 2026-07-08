import "server-only";

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "how",
  "in", "into", "is", "it", "its", "new", "now", "of", "on", "or", "that",
  "the", "this", "to", "up", "using", "via", "was", "we", "what", "when",
  "why", "will", "with", "you", "your",
]);

export function tokenize(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));

  return new Set(tokens);
}

export function jaccardSimilarity(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) {
      intersection += 1;
    }
  }

  const union = left.size + right.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function textSimilarity(leftText: string, rightText: string): number {
  return jaccardSimilarity(tokenize(leftText), tokenize(rightText));
}
