import "server-only";

import { z } from "zod";
import { researchBriefSchema, type ResearchBrief, type TopicForBrief } from "@/core/research-brief-models";
import { generateContentWithFallback } from "@/server/ai/generate-with-fallback";

const NEWS_SYSTEM_PROMPT = `You are a research analyst producing short, source-grounded technical briefs for a "trust but verify" LinkedIn content pipeline.
Rules:
- Base every claim ONLY on the provided source material. Never introduce facts, numbers, or context that are not present in the sources.
- Every entry in "sourceAttributions" must reference one of the given source names and describe a claim that source actually supports.
- If the sources are thin, contradictory, speculative, or hype-driven, say so plainly in "warnings" and lower "confidence" accordingly.
- "factualityNotes" should describe how well the brief is supported by the given sources, not general commentary about the topic.
- Do not speculate about outcomes the sources do not describe.
- Respond with JSON only, matching the provided schema exactly.`;

const LEARNING_SYSTEM_PROMPT = `You are a senior engineer preparing a teaching brief about a software engineering concept. This brief will later be turned into an educational LinkedIn post.
Rules:
- Teach established engineering knowledge from first principles. No news framing, no version numbers, no vendor announcements.
- If source material is provided, use it as the base for what to teach: follow its main lesson and examples, and attribute it in "sourceAttributions" (sourceName + the claim taken from it). If no source material is provided, write from general engineering knowledge and leave "sourceAttributions" as an empty array.
- "technicalSummary": explain the concept in simple, concrete words. Structure it as: the problem developers face, then how the solution works step by step (use a request/data walking through the system as the running example when possible).
- "whyItMatters": why a working engineer should care — what breaks or hurts without this.
- "keyFacts": 4-6 short, standalone points: the core mechanics, the main trade-offs, and 1-2 practical rules of thumb (when to use it, when NOT to use it, common mistakes).
- "factualityNotes": one sentence on what this is based on (established fundamentals and/or the provided article), noting anything that is opinion or context-dependent.
- "warnings": empty unless part of the topic is genuinely contested or often taught wrong.
- "confidence": "high" for settled fundamentals.
- Use simple words. Avoid jargon without a one-phrase explanation.
- Respond with JSON only, matching the provided schema exactly.`;

const responseJsonSchema: Record<string, unknown> = z.toJSONSchema(researchBriefSchema);
delete responseJsonSchema.$schema;

export class ResearchBriefGenerator {
  async generate(topic: TopicForBrief): Promise<ResearchBrief> {
    const isLearning = topic.type === "learning";

    const sourceBlock = topic.sources
      .map(
        (source, index) =>
          `[${index + 1}] ${source.sourceName} — ${source.title}\nURL: ${source.url}\n${
            source.summary ?? "(no summary provided)"
          }`,
      )
      .join("\n\n");

    const learningSourceBlock =
      topic.sources.length > 0 ? `\n\nSource material to teach from:\n${sourceBlock}` : "";
    const contents = isLearning
      ? `Concept to teach: ${topic.title}\nCategory: ${topic.category}\nWhat the post should cover: ${topic.summary}${learningSourceBlock}\n\nWrite the teaching brief now.`
      : `Topic: ${topic.title}\nCategory: ${topic.category}\nHeuristic summary: ${topic.summary}\n\nSource material:\n${sourceBlock}\n\nWrite the research brief now, grounded strictly in the source material above.`;

    const response = await generateContentWithFallback({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction: isLearning ? LEARNING_SYSTEM_PROMPT : NEWS_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseJsonSchema,
      },
    });

    const text = response.text;

    if (!text) {
      throw new Error("Research brief generation returned no content.");
    }

    const parsed = researchBriefSchema.safeParse(JSON.parse(text));

    if (!parsed.success) {
      throw new Error(`Research brief did not match the expected schema: ${parsed.error.message}`);
    }

    return parsed.data;
  }
}
