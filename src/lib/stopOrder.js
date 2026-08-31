/**
 * Pure stop-ordering logic for the day rail's drag-and-drop. Kept free of
 * React and Firestore so the reorder/move rules are unit testable.
 */

function renumber(stops) {
  return stops.map((stop, index) => (stop.order === index ? stop : { ...stop, order: index }))
}

/**
 * @param {Record<string, Array<{ id: string }>>} stopsByDay
 * @param {string} stopId
 * @returns {string|null} the day id holding the stop, or null
 */
export function findStopDay(stopsByDay, stopId) {
  for (const [dayId, stops] of Object.entries(stopsByDay)) {
    if (stops.some((stop) => stop.id === stopId)) return dayId
  }
  return null
}

/**
 * Moves a stop to `toIndex` of `toDayId`, renumbering `order` on every day it
 * touches. Returns the input untouched when the stop or destination day is no
 * longer present, which happens when a Firestore snapshot lands mid-drag.
 * @param {Record<string, Array<{ id: string, order: number }>>} stopsByDay
 * @param {string} stopId
 * @param {string} toDayId
 * @param {number} toIndex
 */
export function moveStop(stopsByDay, stopId, toDayId, toIndex) {
  const fromDayId = findStopDay(stopsByDay, stopId)
  if (fromDayId === null || !(toDayId in stopsByDay)) return stopsByDay

  const fromStops = [...stopsByDay[fromDayId]]
  const [stop] = fromStops.splice(
    fromStops.findIndex((candidate) => candidate.id === stopId),
    1
  )

  if (fromDayId === toDayId) {
    fromStops.splice(clampIndex(toIndex, fromStops.length), 0, stop)
    return { ...stopsByDay, [fromDayId]: renumber(fromStops) }
  }

  const toStops = [...stopsByDay[toDayId]]
  toStops.splice(clampIndex(toIndex, toStops.length), 0, stop)
  return {
    ...stopsByDay,
    [fromDayId]: renumber(fromStops),
    [toDayId]: renumber(toStops),
  }
}

function clampIndex(index, max) {
  if (!Number.isInteger(index) || index < 0) return max
  return Math.min(index, max)
}
