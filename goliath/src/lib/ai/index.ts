import { activeAiProvider } from "../env";
import { GeminiProvider } from "./gemini";
import { OllamaProvider } from "./ollama";
import type { AiProvider } from "./types";

export type ProviderChoice = "auto" | "gemini" | "ollama" | "disabled";

/** Provider-independent selection. Gemini wins when a key is present, then local Ollama. */
export function resolveProvider(choice?: string): AiProvider | null {
  const normalized = (choice ?? "auto") as ProviderChoice;

  if (normalized === "disabled") return null;

  if (normalized === "gemini") {
    const gemini = new GeminiProvider();
    return gemini.isConfigured() ? gemini : null;
  }

  if (normalized === "ollama") {
    const ollama = new OllamaProvider();
    return ollama.isConfigured() ? ollama : null;
  }

  switch (activeAiProvider()) {
    case "gemini":
      return new GeminiProvider();
    case "ollama":
      return new OllamaProvider();
    default:
      return null;
  }
}

export function providerDescription(): { name: string; available: boolean; model: string } {
  const auto = resolveProvider("auto");
  if (auto) return { name: auto.name, available: true, model: auto.model };
  return { name: "disabled", available: false, model: "" };
}