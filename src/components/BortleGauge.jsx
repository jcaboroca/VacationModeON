const CLASSES = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export default function BortleGauge({ value }) {
  if (!value) {
    return <div className="bortle-gauge bortle-gauge-empty">SIN DATO DE CIELO</div>
  }

  return (
    <div className="gauge-row">
      <span className="gauge-label">BORTLE</span>
      <div className="bortle-gauge">
        {CLASSES.map((n) => (
          <div
            key={n}
            className={`bortle-seg ${n <= value ? 'on' : ''}`}
            style={n <= value ? { '--seg-color': `var(--bortle-${value})` } : undefined}
          />
        ))}
      </div>
      <span className="gauge-value">{value}</span>
    </div>
  )
}
