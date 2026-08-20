# VacationModeON — Design Spec

**Status:** Approved by user, ready for implementation planning.

## 1. Purpose

A personal, reusable trip-planning web app. First real use case: a 9-day
camper van trip through Cantabria (4–13 Sep) with the user's dog Riggs,
combining slow travel, dog-friendly nature stops, and astrophotography with
a Seestar S30 smart telescope. The app must let the user plan a trip in
detail before leaving (routes, overnight stops, packing list) and then keep
using it *during* the trip from a phone to edit stops, check things off, and
log a text diary (see §7 on why photos are deferred).

The app is not single-trip: it must support creating new trips from scratch
or by duplicating a previous one, so it stays useful after Cantabria.

## 2. Users & Access

Single user (the app owner). No sharing, no multi-user collaboration.

- Auth: Firebase Authentication, **Google Sign-In** only (no email/password).
- Authorization: Google Sign-In alone would let any Google account holder
  log in. Firestore Security Rules must additionally check that
  `request.auth.token.email` matches the owner's exact email address on
  every read/write. A successful Google login by anyone else must still
  result in Firestore denying all data access.
- No offline support in v1. The user will have Starlink connectivity during
  travel, so the app can assume it's always online.

## 3. Data Model (Firestore)

```
trips/{tripId}
  name: string
  startDate: string (ISO date)
  endDate: string (ISO date)
  origin: string
  vehicle: string
  status: "planning" | "active" | "done"
  totalKm: number                // sum of days[].distanceKm, recomputed client-side
                                  // and written back whenever a day's distanceKm
                                  // changes (no Cloud Functions in v1 — Spark plan
                                  // has no billing account, so no outbound network
                                  // from server-side functions)
  createdAt: timestamp
  updatedAt: timestamp

  days/{dayId}
    date: string (ISO date)
    order: number                // display/sort order within the trip
    title: string                // e.g. "Tudela → Valderredible"
    routeFrom: string
    routeTo: string
    distanceKm: number
    notes: string

    stops/{stopId}
      name: string
      type: "free_camp" | "campsite" | "poi" | "activity"
      lat: number
      lng: number
      bortle: number | null      // 1-9, only meaningful for astro stops
      altitude: number | null    // meters
      notes: string
      tags: string[]             // free-form, e.g. "riggs", "ducha", "astro"
      order: number

    journal/{entryId}
      text: string
      stopId: string | null      // optional link to the stop it's about
      createdAt: timestamp
      // no photoUrls in v1 — see §7, needs Blaze plan for Storage

  packingList/{itemId}
    text: string
    category: "nevera" | "despensa" | "bebidas" | "equipo"
    checked: boolean
```

Notes:
- `stops` and `journal` are subcollections of `days`, not arrays on the day
  document, because they're independently edited (add/remove/reorder) and
  could grow with photos later — arrays on a parent doc would force
  rewriting the whole day on every small edit.
- `packingList` is scoped per trip (not global), since gear needs differ per
  trip (e.g. Seestar accessories only apply to astro trips).
- Duplicating a trip = a client-side action that reads a trip's full
  subtree (days → stops) and writes new documents with a new `tripId`,
  resetting `status` to `"planning"` and clearing `journal`.

## 4. Pages & Interactions

- **`/` — Trip list**: cards for each trip (name, dates, status badge).
  Button to create a new trip (blank form) or duplicate an existing one.
- **`/trip/:id` — Trip dashboard**: the odometer hero (total km) at the top,
  then a **List / Map** toggle.
  - *List view*: the day rail from the approved visual design — days
    branch off a vertical rail with cumulative km; each stop renders as an
    instrument card (coordinates, Bortle gauge, type tag, Riggs tag).
  - *Map view*: all stops for the trip on a single Leaflet + OpenStreetMap
    map, connected by a route line in trip order. Markers colored by stop
    `type` (free_camp / campsite / poi / activity).
