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
  body?: unknown;           // JSON body
  formData?: FormData;      // multipart/form-data (document uploads)
  accessToken?: string;
};

export async function koraFetch(
  path: string,
  { method = "GET", body, formData, accessToken }: KoraFetchOptions = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    "X-Tenant-Key": KORA_TENANT_KEY!,
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  let fetchBody: BodyInit | undefined;

  if (formData) {
    // Let fetch set the correct multipart Content-Type boundary automatically
    fetchBody = formData;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    fetchBody = JSON.stringify(body);
  }

  return fetch(`${KORA_API_URL}${path}`, {
    method,
    headers,
    body: fetchBody,
  });
}
