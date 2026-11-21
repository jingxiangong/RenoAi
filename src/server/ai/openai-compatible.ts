import type { ZodType } from "zod";
import { RepairApiError, reserveQwenCall, type QwenCall } from "./qwen-quota";

const MAX_INPUT_TEXT_LENGTH = 12_000;
const MAX_OUTPUT_TOKENS = 1_200;

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
  const baseURL = process.env.QWEN_BASE_URL || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
  const text = JSON.stringify(input);
  if (text.length > MAX_INPUT_TEXT_LENGTH) {
    throw new RepairApiError(400, "The repair brief is too long. Shorten the details and try again.");
  }

  await reserveQwenCall(call);
  const response = await fetch(`${baseURL.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(30_000),
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
  if (!response.ok) throw new Error(`AI provider returned HTTP ${response.status}`);
  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("AI provider returned no JSON content");
  const output = schema.safeParse(JSON.parse(content.replace(/^```json\s*|\s*```$/g, "")));
  if (!output.success) throw new Error("AI provider returned an invalid repair response");
  return output.data;
}
