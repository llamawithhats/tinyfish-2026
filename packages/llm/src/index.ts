import { getEnv } from "@autointern/config";
import { z, type ZodTypeAny } from "zod";

export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

function extractJsonBlock(content: string): string {
  const trimmed = content.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return trimmed;
  }

  const fenced = trimmed.match(/```json\s*([\s\S]+?)```/i) ?? trimmed.match(/```\s*([\s\S]+?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  throw new Error("LLM response did not contain parseable JSON.");
}

export async function generateStructuredObject<TSchema extends ZodTypeAny>({
  schema,
  messages,
  temperature = 0.2
}: {
  schema: TSchema;
  messages: LlmMessage[];
  temperature?: number;
}): Promise<z.output<TSchema>> {
  const env = getEnv();

  const response = await fetch(`${env.LLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.LLM_API_KEY}`,
      ...(env.LLM_ORGANIZATION ? { "OpenAI-Organization": env.LLM_ORGANIZATION } : {})
    },
    body: JSON.stringify({
      model: env.LLM_MODEL,
      temperature,
      response_format: { type: "json_object" },
      messages
    })
  });

  if (!response.ok) {
    throw new Error(`LLM request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as ChatCompletionResponse;
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("LLM response did not contain content.");
  }

  const parsed = JSON.parse(extractJsonBlock(content));
  return schema.parse(parsed);
}

export async function generateText(messages: LlmMessage[], temperature = 0.3): Promise<string> {
  const schema = z.object({ text: z.string().min(1) });
  const response = await generateStructuredObject({
    schema,
    messages,
    temperature
  });

  return response.text;
}
