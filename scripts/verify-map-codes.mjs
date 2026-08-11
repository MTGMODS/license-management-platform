/**
 * Confirms every country in the usage payload resolves to a shape in the
 * world atlas. A silent mismatch renders a fully grey map with no error, so
 * this is checked explicitly rather than by eye.
 *
 * Usage: node scripts/verify-map-codes.mjs <payload.json|payload.md>
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const countries = require('i18n-iso-countries')
const atlas = require('world-atlas/countries-110m.json')

const raw = readFileSync(process.argv[2], 'utf8')
const payload = JSON.parse(raw.slice(raw.indexOf('{')))

const shapeIds = new Set(atlas.objects.countries.geometries.map((g) => String(g.id)))
const rows = payload.distribution.countries

const unmapped = []
const missingShape = []
let matched = 0

for (const row of rows) {
  if (row.code === 'UNKNOWN') continue

  const numeric = countries.alpha2ToNumeric(row.code)
  if (!numeric) {
    unmapped.push(row.code)
    continue
  }
  if (!shapeIds.has(String(numeric))) {
    missingShape.push(`${row.code}->${numeric} (${row.users.all_time} users)`)
    continue
  }
  matched += 1
}

console.log('atlas shapes:', shapeIds.size)
console.log('payload countries:', rows.length)
console.log('matched to a shape:', matched)
console.log('no numeric code:', unmapped.length ? unmapped.join(', ') : 'none')
console.log('numeric with no shape:', missingShape.length ? missingShape.join(', ') : 'none')

const covered = rows
  .filter((r) => r.code !== 'UNKNOWN')
  .reduce((sum, r) => sum + r.users.all_time, 0)
const shown = rows
  .filter((r) => r.code !== 'UNKNOWN' && shapeIds.has(String(countries.alpha2ToNumeric(r.code))))
  .reduce((sum, r) => sum + r.users.all_time, 0)

console.log('users represented on map:', ((shown / covered) * 100).toFixed(2) + '%')
