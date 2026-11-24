-- Phase 4: reservation and availability foundation.
CREATE TABLE IF NOT EXISTS rental_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  pickup_location text NOT NULL,
  dropoff_location text NOT NULL,
  pickup_at timestamptz NOT NULL,
  return_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','active','completed','cancelled','rejected')),
  rental_days integer NOT NULL CHECK (rental_days > 0),
  daily_rate_usd numeric(12,2) NOT NULL CHECK (daily_rate_usd >= 0),
  estimated_total_usd numeric(12,2) NOT NULL CHECK (estimated_total_usd >= 0),
  customer_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (return_at > pickup_at)
);
CREATE INDEX IF NOT EXISTS rental_bookings_vehicle_dates_idx ON rental_bookings(vehicle_id, pickup_at, return_at);
CREATE INDEX IF NOT EXISTS rental_bookings_customer_created_idx ON rental_bookings(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS rental_bookings_status_idx ON rental_bookings(status, created_at DESC);

CREATE TABLE IF NOT EXISTS rental_booking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES rental_bookings(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rental_booking_events_booking_idx ON rental_booking_events(booking_id, created_at DESC);
