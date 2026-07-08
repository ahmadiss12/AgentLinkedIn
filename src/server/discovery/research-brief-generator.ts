import "server-only";

import { z } from "zod";
import { researchBriefSchema, type ResearchBrief, type TopicForBrief } from "@/core/research-brief-models";
import { generateContentWithFallback } from "@/server/ai/generate-with-fallback";

const SYSTEM_PROMPT = `You are a research analyst producing short, source-grounded technical briefs for a "trust but verify" LinkedIn content pipeline.
Rules:
- Base every claim ONLY on the provided source material. Never introduce facts, numbers, or context that are not present in the sources.
- Every entry in "sourceAttributions" must reference one of the given source names and describe a claim that source actually supports.
- If the sources are thin, contradictory, speculative, or hype-driven, say so plainly in "warnings" and lower "confidence" accordingly.
- "factualityNotes" should describe how well the brief is supported by the given sources, not general commentary about the topic.
- Do not speculate about outcomes the sources do not describe.
- Respond with JSON only, matching the provided schema exactly.`;

const responseJsonSchema: Record<string, unknown> = z.toJSONSchema(researchBriefSchema);
delete responseJsonSchema.$schema;

export class ResearchBriefGenerator {
  async generate(topic: TopicForBrief): Promise<ResearchBrief> {
    const sourceBlock = topic.sources
      .map(
        (source, index) =>
          `[${index + 1}] ${source.sourceName} — ${source.title}\nURL: ${source.url}\n${
            source.summary ?? "(no summary provided)"
          }`,
      )
      .join("\n\n");

    const response = await generateContentWithFallback({
      model: "gemini-2.5-flash",
      contents: `Topic: ${topic.title}\nCategory: ${topic.category}\nHeuristic summary: ${topic.summary}\n\nSource material:\n${sourceBlock}\n\nWrite the research brief now, grounded strictly in the source material above.`,
      config: {
        systemInstruction: SYSTEM_PROMPT,
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
