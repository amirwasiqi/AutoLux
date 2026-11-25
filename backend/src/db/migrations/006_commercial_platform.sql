-- AutoLux commercial platform schema foundation. Safe to re-run via migration ledger.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS mfa_secret_encrypted text,
  ADD COLUMN IF NOT EXISTS mfa_pending_secret_encrypted text,
  ADD COLUMN IF NOT EXISTS mfa_enabled_at timestamptz,
  ADD COLUMN IF NOT EXISTS mfa_email_recovery_enabled boolean NOT NULL DEFAULT true;

INSERT INTO roles(name, description) VALUES
 ('driver_verification_staff','Review and approve customer driver documents')
ON CONFLICT(name) DO NOTHING;

INSERT INTO permissions(key, description) VALUES
 ('dashboard.read','Read administration dashboards'),
 ('users.read','Read customer and staff accounts'),
 ('users.manage','Manage customer and staff accounts'),
 ('roles.manage','Manage roles and granular permissions'),
 ('fleet.read','Read fleet records'),('fleet.manage','Create and manage fleet records'),
 ('rentals.read','Read rental reservations'),('rentals.manage','Manage rental lifecycle and contracts'),
 ('sales.read','Read vehicle sales leads and orders'),('sales.manage','Manage vehicle sales and partner listings'),
 ('partners.manage','Manage dealership partners and approvals'),
 ('products.read','Read product catalogue'),('products.manage','Manage products and supplier inventory'),
 ('orders.read','Read shop orders'),('orders.manage','Manage shop orders and fulfilment'),
 ('payments.read','Read payment transactions'),('payments.manage','Manage refunds and reconciliation'),
 ('drivers.read','Read driver verification submissions'),('drivers.manage','Review driver verification submissions'),
 ('branches.manage','Manage branches and vehicle transfers'),
 ('notifications.manage','Manage customer notifications'),
 ('reports.read','Read operational and financial reports'),
 ('settings.manage','Manage platform settings and integrations'),
 ('audit.read','Read audit and security events')
ON CONFLICT(key) DO NOTHING;

-- Permission mappings are intentionally explicit; super admins receive all permissions.
INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.name='super_admin'
ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r JOIN permissions p ON p.key = ANY(ARRAY[
 'dashboard.read','users.read','users.manage','fleet.read','fleet.manage','rentals.read','rentals.manage',
 'sales.read','sales.manage','partners.manage','products.read','products.manage','orders.read','orders.manage',
 'payments.read','payments.manage','drivers.read','drivers.manage','branches.manage','notifications.manage',
 'reports.read','settings.manage','audit.read'
]) WHERE r.name='company_admin' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r JOIN permissions p ON p.key = ANY(ARRAY['dashboard.read','fleet.read','fleet.manage','rentals.read','branches.manage'])
WHERE r.name='branch_manager' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r JOIN permissions p ON p.key = ANY(ARRAY['dashboard.read','fleet.read','fleet.manage','branches.manage'])
WHERE r.name='fleet_manager' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r JOIN permissions p ON p.key = ANY(ARRAY['dashboard.read','rentals.read','rentals.manage','drivers.read'])
WHERE r.name='rental_staff' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r JOIN permissions p ON p.key = ANY(ARRAY['dashboard.read','sales.read','sales.manage','partners.manage'])
WHERE r.name='sales_manager' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r JOIN permissions p ON p.key = ANY(ARRAY['dashboard.read','products.read','products.manage','orders.read','orders.manage'])
WHERE r.name='shop_manager' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r JOIN permissions p ON p.key = ANY(ARRAY['dashboard.read','payments.read','payments.manage','reports.read'])
WHERE r.name='finance_staff' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r JOIN permissions p ON p.key = ANY(ARRAY['dashboard.read','drivers.read','drivers.manage'])
WHERE r.name='driver_verification_staff' ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS reservation_holds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
 customer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 pickup_at timestamptz NOT NULL, return_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL, status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','converted','expired','released')),
 booking_id uuid REFERENCES rental_bookings(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(return_at>pickup_at)
);
CREATE INDEX IF NOT EXISTS reservation_holds_vehicle_dates_idx ON reservation_holds(vehicle_id,pickup_at,return_at) WHERE status='active';
CREATE INDEX IF NOT EXISTS reservation_holds_expiry_idx ON reservation_holds(expires_at) WHERE status='active';

