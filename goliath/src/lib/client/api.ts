export class ApiError extends Error {
  status: number;
  code?: string;
  retryAfterSeconds?: number;

  constructor(message: string, status: number, extra?: { code?: string; retryAfterSeconds?: number }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = extra?.code;
    this.retryAfterSeconds = extra?.retryAfterSeconds;
  }
}

async function parse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;
  if (!response.ok) {
    const record = (payload ?? {}) as { error?: string; code?: string; retryAfterSeconds?: number };
    throw new ApiError(record.error ?? `Request failed (${response.status})`, response.status, {
      code: record.code,
      retryAfterSeconds: record.retryAfterSeconds,
    });
  }
  return payload as T;
}

export async function apiGet<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  return parse<T>(response);
}

export async function apiSend<T>(
  url: string,
  body: unknown,
  method: "POST" | "PUT" | "PATCH" | "DELETE" = "POST",
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  return parse<T>(response);
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Unexpected error";
}