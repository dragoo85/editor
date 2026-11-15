import { env } from "../env";
import type { AiCompletion, AiCompletionRequest, AiProvider } from "./types";

/** Local inference via Ollama's OpenAI-compatible chat endpoint. */
export class OllamaProvider implements AiProvider {
  readonly name = "ollama";
  readonly model: string;

  constructor(model?: string) {
    this.model = model ?? env.ollamaModel();
  }

  isConfigured(): boolean {
    return Boolean(env.ollamaBaseUrl());
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletion> {
    const baseUrl = env.ollamaBaseUrl();
    if (!baseUrl) throw new Error("OLLAMA_BASE_URL is not configured");

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        stream: false,
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
        options: {
          temperature: request.temperature ?? 0.4,
          num_predict: request.maxOutputTokens ?? 2048,
        },
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Ollama request failed (${response.status}): ${detail.slice(0, 300)}`);
    }

    const payload = (await response.json()) as {
      message?: { content?: string };
      prompt_eval_count?: number;
      eval_count?: number;
    };

    return {
      text: (payload.message?.content ?? "").trim(),
      provider: this.name,
      model: this.model,
      usage: { inputTokens: payload.prompt_eval_count, outputTokens: payload.eval_count },
    };
  }
}