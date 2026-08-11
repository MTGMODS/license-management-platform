import { geoNaturalEarth1, geoPath } from 'd3-geo'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import topology from 'world-atlas/countries-110m.json'

export const MAP_WIDTH = 960
export const MAP_HEIGHT = 460

/**
 * The 110m atlas omits microstates and small island territories, so seven
 * codes in the current payload — Singapore, Hong Kong, Seychelles, Malta,
 * Monaco, Mayotte, Andorra — have no shape and simply do not appear. Together
 * they are 0.28% of users; the 50m atlas would cover them at several times
 * the download size. See scripts/verify-map-codes.mjs.
 */

/** Names the one object the atlas exposes so `feature` resolves to a collection. */
type WorldTopology = Topology<{ countries: GeometryCollection }>

const atlas = topology as unknown as WorldTopology

const world = feature(atlas, atlas.objects.countries) as FeatureCollection<Geometry>

// Natural Earth keeps continent shapes recognisable without the extreme polar
// distortion Mercator applies, which matters when most traffic sits at high
// northern latitudes.
const projection = geoNaturalEarth1().fitSize([MAP_WIDTH, MAP_HEIGHT], world)
const pathBuilder = geoPath(projection)

export interface CountryShape {
  /** ISO 3166-1 numeric, as used by world-atlas feature ids. */
  numericId: string
  path: string
}

/**
 * Projection and path strings are computed once at module scope: they never
 * change, and rebuilding them on hover would re-project every country.
 */
export const COUNTRY_SHAPES: CountryShape[] = (world.features as Feature<Geometry>[])
  .map((item) => ({
    numericId: String(item.id ?? ''),
    path: pathBuilder(item) ?? '',
  }))
  .filter((item) => item.numericId !== '' && item.path !== '')
