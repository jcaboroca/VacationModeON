import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  createPackingItem,
  deletePackingItem,
  listenPackingList,
  listenTrip,
  updatePackingItem,
} from '../lib/firestore'

const CATEGORIES = [
  { value: 'nevera', label: 'Nevera' },
  { value: 'despensa', label: 'Despensa' },
  { value: 'bebidas', label: 'Bebidas' },
  { value: 'equipo', label: 'Equipo' },
]

export default function PackingList() {
  const { tripId } = useParams()
  const [trip, setTrip] = useState(null)
  const [items, setItems] = useState([])
  const [text, setText] = useState('')
  const [category, setCategory] = useState('despensa')

  useEffect(() => listenTrip(tripId, setTrip), [tripId])
  useEffect(() => listenPackingList(tripId, setItems), [tripId])

  async function addItem(e) {
    e.preventDefault()
    if (!text.trim()) return
    await createPackingItem(tripId, { text: text.trim(), category })
    setText('')
  }

  return (
    <div>
      <Link to={`/trip/${tripId}`} className="back-link">
        ← {trip?.name || 'Viaje'}
      </Link>
      <h2 className="page-title">Lista de la compra</h2>

      {CATEGORIES.map((cat) => {
        const catItems = items.filter((i) => i.category === cat.value)
        if (catItems.length === 0) return null
        return (
          <div key={cat.value} className="packing-category">
            <h3 className="packing-category-title">{cat.label}</h3>
            <ul className="packing-items">
              {catItems.map((item) => (
                <li key={item.id} className={item.checked ? 'checked' : ''}>
                  <label>
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) => updatePackingItem(tripId, item.id, { checked: e.target.checked })}
                    />
                    {item.text}
                  </label>
                  <button type="button" onClick={() => deletePackingItem(tripId, item.id)}>
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      })}

      <form className="packing-add-form" onSubmit={addItem}>
        <input
          className="field"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Añadir a la lista…"
        />
        <select className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-primary">
          Añadir
        </button>
      </form>
    </div>
  )
}
