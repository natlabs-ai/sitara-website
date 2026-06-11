# New Tenant Deployment Checklist

Use this guide every time you deploy the Sitara website for a new tenant.

---

## Step 1 — Register the tenant in Kora

1. Log into the Kora portal as a NatLabs superadmin
2. Create a new tenant (or confirm it exists): **Tenants → New Tenant**
3. Note the tenant `code` from the database: `SELECT id, name, code FROM tenants WHERE name ILIKE '%tenant name%';`

---

## Step 2 — Generate a Kora API key for the tenant

The API key authenticates the Sitara website as an authorised caller for that tenant. It is **shown only once** — store it immediately.

1. In Kora admin: Tenant → Settings → **Generate API Key**
2. Copy the raw key (`kora_xxxxxxxx…`) — it cannot be retrieved after this screen
3. Store it securely (password manager / Vercel env vars)

---

## Step 3 — Configure Vercel environment variables

In Vercel → Project → **Settings → Environment Variables**, set:

| Variable | Value | Notes |
|---|---|---|
| `KORA_API_URL` | `https://your-kora-api-url.com` | Kora backend base URL |
| `KORA_TENANT_API_KEY` | `kora_xxxxxxxx…` | Raw key from Step 2 — server-side only |
| `NEXT_PUBLIC_KORA_TENANT_CODE` | `your-tenant-code` | Tenant `code` from Step 1 — safe for browser |

Apply to: **Production**, **Preview**, and **Development** as appropriate.

---

## Step 4 — Verify

1. Deploy (or trigger a redeploy) on Vercel
2. Go to `/onboard` → start a new application
3. Confirm no "Failed to create application" error
4. Confirm the application appears in the Kora portal under the correct tenant

---

## Notes

- `KORA_TENANT_API_KEY` is a **server-side secret** — never prefix it with `NEXT_PUBLIC_`
- `NEXT_PUBLIC_KORA_TENANT_CODE` is **not a secret** — it's sent in the request body to identify the tenant
- If an API key is lost, regenerate it in Kora admin and update Vercel immediately
