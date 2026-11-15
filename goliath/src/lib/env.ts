/**
 * Server-side environment access with explicit, actionable failures.
 * All getters are lazy so `next build` can import modules without secrets.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Add it to goliath/.env.local (see .env.example).`,
    );
  }
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

function intEnv(name: string, fallback: number): number {
  const raw = optional(name);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const env = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: () => optional("SUPABASE_SERVICE_ROLE_KEY"),

  tokenEncryptionKey: () => required("GOLIATH_TOKEN_ENCRYPTION_KEY"),

  googleClientId: () => required("GOOGLE_CLIENT_ID"),
  googleClientSecret: () => required("GOOGLE_CLIENT_SECRET"),
  googleRedirectUri: () =>
    optional("GOOGLE_REDIRECT_URI") ??
    `${optional("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000"}/api/google/oauth/callback`,
  googleDriveScope: () =>
    optional("GOLIATH_DRIVE_SCOPE") ?? "https://www.googleapis.com/auth/drive",

  geminiApiKey: () => optional("GEMINI_API_KEY"),
  geminiModel: () => optional("GEMINI_MODEL") ?? "gemini-2.5-flash",
  ollamaBaseUrl: () => optional("OLLAMA_BASE_URL"),
  ollamaModel: () => optional("OLLAMA_MODEL") ?? "llama3.1",

  uploadChunkBytes: () => intEnv("GOLIATH_UPLOAD_CHUNK_BYTES", 5 * 1024 * 1024),
  maxConcurrentUploads: () => intEnv("GOLIATH_MAX_CONCURRENT_UPLOADS", 2),
  maxConcurrentDownloads: () => intEnv("GOLIATH_MAX_CONCURRENT_DOWNLOADS", 3),
};

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function isTokenEncryptionConfigured(): boolean {
  return Boolean(process.env.GOLIATH_TOKEN_ENCRYPTION_KEY);
}

export type AiProviderName = "gemini" | "ollama" | "disabled";

export function activeAiProvider(): AiProviderName {
  if (env.geminiApiKey()) return "gemini";
  if (env.ollamaBaseUrl()) return "ollama";
  return "disabled";
}