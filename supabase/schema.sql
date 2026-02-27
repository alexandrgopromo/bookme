-- Schedules (spaces created by admin)
CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,         -- 8-char public identifier
  title text NOT NULL,
  created_at timestamptz DEFAULT now(),
  is_archived boolean DEFAULT false
);

-- Time slots belonging to a schedule
CREATE TABLE IF NOT EXISTS slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES schedules(id) ON DELETE CASCADE,
  slot_date date NOT NULL,
  slot_time time NOT NULL,
  is_booked boolean DEFAULT false
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid UNIQUE REFERENCES slots(id) ON DELETE CASCADE,
  schedule_id uuid REFERENCES schedules(id) ON DELETE CASCADE,
  full_name text NOT NULL,           -- stored as plain text (only admin sees it)
  pin_hash text NOT NULL,            -- bcrypt hash of 4-digit PIN
  booked_at timestamptz DEFAULT now(),
  changes_count integer DEFAULT 0
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES schedules(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  action text NOT NULL,              -- 'booked' | 'changed' | 'moved_by_admin' | 'cancelled'
  details jsonb,                     -- { from_slot, to_slot, actor }
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for this demo app context)
-- In a real app, we'd have stricter policies. 
-- Here we rely on the API (Service Role) for Admin actions and Anon key for public reads.

-- Public can read schedules and slots
CREATE POLICY "Public read schedules" ON schedules FOR SELECT USING (true);
CREATE POLICY "Public read slots" ON slots FOR SELECT USING (true);

-- Bookings: Public can't read details, only check availability via API logic
-- But for simplicity in this demo, we might allow reading own booking if we had auth.
-- Since we use PINs, the API handles verification.
-- We'll allow Service Role full access (default) and restrict Anon access.

-- Allow Anon to insert bookings (via API, but RLS applies to direct access)
-- Actually, we'll handle all writes via the Service Role in the API for security.
-- So we don't need permissive RLS policies for writes if we only use the Service Role key in the backend.
