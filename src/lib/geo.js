/**
 * Geocoding helpers built on Nominatim (OpenStreetMap). Free and keyless, but
 * meant for low volumes: callers must geocode on save, never in a loop.
 */

const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search'
const BIAS_DEGREES = 1.5

export function hasCoords(stop) {
  return Number.isFinite(stop?.lat) && Number.isFinite(stop?.lng)
}

/**
 * @param {string} name free-text place name
 * @param {{ lat: number, lng: number }} [near] nearby point used to prefer,
 *   not restrict, results in the same area
 */
export function buildGeocodeUrl(name, near) {
  const params = new URLSearchParams({ q: name, format: 'jsonv2', limit: '5' })
  if (hasCoords(near)) {
    const edge = (value) => Number(value.toFixed(4))
    params.set(
      'viewbox',
      [
        edge(near.lng - BIAS_DEGREES),
        edge(near.lat + BIAS_DEGREES),
        edge(near.lng + BIAS_DEGREES),
        edge(near.lat - BIAS_DEGREES),
      ].join(',')
    )
  }
  return `${NOMINATIM_SEARCH}?${params}`
}

export function parseGeocodeResults(results) {
  return (Array.isArray(results) ? results : [])
    .map((result) => ({
      id: String(result.place_id),
      label: result.display_name,
      lat: Number(result.lat),
      lng: Number(result.lon),
    }))
    .filter(hasCoords)
}

export async function searchPlaces(name, near) {
  const response = await fetch(buildGeocodeUrl(name, near))
  if (!response.ok) throw new Error(`Geocoding failed with ${response.status}`)
  return parseGeocodeResults(await response.json())
}
