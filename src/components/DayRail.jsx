import { useState } from 'react'
import { createDay } from '../lib/firestore'
import DayRow from './DayRow'

export default function DayRail({ tripId, days, onVisibleKmChange }) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ date: '', title: '', distanceKm: '' })

  let running = 0
  const rows = days.map((day) => {
    const cumulativeKm = running
    running += Number(day.distanceKm) || 0
    return { day, cumulativeKm }
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
    <div className="day-rail">
      {rows.map(({ day, cumulativeKm }) => (
        <DayRow
          key={day.id}
          tripId={tripId}
          day={day}
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
  )
}
