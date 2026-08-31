# Stop Card Drag-and-Drop — Design Spec

**Status:** Approved by user, ready for implementation planning.

## 1. Purpose

Restore drag-and-drop for stop cards. A stop can be reordered within its
current day or moved to another day. The interaction must work with mouse,
touch, and keyboard without interfering with tapping a card to edit it.

## 2. Interaction

- Each stop card has a dedicated drag handle. The rest of the card keeps its
  existing tap-to-edit behavior.
- Dragging shows an immediate card preview and highlights valid day drop zones.
- Empty days accept dropped stops.
- Keyboard users can focus the handle, pick up a card, move it, and drop it
  through dnd-kit's keyboard sensor.
- A failed save restores the last Firestore-confirmed order and displays an
  error to the user.

## 3. Component Ownership

`DayRail` owns the stop lists for every visible day and hosts one dnd-kit
`DndContext`. It subscribes to each day's stops, passes each ordered list to
`DayRow`, and coordinates moves across lists.

`DayRow` renders a droppable day container and a sortable list of stop cards.
It no longer owns its Firestore stop subscription.

`StopCard` exposes a dedicated drag handle in its collapsed state. Editing
forms are not draggable.

Pure list transformation logic remains separate from React and Firebase so it
can be covered by fast unit tests.

## 4. Persistence

For a reorder within one day, a Firestore write batch updates each affected
stop's `order` field to a contiguous zero-based value.

For a move between days, one write batch:

1. Writes the stop under the destination day using the same stop ID and its
   new `order`.
2. Deletes the stop document under the source day.
3. Renumbers stops in both source and destination days.
4. Copies journal entries linked to the stop to the destination day's journal
   collection using their existing IDs, then deletes their source documents.

The move reads linked journal entries before building the batch. This is a
single-owner application, so concurrent reordering conflict resolution is out
of scope. Firestore's 500-operation batch limit is sufficient for the intended
personal-trip data volume.

## 5. Failure Handling

The UI applies the list move immediately while dragging. It retains a snapshot
of the confirmed lists. Cancelling a drag or receiving a persistence error
restores that snapshot. Firestore listeners remain authoritative after a
successful write.

## 6. Dependencies

Use `@dnd-kit/core` and `@dnd-kit/sortable`. Native HTML drag-and-drop is not
used because it does not provide the required touch and keyboard behavior.

## 7. Testing

- Vitest covers pure reordering within a day and moving a stop between days,
  including contiguous `order` values.
- Existing unit tests must remain green.
- The production build must succeed.
- Browser verification covers mouse interaction on desktop plus touch-sized
  and keyboard interaction in a mobile viewport, including an empty target
  day and preservation of tap-to-edit behavior.