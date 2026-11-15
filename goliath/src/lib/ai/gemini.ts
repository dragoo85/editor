import { env } from "../env";
import type { AiCompletion, AiCompletionRequest, AiProvider } from "./types";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

interface GeminiRequestBody {
  contents: { role: "user" | "model"; parts: GeminiPart[] }[];
  systemInstruction?: { parts: GeminiPart[] };
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
  };
}

export class GeminiProvider implements AiProvider {
  readonly name = "gemini";
  readonly model: string;

  constructor(model?: string) {
    this.model = model ?? env.geminiModel();
  }

  isConfigured(): boolean {
    return Boolean(env.geminiApiKey());
  }

  private async call(body: GeminiRequestBody): Promise<string> {
    const apiKey = env.geminiApiKey();
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

    const response = await fetch(`${ENDPOINT}/${this.model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Gemini request failed (${response.status}): ${detail.slice(0, 300)}`);
    }

    const payload = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };

    const text =
      payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim() ?? "";
    return text;
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletion> {
    const system = request.messages.find((m) => m.role === "system");
    const conversation = request.messages.filter((m) => m.role !== "system");

    const body: GeminiRequestBody = {
      contents: conversation.map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      })),
      ...(system ? { systemInstruction: { parts: [{ text: system.content }] } } : {}),
      generationConfig: {
        temperature: request.temperature ?? 0.4,
        maxOutputTokens: request.maxOutputTokens ?? 2048,
        ...(request.jsonMode ? { responseMimeType: "application/json" } : {}),
      },
    };

    const text = await this.call(body);
    return { text, provider: this.name, model: this.model };
  }

  async summarizePdf({
    base64Pdf,
    mimeType,
    prompt,
  }: {
    base64Pdf: string;
    mimeType: string;
    prompt: string;
  }): Promise<string> {
    const body: GeminiRequestBody = {
      contents: [
        {
          role: "user",
          parts: [
            { inline_data: { mime_type: mimeType, data: base64Pdf } },
            { text: prompt },
          ],
        },
      ],
      generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
    };
    return this.call(body);
  }
}