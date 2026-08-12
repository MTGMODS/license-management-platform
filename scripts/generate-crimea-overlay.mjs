/**
 * Projects Crimea + Sevastopol (Highcharts ua-all admin-1) onto the same canvas
 * as world-atlas/countries-110m and prints paths for crimeaOverlay.ts.
 *
 * Usage: node scripts/generate-crimea-overlay.mjs
 */
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { writeFileSync } from 'node:fs'
import { feature } from 'topojson-client'
import topology from 'world-atlas/countries-110m.json'

const UA_TOPO_URL = 'https://code.highcharts.com/mapdata/countries/ua/ua-all.topo.json'
const MAP_WIDTH = 960
const MAP_HEIGHT = 460

const response = await fetch(UA_TOPO_URL)
if (!response.ok) {
  throw new Error(`Failed to fetch ${UA_TOPO_URL}: ${response.status}`)
}

const uaTopo = await response.json()
const world = feature(topology, topology.objects.countries)
const projection = geoNaturalEarth1().fitSize([MAP_WIDTH, MAP_HEIGHT], world)
const pathBuilder = geoPath(projection)
const fc = feature(uaTopo, uaTopo.objects.default)
const names = new Set(['Crimea', 'Sevastopol'])

const paths = fc.features
  .filter((item) => names.has(item.properties.name))
  .map((item) => pathBuilder(item))
  .filter(Boolean)

const body = paths.map((path) => `  '${path}',`).join('\n')

console.log(`export const CRIMEA_OVERLAY_PATHS = [\n${body}\n] as const\n`)

writeFileSync('scripts/_tmp-crimea-paths.json', JSON.stringify(paths, null, 2))
