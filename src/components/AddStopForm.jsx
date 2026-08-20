import { useState } from 'react'
import { createStop } from '../lib/firestore'

const EMPTY = { name: '', type: 'poi', lat: '', lng: '', bortle: '' }

export default function AddStopForm({ tripId, dayId, nextOrder }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)

  async function submit(e) {
    e.preventDefault()
    await createStop(tripId, dayId, {
      name: form.name,
      type: form.type,
      lat: Number(form.lat),
      lng: Number(form.lng),
      bortle: form.bortle === '' ? null : Number(form.bortle),
      order: nextOrder,
    })
    setForm(EMPTY)
    setOpen(false)
  }

  if (!open) {
    return (
      <button type="button" className="btn-ghost add-stop-toggle" onClick={() => setOpen(true)}>
        + Añadir parada
      </button>
    )
  }

  return (
    <form className="stop-card stop-card-edit" onSubmit={submit}>
      <input
        className="field"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="Nombre de la parada"
        required
        autoFocus
      />
      <select
        className="field"
        value={form.type}
        onChange={(e) => setForm({ ...form, type: e.target.value })}
      >
        <option value="free_camp">Pernocta libre</option>
        <option value="campsite">Camping</option>
        <option value="poi">Punto de interés</option>
        <option value="activity">Actividad</option>
      </select>
      <div className="field-row">
        <input
          className="field"
          type="number"
          step="any"
          value={form.lat}
          onChange={(e) => setForm({ ...form, lat: e.target.value })}
          placeholder="Latitud"
          required
        />
        <input
          className="field"
          type="number"
          step="any"
          value={form.lng}
          onChange={(e) => setForm({ ...form, lng: e.target.value })}
          placeholder="Longitud"
          required
        />
      </div>
      <input
        className="field"
        type="number"
        min="1"
        max="9"
        value={form.bortle}
        onChange={(e) => setForm({ ...form, bortle: e.target.value })}
        placeholder="Bortle (1-9, opcional)"
      />
      <div className="stop-card-actions">
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary">
          Añadir
        </button>
      </div>
    </form>
  )
}
