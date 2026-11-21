import type { ZodType } from "zod";
import { RepairApiError, reserveQwenCall, type QwenCall } from "./qwen-quota";

const MAX_INPUT_TEXT_LENGTH = 12_000;
const MAX_OUTPUT_TOKENS = 1_200;

function providerError(status: number) {
  switch (status) {
    case 401:
    case 403:
      return new RepairApiError(502, `Qwen denied access (HTTP ${status}). Check the API key, endpoint region, and model access in Alibaba Cloud Model Studio.`);
    case 404:
      return new RepairApiError(502, "Qwen could not find the endpoint or model (HTTP 404). Check QWEN_BASE_URL and QWEN_MODEL.");
    case 429:
      return new RepairApiError(429, "Qwen is limiting requests (HTTP 429). Check your Model Studio usage and try again later.");
    default:
      return new RepairApiError(502, `Qwen rejected the repair request (HTTP ${status}). Try a short text-only report first.`);
  }
}

export async function generateStructured<T>({ call, model, system, input, schema, images = [] }: {
  call: QwenCall;
  model: string;
  system: string;
  input: object;
  schema: ZodType<T>;
  images?: string[];
}): Promise<T> {
  const apiKey = process.env.QWEN_API_KEY?.trim();
  if (!apiKey) throw new RepairApiError(503, "Live AI is not configured.");
  const baseURL = process.env.QWEN_BASE_URL?.trim() || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
  const text = JSON.stringify(input);
  if (text.length > MAX_INPUT_TEXT_LENGTH) {
    throw new RepairApiError(400, "The repair brief is too long. Shorten the details and try again.");
  }

  await reserveQwenCall(call);
  const signal = AbortSignal.timeout(30_000);
  let choice: { message?: { content?: unknown }; finish_reason?: string } | undefined;
  try {
    const response = await fetch(`${baseURL.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      signal,
      body: JSON.stringify({
        model,
        max_tokens: MAX_OUTPUT_TOKENS,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `${system}\nReturn one valid JSON object. No markdown fences.` },
          {
            role: "user",
            content: images.length ? [
              { type: "text", text },
              ...images.map((url) => ({ type: "image_url", image_url: { url } })),
            ] : text,
          },
        ],
      }),
    });
    if (!response.ok) throw providerError(response.status);
    const payload = await response.json();
    choice = payload?.choices?.[0];
  } catch (error) {
    if (error instanceof RepairApiError) throw error;
    if (signal.aborted) throw new RepairApiError(504, "Qwen timed out. Try a shorter description or fewer photos.");
    if (error instanceof SyntaxError) throw new RepairApiError(502, "The Qwen endpoint returned an unreadable response. Check QWEN_BASE_URL.");
    throw new RepairApiError(502, "Could not connect to Qwen. Check your network and QWEN_BASE_URL.");
  }

  if (choice?.finish_reason === "length") {
    throw new RepairApiError(502, "Qwen reached the response limit. Try a shorter description or fewer photos.");
  }
  const invalidBrief = () => new RepairApiError(502, "Qwen did not return a usable repair brief. Try again with a clearer description.");
  const content = choice?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw invalidBrief();
  let repair: unknown;
  try {
    repair = JSON.parse(content.trim().replace(/^```(?:json)?\s*|\s*```$/gi, ""));
  } catch {
    throw invalidBrief();
  }
  const output = schema.safeParse(repair);
  if (!output.success) throw invalidBrief();
  return output.data;
}
