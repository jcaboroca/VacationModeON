import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import {
  buildDirectionsUrl,
  fetchRoute,
  formatDuration,
  isRouteStale,
  routeSignature,
  unflattenCoords,
} from '../lib/dayRoute'
import { saveDayRoute, updateDay } from '../lib/firestore'

export default function DayRouteCard({ tripId, day, waypoints }) {
  const [visible, setVisible] = useState(false)
  const [failed, setFailed] = useState(false)
  const boxRef = useRef(null)
  const route = day.route
  const signature = useMemo(() => (waypoints ? routeSignature(waypoints) : null), [waypoints])

  // The public routing service is only worth calling for legs the user reaches.
  useEffect(() => {
    if (visible || !boxRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true)
      },
      { rootMargin: '200px' }
    )
    observer.observe(boxRef.current)
    return () => observer.disconnect()
  }, [visible])

  useEffect(() => {
    if (!visible || !waypoints || !isRouteStale(route, waypoints)) return
    let cancelled = false
    setFailed(false)
    fetchRoute(waypoints)
      .then((result) => {
        if (cancelled) return
        if (!result) {
          setFailed(true)
          return
        }
        return saveDayRoute(tripId, day.id, {
          ...result,
          signature,
          names: waypoints.map((stop) => stop.name || ''),
        })
      })
      .catch((error) => {
        console.error('Day route failed', error)
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [visible, signature, route?.signature, tripId, day.id])

  if (!waypoints) {
    return (
      <aside className="day-route day-route-empty" ref={boxRef}>
        Añade dos paradas con ubicación para ver el recorrido.
      </aside>
    )
  }

  const fresh = route && route.signature === signature
  const coords = fresh ? unflattenCoords(route.coords) : []
  const routedKm = fresh ? route.distanceKm : null
  const showApplyKm = routedKm !== null && Math.round(routedKm) !== Math.round(Number(day.distanceKm) || 0)

  return (
    <aside className="day-route" ref={boxRef}>
      {coords.length ? (
        <MapContainer
          bounds={coords}
          scrollWheelZoom={false}
          attributionControl={false}
          style={{ height: '170px', width: '100%', borderRadius: '10px' }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Polyline positions={coords} color="#8fe38a" weight={3} opacity={0.8} />
          {waypoints.map((stop, i) => (
            <CircleMarker
              key={stop.id}
              center={[stop.lat, stop.lng]}
              radius={5}
              pathOptions={{ color: i === waypoints.length - 1 ? '#c1642f' : '#8fe38a' }}
            >
              <Tooltip>{stop.name}</Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      ) : (
        <div className="day-route-placeholder">
          {failed ? 'No se pudo calcular la ruta.' : 'Calculando ruta…'}
        </div>
      )}

      <ol className="day-route-legs">
        {waypoints.slice(1).map((stop, i) => {
          const leg = fresh ? route.legs?.[i] : null
          return (
            <li key={stop.id}>
              <span className="day-route-leg-name">
                {waypoints[i].name} → {stop.name}
              </span>
              <span className="day-route-leg-metrics">
                {leg ? `${leg.distanceKm} km · ${formatDuration(leg.durationMin)}` : '—'}
              </span>
            </li>
          )
        })}
      </ol>

      <div className="day-route-metrics">
        <span>{routedKm !== null ? `${routedKm} km` : '—'}</span>
        <span>{formatDuration(fresh ? route.durationMin : null)}</span>
      </div>

      {showApplyKm ? (
        <button
          type="button"
          className="btn-ghost day-route-apply"
          onClick={() => updateDay(tripId, day.id, { distanceKm: routedKm })}
        >
          Usar {routedKm} km
        </button>
      ) : null}

      <a
        className="day-route-link"
        href={buildDirectionsUrl(waypoints)}
        target="_blank"
        rel="noreferrer"
      >
        Abrir en Google Maps
      </a>
    </aside>
  )
}
