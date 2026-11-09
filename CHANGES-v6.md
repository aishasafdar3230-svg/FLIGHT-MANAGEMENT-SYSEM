# Wingspan v6 — what changed

## 1. Colour palette ("Aviation Hybrid")
- New tokens live at the top of `frontend/src/styles/index.css` (light + dark mode).
- Navy #003A65 / blue #2F90D4 / sky #6EC0E9 base, amber #F6D10F only for the main action button.
- Status colours: Normal = green, Caution = amber, Warning = red (`--status-*` variables, `Status.css`).

## 2. Country dropdown
- City lists no longer repeat the country on every row (it is already the group heading).
- Country → Country: the country picked in one box is removed from the other, so "Pakistan" no longer shows up on both sides.

## 3. Cancel ticket
- "Cancel ticket" opens a dialog showing the refund BEFORE confirming, then a message on the page after.
- Policy (backend/controllers/bookingController.js, `buildCancelQuote`): 48h+ = 90%, 24–48h = 50%, under 24h = 0%, departed = not allowed, airline cancelled / delay 2h+ = 100%.
- Seats are given back to the flight on cancel.

## 4. Flight delay / cancel system
- Flight now has `status` (On Time / Delayed / Cancelled), `delayMinutes`, `delayReason`.
- Search cards, booking page and My Trips show the status badge, new departure time and a banner.
- Cancelled flights can't be booked. Delay of 2h+ shows red and offers a free refund.
- To change a flight: `PUT /api/flights/:id/status` with header `x-admin-key: <ADMIN_KEY>` and body
  `{ "status": "Delayed", "delayMinutes": 90, "delayReason": "Bad weather" }`.
  Cancelling a flight auto-cancels all its tickets with a full refund.
- Add `ADMIN_KEY=...` to `backend/.env` (see `.env.example`).
- Re-run the seed (`npm run seed` in backend) to get ~3% delayed and ~1% cancelled sample flights.
