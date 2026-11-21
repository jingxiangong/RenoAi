import "server-only";

import { cacheScopeForEmail } from "@/server/cache-scope";
import { createRenoQuotaSupabase } from "@/server/supabase";

export type QwenCall = {
  email: string;
  requestId: string;
  stage: "extract" | "clarify" | "repair";
};

export class RepairApiError extends Error {
  constructor(readonly status: 400 | 429 | 502 | 503 | 504, message: string) {
    super(message);
  }
}

const quotaMessages: Record<string, string> = {
  clarification_limit: "This repair has already used its AI follow-up. Review the current brief to continue.",
  request_limit: "This repair has reached its AI limit for this step.",
  account_limit: "You have reached your daily AI limit. Try again after midnight UTC.",
  site_limit: "RenoAI has reached its daily AI limit. Try again after midnight UTC.",
};

function dailyLimit(name: "QWEN_ACCOUNT_DAILY_LIMIT" | "QWEN_SITE_DAILY_LIMIT", fallback: number) {
  const configured = process.env[name]?.trim();
  if (!configured) return fallback;
  const value = Number(configured);
  if (!Number.isInteger(value) || value < 1 || value > 2_147_483_647) {
    throw new Error(`Invalid ${name}: expected a positive integer`);
  }
  return value;
}

export async function reserveQwenCall({ email, requestId, stage }: QwenCall) {
  let result: string;
  try {
    const { data, error } = await createRenoQuotaSupabase()
      .rpc("reno_reserve_qwen_call", {
        p_account_id: cacheScopeForEmail(email),
        p_request_id: requestId,
        p_stage: stage,
        p_account_daily_limit: dailyLimit("QWEN_ACCOUNT_DAILY_LIMIT", 12),
        p_site_daily_limit: dailyLimit("QWEN_SITE_DAILY_LIMIT", 120),
      })
      .abortSignal(AbortSignal.timeout(5_000));
    if (error) throw error;
    result = data;
  } catch (error) {
    console.error("Qwen quota unavailable", error instanceof Error ? error.message : "database error");
    throw new RepairApiError(503, "Live AI is unavailable because usage limits could not be checked.");
  }

  if (result === "allowed") return;
  const message = Object.hasOwn(quotaMessages, result) ? quotaMessages[result] : undefined;
  if (message) throw new RepairApiError(429, message);
  throw new RepairApiError(503, "Live AI is unavailable because usage limits could not be checked.");
}
