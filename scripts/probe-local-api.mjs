/**
 * Probe local backend endpoints and print response shapes (not full payloads).
 * Tokens are read from a file outside the repo.
 *
 * Usage: node scripts/probe-local-api.mjs
 */
import { readFileSync } from 'node:fs'

const tokens = JSON.parse(readFileSync('C:/Users/bogda/mtg_dev_token.json', 'utf8'))

const SERVICES = {
  user: 'http://127.0.0.1:8001/api/v1/users',
  license: 'http://127.0.0.1:8002/api/v1/license',
  usage: 'http://127.0.0.1:8003/api/v1/usage',
  distribution: 'http://127.0.0.1:8005/api/v1/files',
}

function describe(value, path = '', depth = 0, out = []) {
  if (depth > 4) return out
  if (Array.isArray(value)) {
    out.push(`${path}: array[${value.length}]`)
    if (value.length > 0) describe(value[0], `${path}[0]`, depth + 1, out)
    return out
  }
  if (value === null) {
    out.push(`${path}: null`)
    return out
  }
  if (typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      const next = path ? `${path}.${key}` : key
      if (child !== null && typeof child === 'object') describe(child, next, depth + 1, out)
      else {
        const sample = typeof child === 'string' ? JSON.stringify(child) : String(child)
        out.push(`${next}: ${typeof child} = ${sample.slice(0, 80)}`)
      }
    }
    return out
  }
  out.push(`${path}: ${typeof value}`)
  return out
}

async function probe(label, url, opts = {}) {
  const headers = { ...(opts.headers || {}) }
  if (opts.auth) headers.Authorization = `Bearer ${tokens.access_token}`

  console.log(`\n=== ${label} ===`)
  console.log(url)

  try {
    const res = await fetch(url, { ...opts, headers })
    const text = await res.text()
    console.log(`status: ${res.status}`)

    if (!text) {
      console.log('(empty body)')
      return
    }

    try {
      const json = JSON.parse(text)
      console.log(describe(json).join('\n'))
      // Also dump small authenticated payloads in full — they are the contracts
      // we need to type against, and they contain no secrets beyond what we
      // already hold.
      if (opts.dump && text.length < 4000) {
        console.log('--- full ---')
        console.log(JSON.stringify(json, null, 2))
      }
    } catch {
      console.log(`body (non-json, ${text.length} chars): ${text.slice(0, 200)}`)
    }
  } catch (err) {
    console.log(`FAILED: ${err.message}`)
  }
}

await probe('GET /users/me', `${SERVICES.user}/me`, { auth: true, dump: true })
await probe('POST /users/auth/refresh', `${SERVICES.user}/auth/refresh`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refresh_token: tokens.refresh_token }),
  dump: true,
})
await probe('GET /license/info', `${SERVICES.license}/info`, { auth: true, dump: true })
await probe('GET /license/stats/public', `${SERVICES.license}/stats/public`, { dump: true })
await probe('GET /usage/stats/public', `${SERVICES.usage}/stats/public`)
await probe('POST /license/activate (bad key)', `${SERVICES.license}/activate`, {
  method: 'POST',
  auth: true,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: 'AAAA-BBBB-CCCC-DDDD' }),
  dump: true,
})
await probe('POST /license/download', `${SERVICES.license}/download`, {
  method: 'POST',
  auth: true,
  dump: true,
})
