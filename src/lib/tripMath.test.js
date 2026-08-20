import { describe, expect, it } from 'vitest'
import { buildTripDuplicate, computeTotalKm } from './tripMath'

describe('computeTotalKm', () => {
  it('sums distanceKm across days', () => {
    expect(computeTotalKm([{ distanceKm: 400 }, { distanceKm: 120 }])).toBe(520)
  })

  it('treats missing or non-numeric distanceKm as 0', () => {
    expect(computeTotalKm([{ distanceKm: 100 }, {}, { distanceKm: 'x' }])).toBe(100)
  })

  it('returns 0 for an empty trip', () => {
    expect(computeTotalKm([])).toBe(0)
  })
})

describe('buildTripDuplicate', () => {
  const trip = {
    name: 'Cantabria 2026',
    startDate: '2026-09-04',
    endDate: '2026-09-13',
    origin: 'Begues',
    vehicle: 'Furgoneta Camper',
    status: 'done',
  }

  const days = [
    {
      date: '2026-09-04',
      order: 0,
      title: 'Begues -> Tudela',
      routeFrom: 'Begues',
      routeTo: 'Tudela',
      distanceKm: 400,
      notes: '',
      stops: [
        {
          name: 'Área de Tudela',
          type: 'free_camp',
          lat: 42.0625,
          lng: -1.6038,
          bortle: null,
          altitude: null,
          notes: '',
          tags: ['riggs'],
          order: 0,
        },
      ],
    },
  ]

  it('resets status to planning and recomputes totalKm', () => {
    const result = buildTripDuplicate(trip, days, 'Cantabria 2027')
    expect(result.trip.status).toBe('planning')
    expect(result.trip.totalKm).toBe(400)
    expect(result.trip.name).toBe('Cantabria 2027')
  })

  it('carries over days and stops without ids', () => {
    const result = buildTripDuplicate(trip, days, 'Cantabria 2027')
    expect(result.days).toHaveLength(1)
    expect(result.days[0].stops[0].name).toBe('Área de Tudela')
    expect(result.days[0]).not.toHaveProperty('id')
    expect(result.days[0].stops[0]).not.toHaveProperty('id')
  })

  it('defaults a stop with no tags to an empty array', () => {
    const dayWithBareStop = [{ ...days[0], stops: [{ name: 'x', type: 'poi', lat: 0, lng: 0 }] }]
    const result = buildTripDuplicate(trip, dayWithBareStop, 'x')
    expect(result.days[0].stops[0].tags).toEqual([])
  })
})
