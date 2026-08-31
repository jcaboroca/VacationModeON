import { describe, expect, it } from 'vitest'
import { buildGeocodeUrl, hasCoords, parseGeocodeResults } from './geo'

describe('hasCoords', () => {
  it('accepts a stop with finite coordinates', () => {
    expect(hasCoords({ lat: 42.06, lng: -1.6 })).toBe(true)
  })

  it('rejects blank coordinates', () => {
    expect(hasCoords({ lat: null, lng: null })).toBe(false)
  })

  it('rejects NaN left behind by an empty numeric field', () => {
    expect(hasCoords({ lat: Number('') || NaN, lng: 2 })).toBe(false)
  })

  it('accepts the equator and the prime meridian', () => {
    expect(hasCoords({ lat: 0, lng: 0 })).toBe(true)
  })
})

describe('buildGeocodeUrl', () => {
  it('queries Nominatim by name and caps the result count', () => {
    const url = new URL(buildGeocodeUrl('Tudela'))
    expect(url.origin + url.pathname).toBe('https://nominatim.openstreetmap.org/search')
    expect(url.searchParams.get('q')).toBe('Tudela')
    expect(url.searchParams.get('limit')).toBe('5')
  })

  it('biases results towards a nearby point', () => {
    const url = new URL(buildGeocodeUrl('Tudela', { lat: 41.33, lng: 1.93 }))
    expect(url.searchParams.get('viewbox')).toBe('0.43,42.83,3.43,39.83')
  })

  it('omits the bias when no nearby point is known', () => {
    const url = new URL(buildGeocodeUrl('Tudela'))
    expect(url.searchParams.get('viewbox')).toBe(null)
  })
})

describe('parseGeocodeResults', () => {
  const payload = [
    { place_id: 1, display_name: 'Tudela, Navarra, España', lat: '42.0621', lon: '-1.6065' },
    { place_id: 2, display_name: 'Tudela de Duero, Valladolid', lat: '41.5866', lon: '-4.5811' },
  ]

  it('normalises Nominatim strings into numeric candidates', () => {
    expect(parseGeocodeResults(payload)[0]).toEqual({
      id: '1',
      label: 'Tudela, Navarra, España',
      lat: 42.0621,
      lng: -1.6065,
    })
  })

  it('keeps every usable candidate for the picker', () => {
    expect(parseGeocodeResults(payload)).toHaveLength(2)
  })

  it('drops entries without usable coordinates', () => {
    expect(parseGeocodeResults([{ place_id: 3, display_name: 'x', lat: 'n/a', lon: '2' }])).toEqual([])
  })

  it('returns an empty list when the service answered nothing', () => {
    expect(parseGeocodeResults(undefined)).toEqual([])
  })
})
