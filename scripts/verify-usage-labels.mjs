/**
 * Checks that every id the usage payload can return has a human label.
 *
 * These joins fail silently: an unmapped country vanishes from the map, an
 * unmapped server renders as "Сервер 25" beside real names, and an unmapped
 * faction shows a bare code. All three look plausible enough to ship.
 *
 * Usage: node scripts/verify-usage-labels.mjs <payload.json|payload.md>
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const isoCountries = require('i18n-iso-countries')
const atlas = require('world-atlas/countries-110m.json')

const raw = readFileSync(process.argv[2], 'utf8')
const payload = JSON.parse(raw.slice(raw.indexOf('{')))

let failures = 0
const report = (label, missing, total) => {
  const ok = missing.length === 0
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: ${total - missing.length}/${total}`)
  if (!ok) console.log(`      missing: ${missing.join(', ')}`)
}

// --- servers -----------------------------------------------------------
const serversSource = readFileSync('src/shared/config/servers.ts', 'utf8')
const knownServerIds = new Set(
  [...serversSource.matchAll(/^\s{2}(\d+):\s*'/gm)].map((match) => Number(match[1])),
)
// Id 0 is the helper's "not detected" bucket and is labelled separately.
knownServerIds.add(0)

const payloadServers = payload.distribution.servers.map((s) => s.server)
report(
  'servers named',
  payloadServers.filter((id) => !knownServerIds.has(id)),
  payloadServers.length,
)

// --- factions ----------------------------------------------------------
const namesSource = JSON.parse(readFileSync('src/i18n/locales/ru/helper.json', 'utf8'))
const knownFactions = new Set(Object.keys(namesSource.analytics.factionName))
const payloadFactions = Object.keys(payload.distribution.factions)
report(
  'factions named',
  payloadFactions.filter((code) => !knownFactions.has(code)),
  payloadFactions.length,
)

// --- countries ---------------------------------------------------------
const shapeIds = new Set(atlas.objects.countries.geometries.map((g) => String(g.id)))
const realCountries = payload.distribution.countries.filter((c) => c.code !== 'UNKNOWN')
const unmapped = realCountries.filter(
  (c) => !shapeIds.has(String(isoCountries.alpha2ToNumeric(c.code))),
)

// Microstates absent from the low-resolution atlas are expected, so this one
// is reported as coverage rather than pass/fail.
const totalUsers = realCountries.reduce((sum, c) => sum + c.users.all_time, 0)
const lostUsers = unmapped.reduce((sum, c) => sum + c.users.all_time, 0)
console.log(
  `INFO  countries on map: ${realCountries.length - unmapped.length}/${realCountries.length}` +
    ` (${(100 - (lostUsers / totalUsers) * 100).toFixed(2)}% of users)`,
)
if (unmapped.length > 0) {
  console.log(`      no shape: ${unmapped.map((c) => c.code).join(', ')}`)
}

process.exit(failures > 0 ? 1 : 0)
