# AutoLux Phase 3 — Vehicle Catalogue & Fleet Operations

## Included
- 100 seed vehicle records across sedans, SUVs, pickups, vans, sports cars, luxury vehicles and EVs.
- Public vehicle catalogue with search, category/make/listing filters, sorting and pagination.
- Vehicle detail route and vehicle photography lookup via Wikimedia Commons.
- Image lookup filters for reusable license classes and exposes creator/license attribution links. Images are fetched by the visitor's browser and are not bundled in this archive; availability depends on Wikimedia Commons and network access.
- Vehicle admin CRUD, archive, publication status, branch assignment field, price fields and fleet-status changes.
- PostgreSQL status history and audit-log events.
- Admin overview dashboard inspired by the supplied references: operational sidebar, KPI cards, fleet status, category distribution, recent activity and a stylized US branch-footprint map panel.

## Important data semantics
- The 100 records are catalogue/demo entries, not proof AutoLux owns 100 physical vehicles. All seeded rows have `is_demo=true`.
- A vehicle must be reviewed for model year, trim, condition, actual branch, registration, ownership and image before being represented as live inventory.
- `sale_price_basis=model_median` means a model-level market reference; `segment_estimate` means an indicative segment estimate. It is not a dealer offer or an AutoLux sale quote.
- Rental rates are market guide values. A subset uses model-level published examples; the rest uses category-level planning estimates. They are not date- or branch-specific availability quotes.
- The dashboard map is illustrative. Phase 3 does not connect GPS, telematics, live vehicle locations or geofences.
- Orders, payments, reservations, driver workflows, maintenance work orders and sales analytics are not implemented by Phase 3.

## Price references
- Used-car price guide: https://www.carwhere.com/used-car-prices
- Rochester rental fleet examples: https://www.rochester.rentals/fleet
- Rent-Trip premium rental examples: https://rent-trip.com/usa/premium/
- Seed metadata records reference date `2026-11-14`. Verify each price and source again before publishing commercial prices. Taxes, fees, branch, season, trim, condition and rental dates affect final quotes.

## Database
Migration: `backend/src/db/migrations/002_vehicle_catalog.sql`

Run from `backend/` after setting `DATABASE_URL`:
```bash
npm run db:migrate
```
The migration creates `vehicles`, `vehicle_images`, and `vehicle_status_history`, adds indexes and seeds 100 sample catalogue rows idempotently by slug.

## API
- `GET /api/v1/vehicles` — public paginated catalogue
- `GET /api/v1/vehicles/filters` — public filter options
- `GET /api/v1/vehicles/:slug` — public vehicle details
- `GET /api/v1/vehicles/manage/all` — fleet roles
- `POST /api/v1/vehicles` — fleet roles
- `PATCH /api/v1/vehicles/:id` — fleet roles
- `PATCH /api/v1/vehicles/:id/status` — fleet roles; writes status history
- `DELETE /api/v1/vehicles/:id` — fleet roles; soft archive
- `GET /api/v1/admin/dashboard/overview` — fleet roles

## Admin UI
- `/admin` — dashboard overview
- `/admin/fleet` — vehicle inventory management

Access is restricted to `super_admin`, `company_admin`, and `fleet_manager` roles.
