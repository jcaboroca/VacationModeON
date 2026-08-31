import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import StopCard from './StopCard'

export default function SortableStopCard({ tripId, dayId, stop }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.id,
  })

  return (
    <div
      ref={setNodeRef}
      className={isDragging ? 'stop-sortable is-dragging' : 'stop-sortable'}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <StopCard
        tripId={tripId}
        dayId={dayId}
        stop={stop}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}
