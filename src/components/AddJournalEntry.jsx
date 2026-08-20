import { useState } from 'react'
import { createJournalEntry } from '../lib/firestore'

export default function AddJournalEntry({ tripId, days }) {
  const [open, setOpen] = useState(false)
  const [dayId, setDayId] = useState('')
  const [text, setText] = useState('')
  const [files, setFiles] = useState([])
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!dayId || (!text.trim() && files.length === 0)) return
    setSaving(true)
    await createJournalEntry(tripId, dayId, { text: text.trim(), photoFiles: files })
    setText('')
    setFiles([])
    setSaving(false)
    setOpen(false)
  }

  if (!open) {
    return (
      <button type="button" className="btn-ghost journal-toggle" onClick={() => setOpen(true)}>
        + Añadir al diario
      </button>
    )
  }

  return (
    <form className="journal-form" onSubmit={submit}>
      <select className="field" value={dayId} onChange={(e) => setDayId(e.target.value)} required>
        <option value="">¿Qué día?</option>
        {days.map((d) => (
          <option key={d.id} value={d.id}>
            {d.date} — {d.title}
          </option>
        ))}
      </select>
      <textarea
        className="field"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="¿Qué ha pasado hoy?"
        rows={3}
      />
      <input
        className="field"
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => setFiles(Array.from(e.target.files))}
      />
      <div className="stop-card-actions">
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}
