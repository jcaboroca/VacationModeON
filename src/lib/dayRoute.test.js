import { describe, expect, it } from 'vitest'
import {
  buildDirectionsUrl,
  buildOsrmUrl,
  formatDuration,
  isRouteStale,
  parseOsrmRoute,
  routeSignature,
  routeWaypoints,
  unflattenCoords,
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

describe('routeWaypoints', () => {
  it('threads through every located stop of the day', () => {
    const full = stops()
    full.d2.push({ id: 'y', name: 'Orbaneja', lat: 42.83, lng: -3.79 })
    expect(routeWaypoints(days, full, 1).map((s) => s.id)).toEqual(['b', 'd', 'y'])
  })

  it('starts where the previous day left off', () => {
    expect(routeWaypoints(days, stops(), 1)[0].id).toBe('b')
  })

  it('drops stops without coordinates', () => {
    expect(routeWaypoints(days, stops(), 1).map((s) => s.id)).toEqual(['b', 'd'])
  })

  it('uses only its own stops when there is no previous day', () => {
    expect(routeWaypoints(days, stops(), 0).map((s) => s.id)).toEqual(['a', 'b'])
  })

  it('skips previous days that have no located stops', () => {
    const sparse = { d1: [{ id: 'a', name: 'Begues', lat: 41.33, lng: 1.93 }], d2: [], d3: stops().d3 }
    expect(routeWaypoints(days, sparse, 2)[0].id).toBe('a')
  })

  it('returns null when the day has no located stop', () => {
    expect(routeWaypoints(days, { d1: [], d2: [], d3: [] }, 2)).toBe(null)
  })

  it('returns null when a first day has a single stop', () => {
    expect(routeWaypoints(days, { d1: [{ id: 'a', lat: 41.3, lng: 1.9 }] }, 0)).toBe(null)
  })
})

describe('isRouteStale', () => {
  const waypoints = [
    { id: 'b', lat: 42.06, lng: -1.6 },
    { id: 'd', lat: 42.9, lng: -3.9 },
  ]

  it('is stale when there is no cached route', () => {
    expect(isRouteStale(null, waypoints)).toBe(true)
  })

  it('is fresh when the signature still matches', () => {
    expect(isRouteStale({ signature: routeSignature(waypoints) }, waypoints)).toBe(false)
  })

  it('is stale after a waypoint coordinate changes', () => {
    const cached = { signature: routeSignature(waypoints) }
    const moved = [waypoints[0], { id: 'd', lat: 43.0, lng: -3.9 }]
    expect(isRouteStale(cached, moved)).toBe(true)
  })

  it('is stale after an intermediate stop is inserted', () => {
    const cached = { signature: routeSignature(waypoints) }
    const longer = [waypoints[0], { id: 'z', lat: 42.6, lng: -3.1 }, waypoints[1]]
    expect(isRouteStale(cached, longer)).toBe(true)
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
        legs: [
          { distance: 41000, duration: 2400 },
          { distance: 82456, duration: 4860 },
        ],
      },
    ],
  }

  it('converts metres to one-decimal kilometres', () => {
    expect(parseOsrmRoute(payload).distanceKm).toBe(123.5)
  })

  it('converts seconds to whole minutes', () => {
    expect(parseOsrmRoute(payload).durationMin).toBe(121)
  })

  it('flattens the polyline because Firestore rejects nested arrays', () => {
    expect(parseOsrmRoute(payload).coords).toEqual([42.06, -1.6, 42.9, -3.9])
  })

  it('keeps one entry per stop-to-stop leg', () => {
    expect(parseOsrmRoute(payload).legs).toEqual([
      { distanceKm: 41, durationMin: 40 },
      { distanceKm: 82.5, durationMin: 81 },
    ])
  })

  it('returns null when the service found no route', () => {
    expect(parseOsrmRoute({ routes: [] })).toBe(null)
  })
})

describe('unflattenCoords', () => {
  it('rebuilds Leaflet lat/lng pairs', () => {
    expect(unflattenCoords([42.06, -1.6, 42.9, -3.9])).toEqual([[42.06, -1.6], [42.9, -3.9]])
  })

  it('survives a missing polyline', () => {
    expect(unflattenCoords(undefined)).toEqual([])
  })
})

describe('url builders', () => {
  const waypoints = [
    { lat: 42.06, lng: -1.6 },
    { lat: 42.64, lng: -3.1 },
    { lat: 42.9, lng: -3.9 },
  ]

  it('asks OSRM for every waypoint in lng,lat order', () => {
    expect(buildOsrmUrl(waypoints)).toBe(
      'https://router.project-osrm.org/route/v1/driving/-1.6,42.06;-3.1,42.64;-3.9,42.9?overview=simplified&geometries=geojson'
    )
  })

  it('passes intermediate stops to Google Maps as waypoints', () => {
    expect(buildDirectionsUrl(waypoints)).toBe(
      'https://www.google.com/maps/dir/?api=1&origin=42.06%2C-1.6&destination=42.9%2C-3.9&travelmode=driving&waypoints=42.64%2C-3.1'
    )
  })

  it('omits the waypoints parameter for a single leg', () => {
    expect(buildDirectionsUrl([waypoints[0], waypoints[2]])).toBe(
      'https://www.google.com/maps/dir/?api=1&origin=42.06%2C-1.6&destination=42.9%2C-3.9&travelmode=driving'
    )
  })
})
