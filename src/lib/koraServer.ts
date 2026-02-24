/**
 * Server-side Kora API client.
 * Import ONLY in Next.js API routes or Server Components — never in client components.
 * Reads secret env vars that must never reach the browser.
 */

const KORA_API_URL    = process.env.KORA_API_URL;
const KORA_TENANT_KEY = process.env.KORA_TENANT_API_KEY;

if (!KORA_API_URL || !KORA_TENANT_KEY) {
  throw new Error(
    "Missing required env vars: KORA_API_URL and KORA_TENANT_API_KEY must be set in .env.local"
  );
}

type KoraFetchOptions = {
  method?: string;
  body?: unknown;
  accessToken?: string;
};

export async function koraFetch(
  path: string,
  { method = "GET", body, accessToken }: KoraFetchOptions = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Tenant-Key": KORA_TENANT_KEY!,
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  return fetch(`${KORA_API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}
