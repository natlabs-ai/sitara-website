// e2e/fixtures/randomFile.ts
import * as fs from 'fs'
import * as path from 'path'

const LIVE_DOCS = (() => {
  const envDir = process.env.LIVE_DOCS_DIR
  if (envDir) {
    // If absolute, use as-is; if relative, resolve from sitara-website root
    return path.isAbsolute(envDir)
      ? envDir
      : path.resolve(__dirname, '..', '..', envDir)
  }
  // Default fallback: sibling repo
  return path.resolve(__dirname, '../../../kora/backend/tests/live_documents')
})()

/** Returns the absolute path to a random file in the given category folder. */
export function randomFile(category: string): string {
  const dir = path.join(LIVE_DOCS, category)
  if (!fs.existsSync(dir)) {
    throw new Error(
      `Live documents directory not found: ${dir}\n` +
      `Set LIVE_DOCS_DIR in e2e/.env.test and add files to ${dir}`
    )
  }
  const files = fs.readdirSync(dir).filter((f) =>
    /\.(pdf|jpg|jpeg|png|tiff)$/i.test(f)
  )
  if (files.length === 0) {
    throw new Error(`No supported documents in ${dir} — add at least one PDF/image.`)
  }
  return path.join(dir, files[Math.floor(Math.random() * files.length)])
}
