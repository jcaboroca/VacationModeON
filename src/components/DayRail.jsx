import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { createDay, listenStops, persistStopMove } from '../lib/firestore'
import { routeEndpoints } from '../lib/dayRoute'
import { hasCoords } from '../lib/geo'
import { findStopDay, moveStop } from '../lib/stopOrder'
import DayRow from './DayRow'
import StopCard from './StopCard'

function dropTargetDay(stopsByDay, overId) {
  return overId in stopsByDay ? overId : findStopDay(stopsByDay, overId)
}

function dropIndex(stopsByDay, dayId, overId) {
  if (overId === dayId) return stopsByDay[dayId].length
  const index = stopsByDay[dayId].findIndex((stop) => stop.id === overId)
  return index < 0 ? stopsByDay[dayId].length : index
}

function sameStopIds(before = [], after = []) {
  return before.length === after.length && before.every((stop, i) => stop.id === after[i].id)
}

export default function DayRail({ tripId, days, onVisibleKmChange }) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ date: '', title: '', distanceKm: '' })
  const [stopsByDay, setStopsByDay] = useState({})
  const [activeStop, setActiveStop] = useState(null)
  const [moveError, setMoveError] = useState('')

  // Snapshots arriving mid-drag would fight the optimistic list, so they are
  // buffered here and applied once the move settles.
  const stopsRef = useRef({})
  const draggingRef = useRef(false)
  const bufferedRef = useRef({})
  const snapshotRef = useRef({})
  const originDayRef = useRef(null)

  const applyStops = useCallback((next) => {
    stopsRef.current = next
    setStopsByDay(next)
  }, [])

  const dayIdsKey = days.map((day) => day.id).join('|')

  useEffect(() => {
    const dayIds = dayIdsKey ? dayIdsKey.split('|') : []
    const known = {}
    dayIds.forEach((dayId) => {
      known[dayId] = stopsRef.current[dayId] || []
    })
    applyStops(known)

    const unsubscribes = dayIds.map((dayId) =>
      listenStops(tripId, dayId, (stops) => {
        if (draggingRef.current) {
          bufferedRef.current[dayId] = stops
          return
        }
        applyStops({ ...stopsRef.current, [dayId]: stops })
      })
    )
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe())
  }, [tripId, dayIdsKey, applyStops])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function settleDrag(stops) {
    const buffered = bufferedRef.current
    bufferedRef.current = {}
    draggingRef.current = false
    if (stops) applyStops({ ...stops, ...buffered })
  }

  function handleDragStart({ active }) {
    const dayId = findStopDay(stopsRef.current, active.id)
    if (!dayId) return
    draggingRef.current = true
    snapshotRef.current = stopsRef.current
    originDayRef.current = dayId
    setMoveError('')
    setActiveStop(stopsRef.current[dayId].find((stop) => stop.id === active.id))
  }

  function handleDragOver({ active, over }) {
    if (!over) return
    const current = stopsRef.current
    const fromDayId = findStopDay(current, active.id)
    const toDayId = dropTargetDay(current, over.id)
    if (!fromDayId || !toDayId || fromDayId === toDayId) return
    applyStops(moveStop(current, active.id, toDayId, dropIndex(current, toDayId, over.id)))
  }

  async function handleDragEnd({ active, over }) {
    setActiveStop(null)
    const before = snapshotRef.current
    const originDayId = originDayRef.current
    const current = stopsRef.current
    const toDayId = over ? dropTargetDay(current, over.id) : null

    if (!originDayId || !toDayId) {
      settleDrag(before)
      return
    }

    const next = moveStop(current, active.id, toDayId, dropIndex(current, toDayId, over.id))
    applyStops(next)

    if (originDayId === toDayId && sameStopIds(before[originDayId], next[originDayId])) {
      settleDrag(null)
      return
    }

    try {
      await persistStopMove(tripId, {
        stopId: active.id,
        fromDayId: originDayId,
        toDayId,
        sourceStops: next[originDayId],
        destinationStops: next[toDayId],
      })
      settleDrag(null)
    } catch {
      setMoveError('No se pudo guardar el nuevo orden. Se ha restaurado el anterior.')
      settleDrag(before)
    }
  }

  function handleDragCancel() {
    setActiveStop(null)
    settleDrag(snapshotRef.current)
  }

  let running = 0
  let anchor = null
  const rows = days.map((day, index) => {
    const cumulativeKm = running
    running += Number(day.distanceKm) || 0
    const located = (stopsByDay[day.id] || []).filter(hasCoords)
    const near = located[located.length - 1] || anchor
    if (located.length) anchor = located[located.length - 1]
    return { day, cumulativeKm, near, endpoints: routeEndpoints(days, stopsByDay, index) }
  })

  async function submit(e) {
    e.preventDefault()
    await createDay(tripId, {
      date: form.date,
      title: form.title,
      routeFrom: '',
      routeTo: '',
      distanceKm: Number(form.distanceKm) || 0,
      notes: '',
      order: days.length,
    })
    setForm({ date: '', title: '', distanceKm: '' })
    setAdding(false)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="day-rail">
        {moveError ? (
          <p className="drag-error" role="alert">
            {moveError}
          </p>
        ) : null}

        {rows.map(({ day, cumulativeKm, endpoints, near }) => (
          <DayRow
            key={day.id}
            tripId={tripId}
            day={day}
            stops={stopsByDay[day.id] || []}
            endpoints={endpoints}
            near={near}
            cumulativeKm={cumulativeKm}
            onVisible={onVisibleKmChange}
          />
        ))}

        {adding ? (
          <form className="day-row-new" onSubmit={submit}>
            <input
              className="field"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
            <input
              className="field"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ruta (ej: Tudela → Valderredible)"
              required
            />
            <input
              className="field"
              type="number"
              value={form.distanceKm}
              onChange={(e) => setForm({ ...form, distanceKm: e.target.value })}
              placeholder="Km del tramo"
            />
            <div className="stop-card-actions">
              <button type="button" className="btn-ghost" onClick={() => setAdding(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary">
                Añadir día
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className="btn-ghost add-day-toggle" onClick={() => setAdding(true)}>
            + Añadir día
          </button>
        )}
      </div>

      <DragOverlay>
        {activeStop ? (
          <StopCard
            tripId={tripId}
            dayId={originDayRef.current}
            stop={activeStop}
            dragHandleProps={{}}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
