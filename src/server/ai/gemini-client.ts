import "server-only";

import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

export function hasGeminiKey() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is required to call the Gemini API.");
  }

  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  return client;
}