CREATE TABLE IF NOT EXISTS dealership_partners (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), legal_name text NOT NULL, display_name text NOT NULL,
 contact_name text, contact_email text NOT NULL, contact_phone text, tax_id_encrypted text,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','suspended')),
 commission_rate numeric(6,3) NOT NULL DEFAULT 0 CHECK(commission_rate BETWEEN 0 AND 100),
 approved_by uuid REFERENCES users(id), approved_at timestamptz, notes text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS dealership_partner_users (
 partner_id uuid NOT NULL REFERENCES dealership_partners(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, partner_role text NOT NULL DEFAULT 'manager',
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(partner_id,user_id)
);
CREATE TABLE IF NOT EXISTS partner_vehicle_listings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), partner_id uuid NOT NULL REFERENCES dealership_partners(id),
 make text NOT NULL, model text NOT NULL, model_year integer NOT NULL CHECK(model_year BETWEEN 1900 AND 2200),
 vin_encrypted text, description text NOT NULL DEFAULT '', asking_price_usd numeric(14,2) NOT NULL CHECK(asking_price_usd>=0),
 mileage integer, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('draft','pending','approved','rejected','sold','withdrawn')),
 reviewed_by uuid REFERENCES users(id), reviewed_at timestamptz, review_note text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS partner_listings_status_idx ON partner_vehicle_listings(status,created_at DESC);
