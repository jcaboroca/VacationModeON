import { describe, expect, it } from 'vitest'
import { findStopDay, moveStop } from './stopOrder'

function stopsByDay() {
  return {
    d1: [
      { id: 's1', name: 'Tudela', order: 0 },
      { id: 's2', name: 'Valderredible', order: 1 },
      { id: 's3', name: 'Orbaneja', order: 2 },
    ],
    d2: [{ id: 's4', name: 'Liérganes', order: 0 }],
    d3: [],
  }
}

describe('findStopDay', () => {
  it('returns the day holding the stop', () => {
    expect(findStopDay(stopsByDay(), 's4')).toBe('d2')
  })

  it('returns null when no day holds the stop', () => {
    expect(findStopDay(stopsByDay(), 'ghost')).toBe(null)
  })
})

describe('moveStop within a day', () => {
  it('places the stop at the target index', () => {
    const result = moveStop(stopsByDay(), 's1', 'd1', 2)
    expect(result.d1.map((s) => s.id)).toEqual(['s2', 's3', 's1'])
  })

  it('renumbers order to contiguous positions', () => {
    const result = moveStop(stopsByDay(), 's3', 'd1', 0)
    expect(result.d1.map((s) => s.order)).toEqual([0, 1, 2])
    expect(result.d1[0]).toMatchObject({ id: 's3', order: 0 })
    expect(result.d1[1]).toMatchObject({ id: 's1', order: 1 })
  })

  it('leaves other days untouched', () => {
    const input = stopsByDay()
    const result = moveStop(input, 's1', 'd1', 1)
    expect(result.d2).toBe(input.d2)
  })
})

describe('moveStop across days', () => {
  it('inserts the stop at the target index of the destination day', () => {
    const result = moveStop(stopsByDay(), 's2', 'd2', 0)
    expect(result.d2.map((s) => s.id)).toEqual(['s2', 's4'])
    expect(result.d2.map((s) => s.order)).toEqual([0, 1])
  })

  it('removes the stop from the source day and renumbers it', () => {
    const result = moveStop(stopsByDay(), 's1', 'd2', 1)
    expect(result.d1.map((s) => s.id)).toEqual(['s2', 's3'])
    expect(result.d1.map((s) => s.order)).toEqual([0, 1])
  })

  it('accepts an empty destination day', () => {
    const result = moveStop(stopsByDay(), 's4', 'd3', 0)
    expect(result.d3).toEqual([{ id: 's4', name: 'Liérganes', order: 0 }])
    expect(result.d2).toEqual([])
  })

  it('appends when the target index is past the end', () => {
    const result = moveStop(stopsByDay(), 's1', 'd2', 99)
    expect(result.d2.map((s) => s.id)).toEqual(['s4', 's1'])
  })
})

describe('moveStop with stale input', () => {
  it('returns the map unchanged when the stop is gone', () => {
    const input = stopsByDay()
    expect(moveStop(input, 'ghost', 'd1', 0)).toBe(input)
  })

  it('returns the map unchanged when the destination day is gone', () => {
    const input = stopsByDay()
    expect(moveStop(input, 's1', 'gone', 0)).toBe(input)
  })
})
