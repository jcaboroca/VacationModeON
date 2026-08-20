import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listenTrips } from '../lib/firestore'
import NewTripForm from '../components/NewTripForm'

const STATUS_LABELS = {
  planning: 'Planificando',
  active: 'En marcha',
  done: 'Hecho',
}

export default function TripList() {
  const [trips, setTrips] = useState([])

  useEffect(() => listenTrips(setTrips), [])

  return (
    <div>
      <h2 className="page-title">Tus viajes</h2>
      <div className="trip-cards">
        {trips.map((trip) => (
          <Link key={trip.id} to={`/trip/${trip.id}`} className="trip-card">
            <span className={`trip-status trip-status-${trip.status}`}>
              {STATUS_LABELS[trip.status] || trip.status}
            </span>
            <div className="trip-card-name">{trip.name}</div>
            <div className="trip-card-dates">
              {trip.startDate} → {trip.endDate}
            </div>
            <div className="trip-card-km">{trip.totalKm || 0} km</div>
          </Link>
        ))}
        {trips.length === 0 ? <p className="empty-hint">Todavía no tienes ningún viaje.</p> : null}
      </div>
      <NewTripForm trips={trips} />
    </div>
  )
}
