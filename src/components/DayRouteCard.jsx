import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleMarker, MapContainer, Polyline, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import {
  buildDirectionsUrl,
  fetchRoute,
  formatDuration,
  isRouteStale,
  routeSignature,
} from '../lib/dayRoute'
import { saveDayRoute, updateDay } from '../lib/firestore'

export default function DayRouteCard({ tripId, day, endpoints }) {
  const [visible, setVisible] = useState(false)
  const [failed, setFailed] = useState(false)
  const boxRef = useRef(null)
  const route = day.route
  const signature = useMemo(() => (endpoints ? routeSignature(endpoints) : null), [endpoints])

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
    if (!visible || !endpoints || !isRouteStale(route, endpoints)) return
    let cancelled = false
    setFailed(false)
    fetchRoute(endpoints.from, endpoints.to)
      .then((result) => {
        if (cancelled) return
        if (!result) {
          setFailed(true)
          return
        }
        return saveDayRoute(tripId, day.id, {
          ...result,
          signature,
          fromName: endpoints.from.name || '',
          toName: endpoints.to.name || '',
        })
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [visible, signature, route?.signature, tripId, day.id])

  if (!endpoints) {
    return (
      <aside className="day-route day-route-empty" ref={boxRef}>
        Añade dos paradas con ubicación para ver el tramo.
      </aside>
    )
  }

  const fresh = route && route.signature === signature
  const routedKm = fresh ? route.distanceKm : null
  const showApplyKm = routedKm !== null && Math.round(routedKm) !== Math.round(Number(day.distanceKm) || 0)

  return (
    <aside className="day-route" ref={boxRef}>
      {fresh && route.coords?.length ? (
        <MapContainer
          bounds={route.coords}
          scrollWheelZoom={false}
          attributionControl={false}
          style={{ height: '150px', width: '100%', borderRadius: '10px' }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Polyline positions={route.coords} color="#8fe38a" weight={3} opacity={0.8} />
          <CircleMarker center={route.coords[0]} radius={5} pathOptions={{ color: '#8fe38a' }} />
          <CircleMarker
            center={route.coords[route.coords.length - 1]}
            radius={5}
            pathOptions={{ color: '#c1642f' }}
          />
        </MapContainer>
      ) : (
        <div className="day-route-placeholder">
          {failed ? 'No se pudo calcular la ruta.' : 'Calculando ruta…'}
        </div>
      )}

      <div className="day-route-endpoints">
        {endpoints.from.name} → {endpoints.to.name}
      </div>
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
        href={buildDirectionsUrl(endpoints.from, endpoints.to)}
        target="_blank"
        rel="noreferrer"
      >
        Abrir en Google Maps
      </a>
    </aside>
  )
}
