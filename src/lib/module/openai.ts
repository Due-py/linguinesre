import type { z } from "zod";

/**
 * Gọi OpenAI Chat Completions với đầu ra JSON theo lược đồ, rồi kiểm tra lại bằng zod.
 * Không đọc biến môi trường (khóa và mô hình do máy chủ truyền vào) để script Node dùng lại được.
 * Lý do lỗi không chứa lời học sinh, để ghi nhật ký an toàn.
 */
export type JsonResult<T> = { ok: true; output: T } | { ok: false; reason: string };

export async function callJson<T>(opts: {
  apiKey: string;
  model: string;
  name: string;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  jsonSchema: object;
  parse: z.ZodType<T>;
  timeoutMs?: number;
  maxTokens?: number;
}): Promise<JsonResult<T>> {
  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${opts.apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(opts.timeoutMs ?? 40_000),
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages,
        response_format: { type: "json_schema", json_schema: { name: opts.name, strict: true, schema: opts.jsonSchema } },
        max_completion_tokens: opts.maxTokens ?? 4000,
      }),
    });
  } catch (e) {
    return { ok: false, reason: e instanceof Error && e.name === "TimeoutError" ? "timeout" : "network" };
  }
  if (!res.ok) return { ok: false, reason: `http_${res.status}` };
  const body = await res.json().catch(() => null);
  const message = body?.choices?.[0]?.message;
  if (typeof message?.content !== "string" || message.content === "") return { ok: false, reason: message?.refusal ? "refusal" : "empty" };
  let json: unknown;
  try {
    json = JSON.parse(message.content);
  } catch {
    return { ok: false, reason: "bad_json" };
  }
  const parsed = opts.parse.safeParse(json);
  return parsed.success ? { ok: true, output: parsed.data } : { ok: false, reason: "bad_schema" };
}
