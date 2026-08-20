import { useEffect, useState } from 'react'
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { listenStops } from '../lib/firestore'

const TYPE_COLORS = {
  free_camp: '#8fe38a',
  campsite: '#6b8fd6',
  poi: '#c1642f',
  activity: '#c79a3a',
}

export default function TripMap({ tripId, days }) {
  const [stopsByDay, setStopsByDay] = useState({})

  useEffect(() => {
    const unsubscribers = days.map((day) =>
      listenStops(tripId, day.id, (stops) =>
        setStopsByDay((prev) => ({ ...prev, [day.id]: stops }))
      )
    )
    return () => unsubscribers.forEach((unsub) => unsub())
  }, [tripId, days])

  const orderedStops = days.flatMap((day) => stopsByDay[day.id] || [])
  const positions = orderedStops
    .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
    .map((s) => [s.lat, s.lng])

  const center = positions[0] || [43.0, -4.0] // Cantabria-ish default

  return (
    <div className="trip-map">
      <MapContainer center={center} zoom={positions.length ? 8 : 7} style={{ height: '520px', width: '100%', borderRadius: '12px' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {positions.length > 1 ? <Polyline positions={positions} color="#8fe38a" weight={3} opacity={0.7} /> : null}
        {orderedStops
          .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
          .map((stop) => (
            <CircleMarker
              key={stop.id}
              center={[stop.lat, stop.lng]}
              radius={8}
              pathOptions={{
                color: TYPE_COLORS[stop.type] || '#8a93a6',
                fillColor: TYPE_COLORS[stop.type] || '#8a93a6',
                fillOpacity: 0.9,
              }}
            >
              <Popup>
                <strong>{stop.name}</strong>
                <br />
                {stop.bortle ? `Bortle ${stop.bortle}` : ''}
              </Popup>
            </CircleMarker>
          ))}
      </MapContainer>
      {positions.length === 0 ? (
        <p className="map-empty-hint">Añade coordenadas a tus paradas para verlas aquí.</p>
      ) : null}
    </div>
  )
}
