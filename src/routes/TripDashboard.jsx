import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { listenDays, listenTrip } from '../lib/firestore'
import OdometerHero from '../components/OdometerHero'
import DayRail from '../components/DayRail'
import TripMap from '../components/TripMap'
import JournalFeed from '../components/JournalFeed'

export default function TripDashboard() {
  const { tripId } = useParams()
  const [trip, setTrip] = useState(null)
  const [days, setDays] = useState([])
  const [view, setView] = useState('list')
  const [currentKm, setCurrentKm] = useState(null)

  useEffect(() => listenTrip(tripId, setTrip), [tripId])
  useEffect(() => listenDays(tripId, setDays), [tripId])

  if (!trip) return <p className="empty-hint">Cargando viaje…</p>

  return (
    <div>
      <Link to="/" className="back-link">
        ← Todos los viajes
      </Link>

      <OdometerHero trip={trip} currentKm={currentKm} />

      <div className="view-toggle">
        <button type="button" className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>
          Lista
        </button>
        <button type="button" className={view === 'map' ? 'active' : ''} onClick={() => setView('map')}>
          Mapa
        </button>
        <Link to={`/trip/${tripId}/lista`} className="btn-ghost packing-link">
          Lista de la compra
        </Link>
      </div>

      {view === 'list' ? (
        <DayRail tripId={tripId} days={days} onVisibleKmChange={setCurrentKm} />
      ) : (
        <TripMap tripId={tripId} days={days} />
      )}

      <JournalFeed tripId={tripId} days={days} />
    </div>
  )
}
