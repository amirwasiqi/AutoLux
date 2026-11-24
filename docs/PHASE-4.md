# AutoLux Phase 4 — Reservations & Rental Operations

## Included
- Date availability checks for published rental vehicles.
- Authenticated reservation requests with server-side duration and subtotal calculation.
- Per-vehicle row locking plus overlapping-date checks to prevent concurrent duplicate reservations.
- Customer reservation history and cancellation for pending/confirmed requests.
- Staff reservation register with search, status filters, operational summary and status actions.
- Explicit reservation state transitions: pending → confirmed/rejected/cancelled; confirmed → active/cancelled; active → completed.
- Event history for customer and staff actions.
- Pickup/drop-off branch references and branch/delivery method fields, plus payment-state placeholders for later payment integration.
- Admin dashboard navigation to reservation operations.

## Routes
- `GET /api/v1/bookings/availability?vehicleId=...&pickupAt=...&returnAt=...`
- `POST /api/v1/bookings` — authenticated customer reservation request.
- `GET /api/v1/bookings/mine` — authenticated customer's reservations.
- `PATCH /api/v1/bookings/:id/cancel` — customer cancellation while pending/confirmed.
- `GET /api/v1/bookings/manage/summary` — staff summary.
- `GET /api/v1/bookings/manage/all?status=&search=` — staff register.
- `PATCH /api/v1/bookings/:id/status` — staff state transition.
- `GET /api/v1/bookings/:id/events` — customer owner or staff event history.

## UI
- `/admin/bookings` — staff reservation operations.
- `/account` — customer's reservation history and cancellation.
- Vehicle detail → Request reservation → date availability and estimated base subtotal.

## Pricing and payment boundaries
The displayed reservation estimate is daily rental guide rate × rounded-up rental days. It excludes taxes, deposits, insurance, delivery and other fees. No card is charged and no payment provider is connected in this phase. `payment_status` is a future integration field only. AutoLux staff must verify the actual vehicle, branch, driver eligibility, price and final charges before confirming.

## Database
Migration `004_booking_operations.sql` adds branch/method/payment-state fields and indexes. The migration runner applies it automatically after `003_rental_bookings.sql`.

## Image delivery reliability
Vehicle cards now request a model-specific image from the AutoLux API, which searches Wikimedia Commons server-side and redirects to a Commons thumbnail. This avoids browser-side Commons API/CORS problems. If Commons cannot provide a result, the component rotates through category-level Unsplash representative photos. Those fallback photos are not exact model/trim evidence. Confirm the displayed Commons photo matches the exact model before using it in a commercial listing.
