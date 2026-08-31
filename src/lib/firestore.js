import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'
import { buildTripDuplicate, computeTotalKm } from './tripMath'

// ---- Trips ----------------------------------------------------------

export function listenTrips(callback) {
  const q = query(collection(db, 'trips'), orderBy('startDate', 'desc'))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

export function listenTrip(tripId, callback) {
  return onSnapshot(doc(db, 'trips', tripId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null)
  })
}

export async function createTrip(data) {
  const ref = await addDoc(collection(db, 'trips'), {
    ...data,
    status: data.status || 'planning',
    totalKm: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateTrip(tripId, data) {
  await updateDoc(doc(db, 'trips', tripId), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteTrip(tripId) {
  const daysSnap = await getDocs(collection(db, 'trips', tripId, 'days'))
  for (const dayDoc of daysSnap.docs) {
    await deleteDayCascade(tripId, dayDoc.id)
  }
  const itemsSnap = await getDocs(collection(db, 'trips', tripId, 'packingList'))
  await Promise.all(itemsSnap.docs.map((d) => deleteDoc(d.ref)))
  await deleteDoc(doc(db, 'trips', tripId))
}

// ---- Days -------------------------------------------------------------

export function listenDays(tripId, callback) {
  const q = query(collection(db, 'trips', tripId, 'days'), orderBy('order', 'asc'))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

export async function createDay(tripId, data) {
  const ref = await addDoc(collection(db, 'trips', tripId, 'days'), data)
  await recomputeTotalKm(tripId)
  return ref.id
}

export async function updateDay(tripId, dayId, data) {
  await updateDoc(doc(db, 'trips', tripId, 'days', dayId), data)
  if ('distanceKm' in data) await recomputeTotalKm(tripId)
}

async function deleteDayCascade(tripId, dayId) {
  const stopsSnap = await getDocs(collection(db, 'trips', tripId, 'days', dayId, 'stops'))
  await Promise.all(stopsSnap.docs.map((d) => deleteDoc(d.ref)))
  const journalSnap = await getDocs(collection(db, 'trips', tripId, 'days', dayId, 'journal'))
  await Promise.all(journalSnap.docs.map((d) => deleteDoc(d.ref)))
  await deleteDoc(doc(db, 'trips', tripId, 'days', dayId))
}

export async function deleteDay(tripId, dayId) {
  await deleteDayCascade(tripId, dayId)
  await recomputeTotalKm(tripId)
}

async function recomputeTotalKm(tripId) {
  const daysSnap = await getDocs(collection(db, 'trips', tripId, 'days'))
  const totalKm = computeTotalKm(daysSnap.docs.map((d) => d.data()))
  await updateDoc(doc(db, 'trips', tripId), { totalKm, updatedAt: serverTimestamp() })
}

// ---- Stops --------------------------------------------------------------

export function listenStops(tripId, dayId, callback) {
  const q = query(collection(db, 'trips', tripId, 'days', dayId, 'stops'), orderBy('order', 'asc'))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

export async function createStop(tripId, dayId, data) {
  const ref = await addDoc(collection(db, 'trips', tripId, 'days', dayId, 'stops'), {
    bortle: null,
    altitude: null,
    tags: [],
    notes: '',
    ...data,
  })
  return ref.id
}

export async function updateStop(tripId, dayId, stopId, data) {
  await updateDoc(doc(db, 'trips', tripId, 'days', dayId, 'stops', stopId), data)
}

export async function deleteStop(tripId, dayId, stopId) {
  await deleteDoc(doc(db, 'trips', tripId, 'days', dayId, 'stops', stopId))
}

function stopRef(tripId, dayId, stopId) {
  return doc(db, 'trips', tripId, 'days', dayId, 'stops', stopId)
}

/**
 * Persists a drag-and-drop move in one batch: renumbers `order` in every day
 * involved and, when the stop changes day, recreates it (same id) under the
 * destination and drags its journal entries along.
 */
export async function persistStopMove(
  tripId,
  { stopId, fromDayId, toDayId, sourceStops, destinationStops }
) {
  const batch = writeBatch(db)

  if (fromDayId === toDayId) {
    destinationStops.forEach((stop, index) => {
      batch.update(stopRef(tripId, toDayId, stop.id), { order: index })
    })
    await batch.commit()
    return
  }

  const { id: _movedId, ...movedData } = destinationStops.find((stop) => stop.id === stopId)
  const linkedJournal = await getDocs(
    query(
      collection(db, 'trips', tripId, 'days', fromDayId, 'journal'),
      where('stopId', '==', stopId)
    )
  )

  batch.set(stopRef(tripId, toDayId, stopId), movedData)
  batch.delete(stopRef(tripId, fromDayId, stopId))

  destinationStops.forEach((stop, index) => {
    if (stop.id !== stopId) batch.update(stopRef(tripId, toDayId, stop.id), { order: index })
  })
  sourceStops.forEach((stop, index) => {
    batch.update(stopRef(tripId, fromDayId, stop.id), { order: index })
  })

  linkedJournal.docs.forEach((entry) => {
    batch.set(doc(db, 'trips', tripId, 'days', toDayId, 'journal', entry.id), entry.data())
    batch.delete(entry.ref)
  })

  await batch.commit()
}

// ---- Journal --------------------------------------------------------------

export function listenJournal(tripId, dayId, callback) {
  const q = query(collection(db, 'trips', tripId, 'days', dayId, 'journal'), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

// Text-only for now — photo uploads need Firebase Storage, which requires
// the Blaze plan. Add photoUrls back here if the project upgrades later.
export async function createJournalEntry(tripId, dayId, { text, stopId }) {
  const entryRef = await addDoc(collection(db, 'trips', tripId, 'days', dayId, 'journal'), {
    text: text || '',
    stopId: stopId || null,
    createdAt: serverTimestamp(),
  })
  return entryRef.id
}

export async function deleteJournalEntry(tripId, dayId, entry) {
  await deleteDoc(doc(db, 'trips', tripId, 'days', dayId, 'journal', entry.id))
}

// ---- Packing list -----------------------------------------------------

export function listenPackingList(tripId, callback) {
  const q = query(collection(db, 'trips', tripId, 'packingList'), orderBy('category', 'asc'))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

export async function createPackingItem(tripId, data) {
  await addDoc(collection(db, 'trips', tripId, 'packingList'), { checked: false, ...data })
}

export async function updatePackingItem(tripId, itemId, data) {
  await updateDoc(doc(db, 'trips', tripId, 'packingList', itemId), data)
}

export async function deletePackingItem(tripId, itemId) {
  await deleteDoc(doc(db, 'trips', tripId, 'packingList', itemId))
}

// ---- Duplicate ----------------------------------------------------------

export async function duplicateTrip(tripId, newName) {
  const tripSnap = await getDoc(doc(db, 'trips', tripId))
  if (!tripSnap.exists()) throw new Error('Trip not found')
  const trip = tripSnap.data()

  const daysSnap = await getDocs(
    query(collection(db, 'trips', tripId, 'days'), orderBy('order', 'asc'))
  )
  const days = []
  for (const dayDoc of daysSnap.docs) {
    const stopsSnap = await getDocs(
      query(collection(db, 'trips', tripId, 'days', dayDoc.id, 'stops'), orderBy('order', 'asc'))
    )
    days.push({ ...dayDoc.data(), stops: stopsSnap.docs.map((s) => s.data()) })
  }

  const { trip: newTrip, days: newDays } = buildTripDuplicate(trip, days, newName)

  const newTripId = await createTrip(newTrip)
  for (const day of newDays) {
    const { stops, ...dayData } = day
    const newDayId = await createDay(newTripId, dayData)
    for (const stop of stops) {
      await createStop(newTripId, newDayId, stop)
    }
  }
  return newTripId
}
