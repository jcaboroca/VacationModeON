/**
 * Per-day driving leg: which stops it connects, how it is cached, and the
 * keyless URLs used to route it (OSRM) and hand it over to Google Maps.
 */
import { hasCoords } from './geo'

function locatedStops(stops) {
  return (stops || []).filter(hasCoords)
}

/**
 * The leg of `days[index]`: from where the trip slept last (the previous day's
 * last located stop) to that day's last located stop. The first day, having no
 * previous one, falls back to its own first and last located stops.
 * @returns {{ from: object, to: object }|null}
 */
export function routeEndpoints(days, stopsByDay, index) {
  const own = locatedStops(stopsByDay[days[index].id])
  const to = own[own.length - 1]
  if (!to) return null

  for (let i = index - 1; i >= 0; i -= 1) {
    const previous = locatedStops(stopsByDay[days[i].id])
    const from = previous[previous.length - 1]
    if (from) return { from, to }
  }

  const from = own[0]
  return from && from.id !== to.id ? { from, to } : null
}

export function routeSignature({ from, to }) {
  return `${from.id}:${from.lat},${from.lng}>${to.id}:${to.lat},${to.lng}`
}

export function isRouteStale(route, endpoints) {
  if (!endpoints) return false
  return !route || route.signature !== routeSignature(endpoints)
}

export function formatDuration(minutes) {
  if (!Number.isFinite(minutes) || minutes < 0) return '—'
  const total = Math.round(minutes)
  const hours = Math.floor(total / 60)
  return hours ? `${hours} h ${total % 60} min` : `${total} min`
}

export function buildOsrmUrl(from, to) {
  return `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`
}

export function parseOsrmRoute(payload) {
  const route = payload?.routes?.[0]
  if (!route) return null
  return {
    distanceKm: Math.round(route.distance / 100) / 10,
    durationMin: Math.round(route.duration / 60),
    coords: (route.geometry?.coordinates || []).map(([lng, lat]) => [lat, lng]),
  }
}

export function buildDirectionsUrl(from, to) {
  const params = new URLSearchParams({
    api: '1',
    origin: `${from.lat},${from.lng}`,
    destination: `${to.lat},${to.lng}`,
    travelmode: 'driving',
  })
  return `https://www.google.com/maps/dir/?${params}`
}

export async function fetchRoute(from, to) {
  const response = await fetch(buildOsrmUrl(from, to))
  if (!response.ok) throw new Error(`Routing failed with ${response.status}`)
  return parseOsrmRoute(await response.json())
}