CREATE TABLE IF NOT EXISTS vehicle_sales_enquiries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), listing_id uuid REFERENCES partner_vehicle_listings(id) ON DELETE SET NULL,
 vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL, customer_id uuid REFERENCES users(id) ON DELETE SET NULL,
 name text NOT NULL, email text NOT NULL, phone text, message text NOT NULL,
 status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','contacted','qualified','converted','closed')),
 assigned_to uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS vehicle_sales_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_number text NOT NULL UNIQUE,
 enquiry_id uuid REFERENCES vehicle_sales_enquiries(id), listing_id uuid REFERENCES partner_vehicle_listings(id),
 customer_id uuid NOT NULL REFERENCES users(id), subtotal_usd numeric(14,2) NOT NULL CHECK(subtotal_usd>=0),
 deposit_due_usd numeric(14,2) NOT NULL DEFAULT 0 CHECK(deposit_due_usd>=0),
 deposit_paid_usd numeric(14,2) NOT NULL DEFAULT 0 CHECK(deposit_paid_usd>=0),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','awaiting_deposit','deposit_paid','completed','cancelled','refunded')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS suppliers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, contact_email text, contact_phone text,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','suspended')),
 fulfillment_mode text NOT NULL DEFAULT 'supplier' CHECK(fulfillment_mode IN ('autolux','supplier','hybrid')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS product_categories (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, slug text NOT NULL UNIQUE,
 description text NOT NULL DEFAULT '', is_active boolean NOT NULL DEFAULT true, sort_order integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS products (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), category_id uuid REFERENCES product_categories(id), supplier_id uuid REFERENCES suppliers(id),
 sku text NOT NULL UNIQUE, name text NOT NULL, slug text NOT NULL UNIQUE, description text NOT NULL DEFAULT '',
 price_usd numeric(14,2) NOT NULL CHECK(price_usd>=0), compare_at_usd numeric(14,2),
 fulfillment_mode text NOT NULL DEFAULT 'autolux' CHECK(fulfillment_mode IN ('autolux','supplier','hybrid')),
 is_active boolean NOT NULL DEFAULT false, published_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS product_inventory (
 product_id uuid PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
 on_hand integer NOT NULL DEFAULT 0 CHECK(on_hand>=0), reserved integer NOT NULL DEFAULT 0 CHECK(reserved>=0), reorder_level integer NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now(), CHECK(reserved<=on_hand)
);
CREATE TABLE IF NOT EXISTS shop_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_number text NOT NULL UNIQUE,
 customer_id uuid NOT NULL REFERENCES users(id), status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','processing','partially_shipped','shipped','delivered','cancelled','refunded')),
 currency char(3) NOT NULL DEFAULT 'USD', subtotal_usd numeric(14,2) NOT NULL, discount_usd numeric(14,2) NOT NULL DEFAULT 0,
 tax_usd numeric(14,2) NOT NULL DEFAULT 0, shipping_usd numeric(14,2) NOT NULL DEFAULT 0, total_usd numeric(14,2) NOT NULL,
 shipping_address jsonb NOT NULL, coupon_code text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS shop_order_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
 product_id uuid REFERENCES products(id) ON DELETE SET NULL, sku_snapshot text NOT NULL, name_snapshot text NOT NULL,
 quantity integer NOT NULL CHECK(quantity>0), unit_price_usd numeric(14,2) NOT NULL CHECK(unit_price_usd>=0), line_total_usd numeric(14,2) NOT NULL
);
CREATE TABLE IF NOT EXISTS shipments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
 carrier text, tracking_number text, tracking_url text, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','label_created','in_transit','delivered','exception','returned')),
 shipped_at timestamptz, delivered_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS coupons (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, discount_type text NOT NULL CHECK(discount_type IN ('percent','fixed')),
 discount_value numeric(12,2) NOT NULL CHECK(discount_value>0), starts_at timestamptz, ends_at timestamptz,
 max_redemptions integer, redemption_count integer NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS driver_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 document_type text NOT NULL CHECK(document_type IN ('license_front','license_back','identity_front','identity_back','proof_of_address')),
 storage_provider text NOT NULL DEFAULT 'pending', storage_key text, original_filename text NOT NULL,
 mime_type text NOT NULL, file_size_bytes bigint NOT NULL CHECK(file_size_bytes>0), checksum_sha256 text,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','under_review','verified','rejected','expired')),
 reviewed_by uuid REFERENCES users(id), reviewed_at timestamptz, review_note text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS driver_documents_review_idx ON driver_documents(status,created_at DESC);
CREATE TABLE IF NOT EXISTS driver_verification_checks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 provider text NOT NULL, provider_reference text, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','passed','failed','unavailable')),
 result_summary jsonb NOT NULL DEFAULT '{}'::jsonb, checked_at timestamptz
);

CREATE TABLE IF NOT EXISTS rental_contract_templates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, description text NOT NULL DEFAULT '',
 jurisdiction text NOT NULL DEFAULT 'US', is_active boolean NOT NULL DEFAULT false,
 created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS rental_contract_template_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), template_id uuid NOT NULL REFERENCES rental_contract_templates(id) ON DELETE CASCADE,
 version integer NOT NULL, body_markdown text NOT NULL, variables jsonb NOT NULL DEFAULT '[]'::jsonb,
 legal_review_status text NOT NULL DEFAULT 'pending' CHECK(legal_review_status IN ('pending','approved','rejected')),
 created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(template_id,version)
);
CREATE TABLE IF NOT EXISTS rental_contracts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL REFERENCES rental_bookings(id),
 template_version_id uuid REFERENCES rental_contract_template_versions(id), contract_number text NOT NULL UNIQUE,
 rendered_body text NOT NULL, snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','issued','accepted','declined','voided','expired')),
 pdf_storage_key text, issued_at timestamptz, accepted_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS contract_acceptances (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), contract_id uuid NOT NULL REFERENCES rental_contracts(id) ON DELETE CASCADE,
 signer_user_id uuid NOT NULL REFERENCES users(id), acceptance_method text NOT NULL,
 accepted_text_hash text NOT NULL, ip_address inet, user_agent text, accepted_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS rental_booking_changes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL REFERENCES rental_bookings(id) ON DELETE CASCADE,
 change_type text NOT NULL CHECK(change_type IN ('extension','early_return')),
 old_return_at timestamptz NOT NULL, new_return_at timestamptz NOT NULL,
 price_adjustment_usd numeric(14,2) NOT NULL DEFAULT 0, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 requested_by uuid REFERENCES users(id), reviewed_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_transactions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider text NOT NULL CHECK(provider IN ('stripe','paypal','manual')),
 provider_reference text, idempotency_key text UNIQUE, user_id uuid REFERENCES users(id),
 booking_id uuid REFERENCES rental_bookings(id), shop_order_id uuid REFERENCES shop_orders(id), sales_order_id uuid REFERENCES vehicle_sales_orders(id),
 amount_usd numeric(14,2) NOT NULL CHECK(amount_usd>=0), currency char(3) NOT NULL DEFAULT 'USD',
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','authorized','succeeded','failed','partially_refunded','refunded','cancelled')),
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_transactions_status_idx ON payment_transactions(status,created_at DESC);
CREATE TABLE IF NOT EXISTS payment_refunds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), transaction_id uuid NOT NULL REFERENCES payment_transactions(id),
 provider_reference text, amount_usd numeric(14,2) NOT NULL CHECK(amount_usd>0), reason text,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','succeeded','failed')), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS payment_webhook_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider text NOT NULL, event_id text NOT NULL,
 event_type text NOT NULL, payload jsonb NOT NULL, processed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(provider,event_id)
);

