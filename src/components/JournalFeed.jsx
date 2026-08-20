import { useEffect, useState } from 'react'
import { deleteJournalEntry, listenJournal } from '../lib/firestore'
import AddJournalEntry from './AddJournalEntry'

function toMillis(ts) {
  return ts?.toMillis ? ts.toMillis() : 0
}

export default function JournalFeed({ tripId, days }) {
  const [entriesByDay, setEntriesByDay] = useState({})

  useEffect(() => {
    const unsubscribers = days.map((day) =>
      listenJournal(tripId, day.id, (entries) =>
        setEntriesByDay((prev) => ({ ...prev, [day.id]: entries.map((e) => ({ ...e, dayId: day.id })) }))
      )
    )
    return () => unsubscribers.forEach((unsub) => unsub())
  }, [tripId, days])

  const allEntries = Object.values(entriesByDay)
    .flat()
    .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))

  return (
    <div className="journal-feed">
      <h2 className="page-title">Diario del viaje</h2>
      <AddJournalEntry tripId={tripId} days={days} />
      <div className="journal-entries">
        {allEntries.map((entry) => (
          <div key={entry.id} className="journal-entry">
            {entry.text ? <p>{entry.text}</p> : null}
            <button type="button" className="journal-delete" onClick={() => deleteJournalEntry(tripId, entry.dayId, entry)}>
              Borrar
            </button>
          </div>
        ))}
        {allEntries.length === 0 ? <p className="empty-hint">Todavía no hay entradas.</p> : null}
      </div>
    </div>
  )
}
