# Contact Form Production Fix — Design

**Date:** 2026-02-23
**Status:** Approved

## Problem

The contact form at www.sitara.ae does not work in production. Two root causes:

1. Environment variables (`RESEND_API_KEY`, `SITARA_CONTACT_TO`, `SITARA_CONTACT_FROM`) were not set on the Vercel project.
2. The contact API route has a token guard that returns 404 in any non-development environment unless `SITARA_CONTACT_API_TOKEN` is set and the frontend sends a matching `Authorization` header. The frontend never sends this header, so the form is permanently broken in production.

## Solution

### 1. Environment Variables (already done)
Added to Vercel Project Settings → Environment Variables (All Environments):
- `RESEND_API_KEY`
- `SITARA_CONTACT_TO`
- `SITARA_CONTACT_FROM`

### 2. Remove Token Guard
Delete the 7-line `SITARA_CONTACT_API_TOKEN` block from `src/app/api/contact/route.ts`. Resend's own API key is sufficient authentication for outbound email. The token guard added complexity without benefit since the frontend never sent the required header.

### 3. Redeploy
Push the code change to git. Vercel auto-deploys on push and picks up the new environment variables.

## What Does Not Change

- Contact form UI (`Contact.tsx`) — no changes
- Resend email logic — no changes
- All other env vars and configuration — no changes

## Success Criteria

- Submitting the contact form on www.sitara.ae sends a notification email to `metals@sitara.ae`
- Submitter receives a confirmation email
- No 404 or 5xx errors from `/api/contact`
