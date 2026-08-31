import { useEffect, useRef, useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { deleteDay, updateDay } from '../lib/firestore'
import AddStopForm from './AddStopForm'
import DayRouteCard from './DayRouteCard'
import SortableStopCard from './SortableStopCard'

export default function DayRow({ tripId, day, stops, waypoints, near, cumulativeKm, onVisible }) {
  const [editingDay, setEditingDay] = useState(false)
  const [form, setForm] = useState({
    title: day.title || '',
    distanceKm: day.distanceKm ?? '',
    notes: day.notes || '',
  })
  const rowRef = useRef(null)
  const { setNodeRef, isOver } = useDroppable({ id: day.id })

  useEffect(() => {
    if (!onVisible || !rowRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onVisible(cumulativeKm)
      },
      { rootMargin: '-40% 0px -50% 0px' }
    )
    observer.observe(rowRef.current)
    return () => observer.disconnect()
  }, [cumulativeKm, onVisible])

  async function saveDay(e) {
    e.preventDefault()
    await updateDay(tripId, day.id, {
      title: form.title,
      distanceKm: Number(form.distanceKm) || 0,
      notes: form.notes,
    })
    setEditingDay(false)
  }

  async function removeDay() {
    if (confirm(`¿Borrar el día "${day.title}" y todas sus paradas?`)) {
      await deleteDay(tripId, day.id)
    }
  }

  return (
    <div className="day-row" ref={rowRef}>
      <div className="rail">
        <div className="rail-line" />
        <div className="rail-dot" />
        <div className="rail-km">{Math.round(cumulativeKm)} KM</div>
      </div>

      <div className="day-content">
        {editingDay ? (
          <form className="day-head-edit" onSubmit={saveDay}>
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
            <textarea
              className="field"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notas del día"
              rows={2}
            />
            <div className="stop-card-actions">
              <button type="button" className="btn-ghost" onClick={() => setEditingDay(false)}>
                Cancelar
              </button>
              <button type="button" className="btn-ghost btn-danger" onClick={removeDay}>
                Borrar día
              </button>
              <button type="submit" className="btn-primary">
                Guardar
              </button>
            </div>
          </form>
        ) : (
          <div className="day-head" onClick={() => setEditingDay(true)}>
            <span className="day-date">{day.date}</span>
            <span className="day-title">{day.title || 'Sin título — toca para editar'}</span>
          </div>
        )}

        <div className="day-body">
          <div className={isOver ? 'day-stops is-drop-target' : 'day-stops'} ref={setNodeRef}>
            <SortableContext
              items={stops.map((stop) => stop.id)}
              strategy={verticalListSortingStrategy}
            >
              {stops.map((stop) => (
                <SortableStopCard
                  key={stop.id}
                  tripId={tripId}
                  dayId={day.id}
                  stop={stop}
                  near={near}
                />
              ))}
            </SortableContext>
            <AddStopForm tripId={tripId} dayId={day.id} nextOrder={stops.length} />
          </div>

          <DayRouteCard tripId={tripId} day={day} waypoints={waypoints} />
        </div>
      </div>
    </div>
  )
}
