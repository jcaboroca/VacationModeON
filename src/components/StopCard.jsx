import { useState } from 'react'
import { deleteStop, updateStop } from '../lib/firestore'
import BortleGauge from './BortleGauge'

const TYPE_LABELS = {
  free_camp: 'Pernocta libre',
  campsite: 'Camping',
  poi: 'Punto de interés',
  activity: 'Actividad',
}

function emptyToNull(value) {
  return value === '' ? null : value
}

export default function StopCard({ tripId, dayId, stop }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(() => toForm(stop))

  function toForm(s) {
    return {
      name: s.name || '',
      type: s.type || 'poi',
      lat: s.lat ?? '',
      lng: s.lng ?? '',
      bortle: s.bortle ?? '',
      altitude: s.altitude ?? '',
      notes: s.notes || '',
      tags: (s.tags || []).join(', '),
    }
  }

  function startEditing() {
    setForm(toForm(stop))
    setEditing(true)
  }

  async function save(e) {
    e.preventDefault()
    await updateStop(tripId, dayId, stop.id, {
      name: form.name,
      type: form.type,
      lat: Number(form.lat),
      lng: Number(form.lng),
      bortle: emptyToNull(form.bortle) === null ? null : Number(form.bortle),
      altitude: emptyToNull(form.altitude) === null ? null : Number(form.altitude),
      notes: form.notes,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    })
    setEditing(false)
  }

  async function remove() {
    if (confirm(`¿Borrar la parada "${stop.name}"?`)) {
      await deleteStop(tripId, dayId, stop.id)
    }
  }

  if (editing) {
    return (
      <form className="stop-card stop-card-edit" onSubmit={save}>
        <input
          className="field"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Nombre de la parada"
          required
        />
        <select
          className="field"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
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
        <div className="field-row">
          <input
            className="field"
            type="number"
            min="1"
            max="9"
            value={form.bortle}
            onChange={(e) => setForm({ ...form, bortle: e.target.value })}
            placeholder="Bortle (1-9)"
          />
          <input
            className="field"
            type="number"
            value={form.altitude}
            onChange={(e) => setForm({ ...form, altitude: e.target.value })}
            placeholder="Altitud (m)"
          />
        </div>
        <textarea
          className="field"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Notas"
          rows={2}
        />
        <input
          className="field"
          value={form.tags}
          onChange={(e) => setForm({ ...form, tags: e.target.value })}
          placeholder="Tags separados por coma (ej: riggs, ducha)"
        />
        <div className="stop-card-actions">
          <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>
            Cancelar
          </button>
          <button type="button" className="btn-ghost btn-danger" onClick={remove}>
            Borrar
          </button>
          <button type="submit" className="btn-primary">
            Guardar
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="stop-card" onClick={startEditing}>
      <div className="stop-card-head">
        <span className="stop-card-type">{TYPE_LABELS[stop.type] || stop.type}</span>
      </div>
      <div className="stop-card-name">{stop.name}</div>
      <div className="stop-card-coord">
        {stop.lat}, {stop.lng}
        {stop.altitude ? ` · ${stop.altitude} m alt.` : ''}
      </div>
      <BortleGauge value={stop.bortle} />
      {stop.notes ? <p className="stop-card-notes">{stop.notes}</p> : null}
      {stop.tags?.length ? (
        <div className="stop-card-tags">
          {stop.tags.map((tag) => (
            <span key={tag} className={`stop-tag ${tag === 'riggs' ? 'stop-tag-riggs' : ''}`}>
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
