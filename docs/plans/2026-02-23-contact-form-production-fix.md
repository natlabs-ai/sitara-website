# Contact Form Production Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the broken token guard from the contact API route so the form works in production on Vercel.

**Architecture:** Single file change — delete the 7-line `SITARA_CONTACT_API_TOKEN` block from the API route. Env vars are already set on Vercel. Push to git triggers auto-deploy.

**Tech Stack:** Next.js 15 App Router, TypeScript, Resend SDK, Vercel

---

### Task 1: Remove the token guard from the contact route

**Files:**
- Modify: `src/app/api/contact/route.ts:32-38`

**Step 1: Open the file and locate the guard block**

File: `src/app/api/contact/route.ts`

Find and delete this entire block (lines 32–38):

```typescript
  if (process.env.NODE_ENV !== "development") {
    const token = process.env.SITARA_CONTACT_API_TOKEN;
    if (!token) return json(404, { error: "Not available" });

    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${token}`) return json(401, { error: "Unauthorized" });
  }
```

The `POST` function should open directly with the env var reads after removing this block:

```typescript
export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const internalTo = process.env.SITARA_CONTACT_TO;
  // ...rest unchanged
```

**Step 2: Verify the dev server still starts**

```bash
cd c:\Users\laken\sitara-website
npm run dev
```

Expected: `✓ Starting...` on `http://localhost:3000` with no TypeScript errors.

**Step 3: Smoke-test the endpoint locally with curl**

In a second terminal (with dev server running):

```bash
curl -s -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","message":"This is a test message from local."}'
```

Expected response (Resend keys are real in `.env.local`):
```json
{"ok":true,"internal_id":"...","confirmation_id":"...","confirmation_ok":true}
```

If Resend returns an error, confirm `.env.local` values match what's in the Vercel dashboard.

**Step 4: Commit**

```bash
git add src/app/api/contact/route.ts
git commit -m "fix: remove token guard blocking contact form in production"
```

---

### Task 2: Push and verify production deployment

**Step 1: Push to main**

```bash
git push origin main
```

Expected: Vercel auto-deploy triggers. Monitor at https://vercel.com/dashboard on the `sitara-website` project.

**Step 2: Wait for deployment to complete**

Watch the Vercel dashboard until the deployment shows **Ready** (typically 60–90 seconds).

**Step 3: Smoke-test production**

```bash
curl -s -X POST https://www.sitara.ae/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Production Test","email":"test@example.com","message":"Production smoke test — please ignore."}'
```

Expected:
```json
{"ok":true,"internal_id":"...","confirmation_id":"...","confirmation_ok":true}
```

**Step 4: Confirm emails arrived**

- Check `metals@sitara.ae` inbox for the internal notification
- Check `test@example.com` for the confirmation email

---

**Done.** The contact form at www.sitara.ae is fully operational.
