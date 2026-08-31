import { useEffect, useRef, useState } from 'react'
import { searchPlaces } from '../lib/geo'

/**
 * Shown on stops saved without coordinates: looks the name up once and either
 * applies the only match or lets the user pick between the candidates.
 */
export default function StopLocator({ stop, near, onPick }) {
  const [status, setStatus] = useState('searching')
  const [candidates, setCandidates] = useState([])
  const searchedRef = useRef(false)

  async function search() {
    setStatus('searching')
    try {
      const found = await searchPlaces(stop.name, near)
      if (found.length === 1) {
        onPick(found[0])
        return
      }
      setCandidates(found)
      setStatus(found.length ? 'choose' : 'empty')
    } catch {
      setStatus('error')
    }
  }

  useEffect(() => {
    if (searchedRef.current || !stop.name) return
    searchedRef.current = true
    search()
  }, [])

  return (
    <div className="stop-locator" onClick={(e) => e.stopPropagation()}>
      {status === 'searching' ? <span className="stop-locator-note">Buscando ubicación…</span> : null}

      {status === 'choose' ? (
        <>
          <span className="stop-locator-note">¿Cuál de estos es?</span>
          <ul className="stop-locator-list">
            {candidates.map((place) => (
              <li key={place.id}>
                <button type="button" onClick={() => onPick(place)}>
                  {place.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {status === 'empty' || status === 'error' ? (
        <>
          <span className="stop-locator-note">
            {status === 'empty' ? 'Sin coordenadas: no se encontró el nombre.' : 'Sin coordenadas: la búsqueda falló.'}
          </span>
          <button type="button" className="btn-ghost stop-locator-retry" onClick={search}>
            Buscar de nuevo
          </button>
        </>
      ) : null}
    </div>
  )
}
