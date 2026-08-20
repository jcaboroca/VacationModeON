import { useState } from 'react'
import { createTrip, duplicateTrip } from '../lib/firestore'

const EMPTY = { name: '', startDate: '', endDate: '', origin: '', vehicle: 'Furgoneta Camper' }

export default function NewTripForm({ trips }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('blank') // 'blank' | 'duplicate'
  const [form, setForm] = useState(EMPTY)
  const [duplicateFrom, setDuplicateFrom] = useState('')
  const [duplicateName, setDuplicateName] = useState('')
  const [busy, setBusy] = useState(false)

  async function submitBlank(e) {
    e.preventDefault()
    setBusy(true)
    await createTrip(form)
    setForm(EMPTY)
    setBusy(false)
    setOpen(false)
  }

  async function submitDuplicate(e) {
    e.preventDefault()
    if (!duplicateFrom) return
    setBusy(true)
    await duplicateTrip(duplicateFrom, duplicateName || 'Viaje duplicado')
    setDuplicateFrom('')
    setDuplicateName('')
    setBusy(false)
    setOpen(false)
  }

  if (!open) {
    return (
      <button type="button" className="btn-primary new-trip-toggle" onClick={() => setOpen(true)}>
        + Nuevo viaje
      </button>
    )
  }

  return (
    <div className="new-trip-form">
      <div className="view-toggle">
        <button type="button" className={mode === 'blank' ? 'active' : ''} onClick={() => setMode('blank')}>
          Desde cero
        </button>
        <button
          type="button"
          className={mode === 'duplicate' ? 'active' : ''}
          onClick={() => setMode('duplicate')}
          disabled={trips.length === 0}
        >
          Duplicar uno existente
        </button>
      </div>

      {mode === 'blank' ? (
        <form onSubmit={submitBlank}>
          <input
            className="field"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nombre del viaje"
            required
          />
          <div className="field-row">
            <input
              className="field"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              required
            />
            <input
              className="field"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              required
            />
          </div>
          <input
            className="field"
            value={form.origin}
            onChange={(e) => setForm({ ...form, origin: e.target.value })}
            placeholder="Origen"
          />
          <input
            className="field"
            value={form.vehicle}
            onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
            placeholder="Vehículo"
          />
          <div className="stop-card-actions">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              Crear viaje
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={submitDuplicate}>
          <select
            className="field"
            value={duplicateFrom}
            onChange={(e) => setDuplicateFrom(e.target.value)}
            required
          >
            <option value="">Elige un viaje…</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <input
            className="field"
            value={duplicateName}
            onChange={(e) => setDuplicateName(e.target.value)}
            placeholder="Nombre del nuevo viaje"
            required
          />
          <div className="stop-card-actions">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              Duplicar
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
