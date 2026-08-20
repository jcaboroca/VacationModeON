/**
 * Pure, framework-free trip calculations. Kept isolated from Firestore so
 * they're trivial to unit test without any backend/emulator.
 */

/**
 * Sums distanceKm across a trip's days. Missing/non-numeric values count as 0
 * so a day still being edited doesn't crash the total.
 * @param {Array<{ distanceKm?: number }>} days
 * @returns {number}
 */
export function computeTotalKm(days) {
  return days.reduce((sum, day) => {
    const km = Number(day?.distanceKm)
    return sum + (Number.isFinite(km) ? km : 0)
  }, 0)
}

/**
 * Builds the document set for duplicating a trip as a new one: same days
 * and stops, reset status/journal, no ids (caller assigns fresh Firestore
 * ids on write). Does not touch packingList — a duplicated trip starts
 * with an empty list since gear needs differ per trip.
 * @param {object} trip
 * @param {Array<object>} days - each with a `stops` array attached
 * @param {string} newName
 * @returns {{ trip: object, days: Array<object> }}
 */
export function buildTripDuplicate(trip, days, newName) {
  const duplicatedTrip = {
    name: newName,
    startDate: trip.startDate,
    endDate: trip.endDate,
    origin: trip.origin,
    vehicle: trip.vehicle,
    status: 'planning',
    totalKm: computeTotalKm(days),
  }

  const duplicatedDays = days.map((day) => ({
    date: day.date,
    order: day.order,
    title: day.title,
    routeFrom: day.routeFrom,
    routeTo: day.routeTo,
    distanceKm: day.distanceKm,
    notes: day.notes,
    stops: (day.stops || []).map((stop) => ({
      name: stop.name,
      type: stop.type,
      lat: stop.lat,
      lng: stop.lng,
      bortle: stop.bortle ?? null,
      altitude: stop.altitude ?? null,
      notes: stop.notes,
      tags: stop.tags || [],
      order: stop.order,
    })),
  }))

  return { trip: duplicatedTrip, days: duplicatedDays }
}
