import "server-only";

import { z } from "zod";
import { draftGenerationSchema, type LinkedinDraft, type TopicForDraft } from "@/core/draft-models";
import type { Preferences } from "@/core/settings-models";
import { generateContentWithFallback } from "@/server/ai/generate-with-fallback";

const LENGTH_GUIDE: Record<Preferences["postLength"], string> = {
  short: "roughly 60-100 words",
  medium: "roughly 120-180 words",
  long: "roughly 200-280 words",
};

const HASHTAG_GUIDE: Record<Preferences["hashtagStyle"], string> = {
  minimal: "2-3",
  balanced: "3-5",
  expanded: "5-8",
};

const FOCUS_GUIDE: Record<Preferences["contentFocus"], string> = {
  beginner_friendly:
    "Write for readers newer to the topic: explain terms briefly, avoid unexplained jargon.",
  advanced_technical:
    "Write for experienced engineers: technical depth is welcome, skip basic explanations.",
  career_oriented:
    "Frame the takeaway around what this means for a reader's skills or career decisions.",
  industry_trend:
    "Frame the post around where the industry is heading and why this development signals it.",
};

export type DraftStyle = Pick<
  Preferences,
  "tone" | "postLength" | "hashtagStyle" | "contentFocus"
>;

const DEFAULT_STYLE: DraftStyle = {
  tone: "professional, curious, accessible",
  postLength: "medium",
  hashtagStyle: "balanced",
  contentFocus: "advanced_technical",
};

function buildSystemPrompt(style: DraftStyle) {
  return `You are a technical writer drafting a LinkedIn post for a software engineer's personal account.
Rules:
- Base the post ONLY on the provided research brief. Do not introduce facts, numbers, or claims that are not in the brief's key facts or source attributions.
- Write like a real, technical person, not a corporate marketing account. No hype, no emoji spam, no "Exciting news!" openers.
- Tone of voice: ${style.tone}.
- ${FOCUS_GUIDE[style.contentFocus]}
- "hook" is the first 1-2 lines — specific and concrete, written to make a technical reader stop scrolling. Not a question, not clickbait.
- "body" is short, readable paragraphs (blank line between paragraphs), ending with a practical takeaway for the reader, not a generic call to action.
- Keep the whole post to ${LENGTH_GUIDE[style.postLength]} unless the brief genuinely needs more room.
- "hashtags" is ${HASHTAG_GUIDE[style.hashtagStyle]} lowercase words or camelCase phrases, no "#" symbol, no spaces.
- "angle" is a short label describing the approach this draft takes (e.g. "practical engineering lesson", "why this matters for platform teams").
- "alternateAngles" is 2-3 short alternative angle ideas (not full drafts) that were not used, in case the user wants a regenerate with a different take.
- If the brief carries warnings about weak sourcing or speculation, either soften the framing accordingly or reflect that uncertainty honestly — never state something as certain that the brief flags as uncertain.
- Respond with JSON only, matching the provided schema exactly.`;
}

const responseJsonSchema: Record<string, unknown> = z.toJSONSchema(draftGenerationSchema);
delete responseJsonSchema.$schema;

export class DraftGenerator {
  async generate(
    topic: TopicForDraft,
    options?: { avoidAngle?: string; style?: DraftStyle },
  ): Promise<LinkedinDraft> {
    const style = options?.style ?? DEFAULT_STYLE;
    const keyFacts = topic.brief.keyFacts.map((fact) => `- ${fact}`).join("\n");
    const attributions = topic.brief.sourceAttributions
      .map((attribution) => `- ${attribution.sourceName}: ${attribution.claim}`)
      .join("\n");
    const warnings = topic.brief.warnings.length > 0 ? topic.brief.warnings.join("; ") : "none";
    const angleInstruction = options?.avoidAngle
      ? `\n\nA previous draft already used this angle: "${options.avoidAngle}". Take a genuinely different angle this time — do not reuse it or a close variant of it.`
      : "";

    const response = await generateContentWithFallback({
      model: "gemini-2.5-flash",
      contents: `Topic: ${topic.title}\nCategory: ${topic.category}\n\nResearch brief:\n${topic.brief.technicalSummary}\n\nWhy it matters:\n${topic.brief.whyItMatters}\n\nKey facts:\n${keyFacts}\n\nSource attributions:\n${attributions}\n\nWarnings: ${warnings}\nConfidence: ${topic.brief.confidence}${angleInstruction}\n\nWrite the LinkedIn draft now.`,
      config: {
        systemInstruction: buildSystemPrompt(style),
        responseMimeType: "application/json",
        responseJsonSchema,
      },
    });

    const text = response.text;

    if (!text) {
      throw new Error("Draft generation returned no content.");
    }

    const parsed = draftGenerationSchema.safeParse(JSON.parse(text));

    if (!parsed.success) {
      throw new Error(`Draft did not match the expected schema: ${parsed.error.message}`);
    }

    return parsed.data;
  }
}
