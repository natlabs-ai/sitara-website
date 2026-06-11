# Unified Navbar Design

**Date:** 2026-06-12  
**Status:** Approved

## Problem

The Sitara website has three separate nav implementations, each managed inline by its own page:

- `src/components/Header.tsx` — home page full marketing nav
- `src/app/onboard/page.tsx` — inline minimal header (different wordmark colour, no sticky, no blur)
- `src/app/login/page.tsx` — inline minimal header (similar to onboard but slightly different)
- `src/app/dashboard/page.tsx` — inline authenticated header (yet another styling variant)

This fragmentation means the wordmark is amber on some pages and neutral-200 on others, the background treatment differs per page, and there is no single place to update shared nav behaviour. The inconsistency makes intentional design choices look like bugs.

## Goal

Replace all four nav implementations with a single `<Navbar variant>` component. Three variants cover every context. All shared visual decisions (height, background, wordmark colour, sticky behaviour) live in one file.

---

## Component API

**File:** `src/components/Navbar.tsx`

```tsx
<Navbar variant="marketing" />   // home and content pages
<Navbar variant="focus" />       // /onboard and /login
<Navbar variant="app" />         // /dashboard
```

No other props required. Auth state is read internally via `useAuth()`.

---

## Shared Shell (all variants)

| Property | Value |
|---|---|
| Position | `fixed inset-x-0 top-0 z-50` |
| Height | `h-16` |
| Background | `bg-black/80 backdrop-blur supports-[backdrop-filter]:bg-black/60` |
| Border | `border-b border-neutral-800` |
| Wordmark colour | `text-amber-400 tracking-[0.35em]` — always, on every variant |
| Wordmark link | always `/` |
| Inner container | `mx-auto max-w-screen-xl px-4 sm:px-6 md:px-8 h-16 flex items-center justify-between` |

Page content on all pages gets `pt-16` to clear the fixed bar.

---

## Variant: `marketing`

Used on: `/` (and any future content/marketing pages)

**Left:** SITARA wordmark → links to `/`  
**Centre-right:** Nav links — About, Services, Contact  
**Far right (unauthenticated):** Log In (outlined) + Open Account (gold filled `#bfa76f`)  
**Far right (authenticated):** Dashboard (gold filled) + Log Out (outlined)  
**Mobile:** Hamburger collapses nav links and CTAs into a dropdown

This is the current `Header.tsx` behaviour with updated styling tokens applied. The mobile menu, auth branching, and scroll behaviour carry over unchanged.

---

## Variant: `focus`

Used on: `/onboard`, `/login`

**Left:** `← Back to site` — text link routing to `/`  
**Right:** SITARA wordmark (amber-400, links to `/`)  
**Nothing else.** No nav links, no CTAs — distraction-free conversion context.

---

## Variant: `app`

Used on: `/dashboard`

**Left:** SITARA wordmark → links to `/dashboard`, with user email in muted text (`text-neutral-500`) beside it  
**Right:** Log Out button (outlined, `border-neutral-700 text-neutral-100 hover:bg-neutral-800`)  
**No nav links** — authenticated users don't need to browse marketing pages from within the app.

---

## Migration Steps

1. Create `src/components/Navbar.tsx` with the three variants
2. Update `src/app/page.tsx` — replace `<Header />` import with `<Navbar variant="marketing" />`
3. Delete `src/components/Header.tsx`
4. Update `src/app/onboard/page.tsx` — remove inline header, add `<Navbar variant="focus" />` + `pt-16` to content wrapper
5. Update `src/app/login/page.tsx` — remove inline header, add `<Navbar variant="focus" />` + `pt-16` to content wrapper
6. Update `src/app/dashboard/page.tsx` — remove inline header, add `<Navbar variant="app" />` + `pt-16` to content wrapper

---

## Verification

- Home page: sticky glass nav present, auth-aware CTAs work, mobile hamburger works
- /onboard: focus nav shows "← Back to site" + amber wordmark, no links or CTAs, stays fixed on scroll
- /login: same as /onboard
- /dashboard: app nav shows wordmark + user email + logout, no marketing links
- Wordmark is amber-400 on every page
- No page has `pt-16` missing (content doesn't hide under fixed bar)
