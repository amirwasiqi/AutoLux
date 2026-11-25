ALTER TABLE users ADD COLUMN IF NOT EXISTS first_login_recorded_at timestamptz;
CREATE TABLE IF NOT EXISTS contact_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, email text NOT NULL, phone text,
 subject text NOT NULL, message text NOT NULL,
 status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','read','replied','archived')),
 email_delivery_status text NOT NULL DEFAULT 'pending' CHECK(email_delivery_status IN ('pending','sent','failed')),
 email_delivery_error text, ip_address inet, user_agent text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contact_messages_created_idx ON contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS contact_messages_status_idx ON contact_messages(status,created_at DESC);
CREATE TABLE IF NOT EXISTS admin_settings(setting_key text PRIMARY KEY,setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,updated_by uuid REFERENCES users(id) ON DELETE SET NULL,updated_at timestamptz NOT NULL DEFAULT now());
