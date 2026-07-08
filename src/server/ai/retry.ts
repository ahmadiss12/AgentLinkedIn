import "server-only";

import { ApiError } from "@google/genai";

const RETRYABLE_STATUS_CODES = new Set([429, 500, 503]);
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000;

function isRetryable(error: unknown) {
  return error instanceof ApiError && RETRYABLE_STATUS_CODES.has(error.status);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withGeminiRetry<T>(run: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;

      if (attempt === MAX_RETRIES || !isRetryable(error)) {
        throw error;
      }

      const delay = BASE_DELAY_MS * 2 ** attempt + Math.random() * 250;
      await sleep(delay);
    }
  }

  throw lastError;
}
