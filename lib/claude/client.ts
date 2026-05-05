import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getClaude(): Anthropic {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
  client = new Anthropic({ apiKey });
  return client;
}

// Default model for report generation and analysis. Override per call as needed.
export const DEFAULT_MODEL = "claude-sonnet-4-5";