- **Inline editing**: tapping a stop expands it in place (no page
  navigation) to edit name, coordinates, Bortle, altitude, notes, tags. This
  matters specifically for one-handed phone use while traveling.
- **`/trip/:id/lista` — Packing/shopping list**: checklist grouped by
  category (nevera/despensa/bebidas/equipo), matching the original
  NotebookLM sketch's shopping list and camper menu.
- **Diary mode**: add a text journal entry linked to a day, auto-timestamped
  (no photos in v1 — see §7). Journal entries show up in a simple
  chronological feed on the trip dashboard.

## 5. Visual Design

Approved direction: **"El Cuentakilómetros"** (the trip odometer).

- **Colors**: `--ink: #1B1F2A` (primary dark surface), `--concrete: #EDEEEA`
  (light neutral surface), `--phosphor: #8FE38A` (LCD odometer green, data/
  interactive accent), `--rust: #C1642F` (warmth accent for Riggs/nature
  tags), `--line: #3A4152` (borders/dividers).
- **Bortle gauge palette** (the one place color carries meaning, not mood):
  reproduces the real light-pollution scale on a **9-segment** horizontal
  gauge (one segment per Bortle class, 1 through 9), filled left to right
  up to the stop's class — class 1-2 `#3B4A63` (blue-grey), 3-4 `#6B8F5A`
  (green), 5-6 amber, 7-9 red. (The brainstorming mockup used a
  7-segment gauge as a rough sketch; the real component uses 9 segments to
  map 1:1 with the Bortle scale.)
- **Type**: Big Shoulders Display (headers, condensed/uppercase, highway
  sign energy), IBM Plex Sans (body), IBM Plex Mono (all data: km,
  coordinates, Bortle numbers, dates, tags).
- **Signature element**: a mechanical rolling-digit odometer in the trip
  hero that advances (visually, via scroll position) as the user scrolls
  through the day rail, reflecting cumulative km traveled so far in the
  itinerary.
- Full mockup reference: the approved HTML prototype built during
  brainstorming (hero + sample stop card with Bortle gauge).

## 6. Tech Stack

- **Frontend**: Vite + React (JavaScript, no TypeScript — keep this
  lightweight for a personal project), React Router for the two routes.
- **Backend/data**: Firebase (Firestore for data, Firebase Authentication
  for Google Sign-In), Spark (free) plan. No Firebase Storage in v1 (see
  §7).
- **Map**: Leaflet + OpenStreetMap tiles (no API key required).
- **Hosting**: Vercel, connected to the `jcaboroca/VacationModeON` GitHub
  repo, auto-deploy on push to `main`.

## 7. Out of Scope (v1)

- Offline support (not needed — Starlink covers connectivity).
- Multi-user sharing/collaboration.
- Native mobile app (the web app must be responsive/usable on mobile
  browsers, but no App Store/Play Store distribution).
- Weather integration, tide charts, or any third-party data feeds beyond
  the map tiles.
- **Journal photos.** As of late 2024, Firebase requires the Blaze
  (pay-as-you-go) plan to enable Storage at all, even for usage that stays
  within the free tier. The user chose to stay on Spark rather than add a
  billing account, so v1's journal is text-only. If the project later
  upgrades to Blaze, reintroduce `photoUrls: string[]` on `journal/{entryId}`
  and a `storage.rules` file scoped the same way as `firestore.rules`
  (owner-email check on `journal/{tripId}/{dayId}/{entryId}/{fileName}`).

## 8. Testing Approach

Personal project, single user, no team to coordinate with — testing should
be proportionate, not exhaustive:
- Unit tests for pure data-transformation logic (e.g. computing `totalKm`
  from days, the trip-duplication function) since those are easy to get
  subtly wrong and have no visual feedback when broken.
- No unit tests for React components themselves; instead, manual
  verification in the browser (per component/page) as each is built.
- Firestore Security Rules get their own test: verify that a non-owner
  authenticated user is denied read/write (this is the one place a bug is
  a real privacy problem, not just an inconvenience).
