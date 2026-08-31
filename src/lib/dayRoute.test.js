import { describe, expect, it } from 'vitest'
import {
  buildDirectionsUrl,
  buildOsrmUrl,
  formatDuration,
  isRouteStale,
  parseOsrmRoute,
  routeEndpoints,
  routeSignature,
} from './dayRoute'

const days = [{ id: 'd1' }, { id: 'd2' }, { id: 'd3' }]

function stops() {
  return {
    d1: [
      { id: 'a', name: 'Begues', lat: 41.33, lng: 1.93 },
      { id: 'b', name: 'Tudela', lat: 42.06, lng: -1.6 },
    ],
    d2: [
      { id: 'c', name: 'Sin ubicar', lat: null, lng: null },
      { id: 'd', name: 'Valderredible', lat: 42.9, lng: -3.9 },
    ],
    d3: [{ id: 'e', name: 'Liérganes', lat: 43.35, lng: -3.72 }],
  }
}

describe('routeEndpoints', () => {
  it('chains from the previous day last located stop', () => {
    const result = routeEndpoints(days, stops(), 1)
    expect(result.from.id).toBe('b')
    expect(result.to.id).toBe('d')
  })

  it('ignores stops without coordinates when picking the destination', () => {
    const withTrailingBlank = stops()
    withTrailingBlank.d2.push({ id: 'x', name: 'Pendiente', lat: null, lng: null })
    expect(routeEndpoints(days, withTrailingBlank, 1).to.id).toBe('d')
  })

  it('falls back to first and last stop of the same day when there is no previous day', () => {
    const result = routeEndpoints(days, stops(), 0)
    expect(result.from.id).toBe('a')
    expect(result.to.id).toBe('b')
  })

  it('skips previous days that have no located stops', () => {
    const sparse = { d1: [{ id: 'a', name: 'Begues', lat: 41.33, lng: 1.93 }], d2: [], d3: stops().d3 }
    expect(routeEndpoints(days, sparse, 2).from.id).toBe('a')
  })

  it('returns null when the day has no located stop', () => {
    expect(routeEndpoints(days, { d1: [], d2: [], d3: [] }, 2)).toBe(null)
  })

  it('returns null when the only located stop is the destination itself', () => {
    expect(routeEndpoints(days, { d1: [{ id: 'a', lat: 41.3, lng: 1.9 }] }, 0)).toBe(null)
  })
})

describe('isRouteStale', () => {
  const endpoints = { from: { id: 'b', lat: 42.06, lng: -1.6 }, to: { id: 'd', lat: 42.9, lng: -3.9 } }

  it('is stale when there is no cached route', () => {
    expect(isRouteStale(null, endpoints)).toBe(true)
  })

  it('is fresh when the signature still matches', () => {
    expect(isRouteStale({ signature: routeSignature(endpoints) }, endpoints)).toBe(false)
  })

  it('is stale after an endpoint coordinate changes', () => {
    const cached = { signature: routeSignature(endpoints) }
    const moved = { ...endpoints, to: { id: 'd', lat: 43.0, lng: -3.9 } }
    expect(isRouteStale(cached, moved)).toBe(true)
  })

  it('is not stale when there is nothing to route', () => {
    expect(isRouteStale(null, null)).toBe(false)
  })
})

describe('formatDuration', () => {
  it('shows minutes under an hour', () => {
    expect(formatDuration(45)).toBe('45 min')
  })

  it('splits hours and minutes', () => {
    expect(formatDuration(135)).toBe('2 h 15 min')
  })

  it('rounds up to a whole hour instead of showing 60 minutes', () => {
    expect(formatDuration(119.6)).toBe('2 h 0 min')
  })

  it('returns a dash for unknown durations', () => {
    expect(formatDuration(null)).toBe('—')
  })
})

describe('parseOsrmRoute', () => {
  const payload = {
    routes: [
      {
        distance: 123456,
        duration: 7260,
        geometry: { coordinates: [[-1.6, 42.06], [-3.9, 42.9]] },
      },
    ],
  }

  it('converts metres to one-decimal kilometres', () => {
    expect(parseOsrmRoute(payload).distanceKm).toBe(123.5)
  })

  it('converts seconds to whole minutes', () => {
    expect(parseOsrmRoute(payload).durationMin).toBe(121)
  })

  it('flips GeoJSON lng/lat into Leaflet lat/lng', () => {
    expect(parseOsrmRoute(payload).coords).toEqual([[42.06, -1.6], [42.9, -3.9]])
  })

  it('returns null when the service found no route', () => {
    expect(parseOsrmRoute({ routes: [] })).toBe(null)
  })
})

describe('url builders', () => {
  const from = { lat: 42.06, lng: -1.6 }
  const to = { lat: 42.9, lng: -3.9 }

  it('asks OSRM for full geojson geometry in lng,lat order', () => {
    expect(buildOsrmUrl(from, to)).toBe(
      'https://router.project-osrm.org/route/v1/driving/-1.6,42.06;-3.9,42.9?overview=full&geometries=geojson'
    )
  })

  it('builds a keyless Google Maps directions link', () => {
    expect(buildDirectionsUrl(from, to)).toBe(
      'https://www.google.com/maps/dir/?api=1&origin=42.06%2C-1.6&destination=42.9%2C-3.9&travelmode=driving'
    )
  })
})
