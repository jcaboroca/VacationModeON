/**
 * Per-day driving route: which stops it threads through, how it is cached, and
 * the keyless URLs used to route it (OSRM) and hand it over to Google Maps.
 */
import { hasCoords } from './geo'

function locatedStops(stops) {
  return (stops || []).filter(hasCoords)
}

/**
 * Every located stop of `days[index]`, in order, preceded by where the trip
 * slept (the previous day's last located stop) so the legs chain together.
 * @returns {object[]|null} at least two stops, or null when there is nothing to route
 */
export function routeWaypoints(days, stopsByDay, index) {
  const own = locatedStops(stopsByDay[days[index].id])
  if (!own.length) return null

  for (let i = index - 1; i >= 0; i -= 1) {
    const previous = locatedStops(stopsByDay[days[i].id])
    const start = previous[previous.length - 1]
    if (start) return [start, ...own]
  }

  return own.length > 1 ? own : null
}

export function routeSignature(waypoints) {
  return waypoints.map((stop) => `${stop.id}:${stop.lat},${stop.lng}`).join('>')
}

export function isRouteStale(route, waypoints) {
  if (!waypoints) return false
  return !route || route.signature !== routeSignature(waypoints)
}

export function formatDuration(minutes) {
  if (!Number.isFinite(minutes) || minutes < 0) return '—'
  const total = Math.round(minutes)
  const hours = Math.floor(total / 60)
  return hours ? `${hours} h ${total % 60} min` : `${total} min`
}

// `simplified` keeps the polyline near 30 points instead of ~8000: this cache
// lives inside the day document and travels on every snapshot.
export function buildOsrmUrl(waypoints) {
  const path = waypoints.map((stop) => `${stop.lng},${stop.lat}`).join(';')
  return `https://router.project-osrm.org/route/v1/driving/${path}?overview=simplified&geometries=geojson`
}

function toKm(metres) {
  return Math.round(metres / 100) / 10
}

export function parseOsrmRoute(payload) {
  const route = payload?.routes?.[0]
  if (!route) return null
  return {
    distanceKm: toKm(route.distance),
    durationMin: Math.round(route.duration / 60),
    // Firestore rejects nested arrays, so the polyline is stored flat.
    coords: (route.geometry?.coordinates || []).flatMap(([lng, lat]) => [lat, lng]),
    legs: (route.legs || []).map((leg) => ({
      distanceKm: toKm(leg.distance),
      durationMin: Math.round(leg.duration / 60),
    })),
  }
}

export function unflattenCoords(flat) {
  const pairs = []
  for (let i = 0; i + 1 < (flat?.length || 0); i += 2) pairs.push([flat[i], flat[i + 1]])
  return pairs
}

export function buildDirectionsUrl(waypoints) {
  const last = waypoints[waypoints.length - 1]
  const params = new URLSearchParams({
    api: '1',
    origin: `${waypoints[0].lat},${waypoints[0].lng}`,
    destination: `${last.lat},${last.lng}`,
    travelmode: 'driving',
  })
  const middle = waypoints.slice(1, -1)
  if (middle.length) {
    params.set('waypoints', middle.map((stop) => `${stop.lat},${stop.lng}`).join('|'))
  }
  return `https://www.google.com/maps/dir/?${params}`
}

export async function fetchRoute(waypoints) {
  const response = await fetch(buildOsrmUrl(waypoints))
  if (!response.ok) throw new Error(`Routing failed with ${response.status}`)
  return parseOsrmRoute(await response.json())
}
