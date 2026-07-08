import "server-only";

import { ApiError, type GenerateContentParameters } from "@google/genai";
import { getGeminiClient } from "@/server/ai/gemini-client";
import { withGeminiRetry } from "@/server/ai/retry";

const FALLBACK_MODEL = "gemini-2.5-flash-lite";

function isQuotaExhausted(error: unknown) {
  return error instanceof ApiError && error.status === 429;
}

/**
 * Free-tier daily quotas are tracked per model. When the primary model's
 * quota is exhausted for the day, retrying it is pointless — fall back to a
 * different model instead, which draws from a separate quota bucket.
 */
export async function generateContentWithFallback(params: GenerateContentParameters) {
  try {
    return await withGeminiRetry(() => getGeminiClient().models.generateContent(params));
  } catch (error) {
    if (isQuotaExhausted(error) && params.model !== FALLBACK_MODEL) {
      return withGeminiRetry(() =>
        getGeminiClient().models.generateContent({ ...params, model: FALLBACK_MODEL }),
      );
    }

    throw error;
  }
}
