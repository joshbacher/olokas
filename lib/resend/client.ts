import { Resend } from "resend";

let client: Resend | null = null;

export function getResend(): Resend {
  if (client) return client;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Missing RESEND_API_KEY");
  client = new Resend(apiKey);
  return client;
}

export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "Olokas <hello@olokas.com>";
