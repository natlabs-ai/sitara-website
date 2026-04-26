// e2e/global-setup.ts
import { request } from '@playwright/test'

/** Hit each Next.js route once and retry until it compiles (non-500).
 *  Uses redirect:'manual' to avoid the /dashboard → /login → /dashboard
 *  redirect loop that occurs when auth-gated pages haven't compiled yet. */
async function warmNextJs(routes: string[]) {
  const base = 'http://localhost:3001'
  for (const route of routes) {
    let ready = false
    for (let i = 0; i < 20; i++) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 5_000)
      try {
        const res = await fetch(`${base}${route}`, {
          signal: controller.signal,
          redirect: 'manual', // 3xx = compiled (auth redirect is expected) — don't follow
        })
        clearTimeout(timer)
        if (res.status < 500) { ready = true; break }
      } catch { /* timeout or connection refused — retry */ }
      clearTimeout(timer)
      await new Promise(r => setTimeout(r, 1_000))
    }
    if (!ready) console.warn(`⚠️  Route ${route} still 500 after warm-up — tests may be slow`)
  }
}

async function globalSetup() {
  // Pre-warm Next.js routes that would otherwise trigger lazy compilation mid-test.
  // /login and /dashboard are hit by save-resume (via save-and-exit redirect) and must
  // be compiled before tests start to avoid an auth-middleware redirect loop.
  await warmNextJs(['/onboard', '/login', '/dashboard'])

  const ctx = await request.newContext({ baseURL: 'http://localhost:8000' })

  const testCheck = await ctx
    .delete('/api/v1/test/cleanup', { data: { email: 'global-setup-probe@test.com' } })
    .catch(() => null)

  await ctx.dispose()

  if (!testCheck || testCheck.status() === 404) {
    // TESTING mode is an optimization (skips Azure DI). Tests still pass without it,
    // just slower. To enable it: kill uvicorn on port 8000 and rerun — Playwright
    // will start a fresh backend with TESTING=true automatically.
    console.warn(
      '\n⚠️  Backend is running without TESTING=true — Azure DI runs for real (slower).\n' +
      'Kill uvicorn on port 8000 and rerun for fast tests.\n',
    )
  }
}

export default globalSetup
