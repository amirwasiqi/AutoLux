-- Phase 4: branch-aware reservation operations and payment state visibility.
ALTER TABLE rental_bookings
  ADD COLUMN IF NOT EXISTS pickup_branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dropoff_branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pickup_method text NOT NULL DEFAULT 'branch',
  ADD COLUMN IF NOT EXISTS dropoff_method text NOT NULL DEFAULT 'branch',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS cancellation_note text;

DO $$ BEGIN
  ALTER TABLE rental_bookings ADD CONSTRAINT rental_bookings_pickup_method_check CHECK (pickup_method IN ('branch','delivery'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE rental_bookings ADD CONSTRAINT rental_bookings_dropoff_method_check CHECK (dropoff_method IN ('branch','delivery'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE rental_bookings ADD CONSTRAINT rental_bookings_payment_status_check CHECK (payment_status IN ('unpaid','pending','paid','partially_refunded','refunded','failed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS rental_bookings_pickup_branch_idx ON rental_bookings(pickup_branch_id, pickup_at);
CREATE INDEX IF NOT EXISTS rental_bookings_payment_status_idx ON rental_bookings(payment_status, created_at DESC);
