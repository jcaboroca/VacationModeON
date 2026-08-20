function digits(km) {
  return Math.max(0, Math.round(km)).toString().padStart(6, '0').split('')
}

export default function OdometerHero({ trip, currentKm }) {
  const shownKm = currentKm ?? trip.totalKm ?? 0

  return (
    <div className="hero">
      <div className="hero-odo-label">CUENTAKILÓMETROS DEL VIAJE</div>
      <div className="hero-odo">
        <div className="hero-odo-digits">
          {digits(shownKm).map((d, i) => (
            <div key={i} className="hero-odo-digit">
              {d}
            </div>
          ))}
        </div>
        <span className="hero-odo-unit">KM · SCROLL PARA AVANZAR</span>
      </div>
      <h1 className="hero-title">{trip.name}</h1>
      <div className="hero-subtitle">
        <span>{trip.startDate}</span>
        <span>→</span>
        <span>{trip.endDate}</span>
        {trip.vehicle ? <span>{trip.vehicle}</span> : null}
      </div>
    </div>
  )
}
