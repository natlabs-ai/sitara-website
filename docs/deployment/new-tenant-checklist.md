# New Tenant Deployment Checklist

Use this guide every time you deploy the Sitara website for a new tenant.

---

## Step 1 — Register the tenant in Kora

1. Log into the Kora portal as a NatLabs superadmin
2. Create a new tenant (or confirm it exists): **Tenants → New Tenant**
3. Note the tenant `code` from the database: `SELECT id, name, code FROM tenants WHERE name ILIKE '%tenant name%';`

---

## Step 2 — Generate a Kora API key for the tenant

The API key authenticates the Sitara website as an authorised caller for that tenant. The raw key is **shown only once** — store it immediately in a password manager and in Vercel.

> **Note:** There is no UI for this yet. Use the script below.

1. Find the tenant's `id` from the database:
   ```sql
   SELECT id, name, code FROM tenants WHERE code = 'your-tenant-code';
   ```

2. In the Kora backend directory, update `TENANT_ID` in `backend/generate_tenant_key.py` to match, then run:
   ```
   cd c:\Users\laken\kora\backend
   python generate_tenant_key.py
   ```

3. The script prints:
   - **Raw API key** (`kora_xxxxxxxx…`) — copy this to Vercel as `KORA_TENANT_API_KEY`
   - **SQL UPDATE** — run this against the staging/production database to store the key hash

4. Run the printed SQL against the database and verify `1 row affected`:
   ```sql
   UPDATE tenants
   SET api_key_hash = '<hash>',
       api_key_prefix = '<prefix>'
   WHERE id = '<tenant-id>';
   ```

5. After updating Vercel (Step 3 below), trigger a **new redeploy** — env var changes are not picked up by existing deployments.

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
- If an API key is lost, re-run `generate_tenant_key.py`, apply the new SQL, update Vercel, and redeploy

## Common Pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `Invalid or inactive tenant API key` | No key generated yet (`api_key_prefix` is null in DB) | Run `generate_tenant_key.py` and apply the SQL |
| `Invalid or inactive tenant API key` after updating Vercel | Redeploy not triggered after env var change | Trigger a new deployment in Vercel |
| `Failed to create application` with 404 | Wrong `KORA_API_URL` (e.g. pointing at frontend, not backend) | Set URL to the Azure Container Apps backend URL |
| `Failed to create application` with double slash in URL | `KORA_API_URL` has a trailing slash | Remove trailing slash from the env var value |
| Email check works but account creation fails | Two different endpoints — email check doesn't require API key, account creation does | API key not configured correctly; check the above rows |