CREATE TABLE IF NOT EXISTS customer_notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 channel text NOT NULL CHECK(channel IN ('email','sms','in_app')), template_key text NOT NULL,
 subject text, body text NOT NULL, status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sent','failed','read')),
 provider_reference text, sent_at timestamptz, read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_notifications_user_idx ON customer_notifications(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS customer_communication_preferences (
 user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 email_enabled boolean NOT NULL DEFAULT true, sms_enabled boolean NOT NULL DEFAULT false,
 marketing_enabled boolean NOT NULL DEFAULT false, booking_updates boolean NOT NULL DEFAULT true,
 product_updates boolean NOT NULL DEFAULT true, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS vehicle_transfers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), vehicle_id uuid NOT NULL REFERENCES vehicles(id),
 from_branch_id uuid REFERENCES branches(id), to_branch_id uuid NOT NULL REFERENCES branches(id),
 status text NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','approved','in_transit','completed','cancelled')),
 requested_by uuid REFERENCES users(id), approved_by uuid REFERENCES users(id), scheduled_at timestamptz,
 completed_at timestamptz, notes text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS integration_status (
 integration_key text PRIMARY KEY, display_name text NOT NULL, status text NOT NULL DEFAULT 'pending_configuration'
 CHECK(status IN ('pending_configuration','configured','verified','disabled','error')),
 public_settings jsonb NOT NULL DEFAULT '{}'::jsonb, last_checked_at timestamptz, last_error text,
 updated_by uuid REFERENCES users(id), updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO integration_status(integration_key,display_name) VALUES
 ('google_oauth','Google Sign-In'),('gmail_delivery','Gmail Contact Delivery'),('stripe','Stripe Payments'),
 ('paypal','PayPal Payments'),('twilio','Twilio SMS'),('object_storage','Private Object Storage'),('driver_verification','Driver Verification Provider')
ON CONFLICT(integration_key) DO NOTHING;

-- Add branch references to the base fleet model if the original schema predates them.
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS inventory_source text NOT NULL DEFAULT 'company' CHECK(inventory_source IN ('company','partner','demo'));
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS inventory_verification_status text NOT NULL DEFAULT 'pending' CHECK(inventory_verification_status IN ('pending','verified','rejected'));
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS dealership_partner_id uuid REFERENCES dealership_partners(id);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS rental_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS sale_enabled boolean NOT NULL DEFAULT false;

-- Existing 100 catalog entries are demonstration records only until real inventory is verified.
UPDATE vehicles SET is_demo=true, inventory_source='demo', inventory_verification_status='pending',
  rental_enabled=false, sale_enabled=false, published=true WHERE is_demo=true;

CREATE TABLE IF NOT EXISTS mfa_email_recovery_codes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 code_hash text NOT NULL, expires_at timestamptz NOT NULL, consumed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mfa_email_recovery_user_idx ON mfa_email_recovery_codes(user_id,created_at DESC);


CREATE TABLE IF NOT EXISTS shopping_carts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','converted','abandoned')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS shopping_carts_one_active_per_customer ON shopping_carts(customer_id) WHERE status='active';
CREATE TABLE IF NOT EXISTS shopping_cart_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), cart_id uuid NOT NULL REFERENCES shopping_carts(id) ON DELETE CASCADE,
 product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE, quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 100),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(cart_id,product_id)
);
CREATE TABLE IF NOT EXISTS partner_commissions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), partner_id uuid NOT NULL REFERENCES dealership_partners(id),
 sales_order_id uuid NOT NULL REFERENCES vehicle_sales_orders(id), gross_amount_usd numeric(14,2) NOT NULL,
 commission_rate numeric(6,3) NOT NULL, commission_amount_usd numeric(14,2) NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','paid','voided')),
 approved_by uuid REFERENCES users(id), paid_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS financial_reconciliations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider text NOT NULL, period_start date NOT NULL, period_end date NOT NULL,
 currency char(3) NOT NULL DEFAULT 'USD', provider_total_usd numeric(14,2) NOT NULL DEFAULT 0,
 ledger_total_usd numeric(14,2) NOT NULL DEFAULT 0, difference_usd numeric(14,2) NOT NULL DEFAULT 0,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','matched','discrepancy','reviewed')),
 notes text, created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE shop_order_items ADD COLUMN IF NOT EXISTS fulfillment_mode text NOT NULL DEFAULT 'autolux';
ALTER TABLE shop_order_items ADD COLUMN IF NOT EXISTS supplier_id_snapshot uuid;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_code text;
ALTER TABLE partner_vehicle_listings ADD COLUMN IF NOT EXISTS photo_urls jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE partner_vehicle_listings ADD COLUMN IF NOT EXISTS mileage integer;
CREATE TABLE IF NOT EXISTS coupon_redemptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), coupon_id uuid NOT NULL REFERENCES coupons(id),
 shop_order_id uuid NOT NULL UNIQUE REFERENCES shop_orders(id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'reserved' CHECK(status IN ('reserved','redeemed','released')),
 created_at timestamptz NOT NULL DEFAULT now(), redeemed_at timestamptz
);
ALTER TABLE vehicle_images ADD COLUMN IF NOT EXISTS storage_key text;
ALTER TABLE vehicle_images ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'pending' CHECK(review_status IN ('pending','verified','rejected'));
ALTER TABLE vehicle_images ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES users(id);
ALTER TABLE vehicle_images ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
CREATE TABLE IF NOT EXISTS vehicle_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
 document_type text NOT NULL CHECK(document_type IN ('registration','ownership','insurance','inspection')),
 storage_key text NOT NULL, original_filename text NOT NULL, mime_type text NOT NULL,
 file_size_bytes bigint NOT NULL CHECK(file_size_bytes>0), status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','under_review','verified','rejected')),
 uploaded_by uuid REFERENCES users(id), reviewed_by uuid REFERENCES users(id), reviewed_at timestamptz, review_note text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vehicle_documents_review_idx ON vehicle_documents(vehicle_id,status,document_type);
ALTER TABLE vehicle_images ADD COLUMN IF NOT EXISTS file_size_bytes bigint;
ALTER TABLE rental_bookings ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid'
  CHECK(payment_status IN ('unpaid','pending','paid','failed','partially_refunded','refunded'));
