-- ============================
-- KLYRA PARKING SYSTEM - UNIFIED LOGIC
-- Version: 3.0 (Bugfixes + Cron)
-- Fixes: Spot availability logic, enables cron, schedules jobs.
-- Safe to re-run.
-- ============================

-- Required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;    -- for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS btree_gist;  -- for EXCLUDE USING GIST
CREATE EXTENSION IF NOT EXISTS pg_cron;     -- for scheduling jobs

-- ============================
-- CLEANUP (safe drops)
-- ============================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
             WHERE c.relname = 'bookings' AND n.nspname = current_schema()) THEN
    DROP TRIGGER IF EXISTS booking_buffer_trigger ON bookings;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
             WHERE c.relname = 'sensor_data' AND n.nspname = current_schema()) THEN
    DROP TRIGGER IF EXISTS update_sensor_data_timestamp ON sensor_data;
    DROP TRIGGER IF EXISTS update_spot_availability_trigger ON sensor_data;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE c.relname = 'users' AND n.nspname = 'auth'
  ) THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  END IF;
EXCEPTION WHEN others THEN
  NULL;
END;
$$;

-- Drop functions and tables (order-independent)
DROP FUNCTION IF EXISTS check_and_handle_overstay() CASCADE;
DROP FUNCTION IF EXISTS handle_upcoming_bookings_for_overstay(UUID) CASCADE;
DROP FUNCTION IF EXISTS check_upcoming_bookings_before_start() CASCADE;
DROP FUNCTION IF EXISTS update_spot_availability_from_sensor() CASCADE;
DROP FUNCTION IF EXISTS extend_booking(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS redeem_coupon(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS set_buffer_end_time() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS debug_handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_sensor_timestamp() CASCADE;
DROP FUNCTION IF EXISTS create_user_profile(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_spot_availability() CASCADE;
DROP FUNCTION IF EXISTS handle_overstay(UUID) CASCADE;
DROP FUNCTION IF EXISTS process_overstay_penalties() CASCADE;

DROP TABLE IF EXISTS callback_requests CASCADE;
DROP TABLE IF EXISTS contact_us_requests CASCADE;
DROP TABLE IF EXISTS security_alerts CASCADE;
DROP TABLE IF EXISTS transaction_history CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS sensor_data CASCADE;
DROP TABLE IF EXISTS parking_spots CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS admins CASCADE;

-- ============================
-- ADMINS
-- ============================
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

INSERT INTO admins (username, password)
VALUES ('admin_klyraa', 'KlyraAdmin123')
ON CONFLICT (username) DO NOTHING;

-- ============================
-- PROFILES
-- ============================
CREATE TABLE profiles (
  id UUID PRIMARY KEY, -- will reference auth.users(id)
  username TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  credit_balance DECIMAL(10,2) DEFAULT 500.00 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================
-- TRANSACTION HISTORY
-- ============================
CREATE TABLE transaction_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================
-- COUPONS
-- ============================
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  max_uses INTEGER NOT NULL DEFAULT 1,
  used_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT valid_uses CHECK (used_count <= max_uses)
);

-- ============================
-- PARKING SPOTS
-- ============================
CREATE TABLE parking_spots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_number TEXT UNIQUE NOT NULL,
  location TEXT NOT NULL,
  camera_feed_url TEXT,
  is_available BOOLEAN DEFAULT true NOT NULL,
  sensor_id TEXT UNIQUE, -- maps to sensor_data.sensor_id
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================
-- SENSOR DATA
-- ============================
CREATE TABLE sensor_data (
  sensor_id TEXT PRIMARY KEY,
  is_occupied BOOLEAN DEFAULT false NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================
-- BOOKINGS (with is_completed BOOLEAN)
-- ============================
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  spot_id UUID NOT NULL REFERENCES parking_spots(id) ON DELETE CASCADE,
  vehicle_number TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  buffer_end_time TIMESTAMPTZ NOT NULL,
  total_cost DECIMAL(10, 2) NOT NULL,
  actual_end_time TIMESTAMPTZ,
  is_completed BOOLEAN DEFAULT false NOT NULL,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT valid_booking_time CHECK (end_time > start_time),
  -- Exclude overlapping active bookings on same spot
  EXCLUDE USING GIST (
    spot_id WITH =,
    tstzrange(start_time, buffer_end_time) WITH &&
  ) WHERE (is_completed = false)
);

-- Trigger: automatically set buffer_end_time
CREATE OR REPLACE FUNCTION set_buffer_end_time()
RETURNS TRIGGER AS $$
BEGIN
  NEW.buffer_end_time := NEW.end_time + INTERVAL '5 minutes';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_buffer_trigger
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_buffer_end_time();

-- ============================
-- CALLBACK REQUESTS
-- ============================
CREATE TABLE callback_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile_number TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================
-- CONTACT US REQUESTS
-- ============================
CREATE TABLE contact_us_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================
-- SECURITY ALERTS
-- ============================
CREATE TABLE security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  spot_id UUID REFERENCES parking_spots(id) ON DELETE SET NULL,
  spot_number TEXT,
  location TEXT,
  vehicle_number TEXT,
  screenshot_url TEXT,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'reviewing', 'resolved')),
  resolved_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================
-- Triggers to keep sensor updated_at fresh
-- ============================
CREATE OR REPLACE FUNCTION update_sensor_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sensor_data_timestamp
  BEFORE UPDATE ON sensor_data
  FOR EACH ROW
  EXECUTE FUNCTION update_sensor_timestamp();

-- ============================
-- Auth user -> profiles trigger
-- ============================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert new profile with 500 credit balance
  INSERT INTO public.profiles (id, username, email, credit_balance)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'User'),
    COALESCE(NEW.email, 'default@example.com'),
    500.00
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Add signup bonus transaction
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    INSERT INTO public.transaction_history (user_id, amount, description)
    VALUES (
      NEW.id,
      500.00,
      'Sign up Bonus'
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only create the trigger if auth.users exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE c.relname = 'users' AND n.nspname = 'auth'
  ) THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION handle_new_user();
  ELSE
    RAISE NOTICE 'auth.users not found — skipping auth trigger creation.';
  END IF;
END;
$$;

-- ============================
-- Extend booking function
-- ============================
CREATE OR REPLACE FUNCTION extend_booking(
  p_booking_id UUID,
  p_extension_minutes INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_booking RECORD;
  v_new_end_time TIMESTAMPTZ;
  v_new_buffer_end_time TIMESTAMPTZ;
  v_extension_cost DECIMAL(10, 2);
  v_user_balance DECIMAL(10, 2);
  v_cost_per_hour DECIMAL(10, 2) := 50.00;
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id AND is_completed = false;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Booking not found or already completed');
  END IF;

  v_new_end_time := v_booking.end_time + (p_extension_minutes || ' minutes')::INTERVAL;
  v_new_buffer_end_time := v_new_end_time + INTERVAL '5 minutes';

  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE spot_id = v_booking.spot_id
      AND id != p_booking_id
      AND is_completed = false
      AND tstzrange(start_time, buffer_end_time) && tstzrange(v_booking.end_time, v_new_buffer_end_time)
  ) THEN
    RETURN json_build_object('success', false, 'message', 'Cannot extend: conflicts with next booking');
  END IF;

  v_extension_cost := (p_extension_minutes::DECIMAL / 60) * v_cost_per_hour;

  SELECT credit_balance INTO v_user_balance FROM profiles WHERE id = v_booking.user_id;
  IF v_user_balance < v_extension_cost THEN
    RETURN json_build_object('success', false, 'message', 'Insufficient balance');
  END IF;

  UPDATE bookings
  SET end_time = v_new_end_time,
      buffer_end_time = v_new_buffer_end_time,
      total_cost = total_cost + v_extension_cost
  WHERE id = p_booking_id;

  UPDATE profiles SET credit_balance = credit_balance - v_extension_cost WHERE id = v_booking.user_id;

  INSERT INTO transaction_history (user_id, amount, description)
  VALUES (v_booking.user_id, -v_extension_cost, 'Booking Extension - ' || p_extension_minutes || ' minutes');

  RETURN json_build_object('success', true, 'message', 'Booking extended successfully', 'new_end_time', v_new_end_time, 'extension_cost', v_extension_cost);
END;
$$ LANGUAGE plpgsql;

-- ============================
-- Redeem coupon
-- ============================
CREATE OR REPLACE FUNCTION redeem_coupon(
  p_user_id UUID,
  p_coupon_code TEXT
)
RETURNS JSON AS $$
DECLARE
  v_coupon RECORD;
BEGIN
  SELECT * INTO v_coupon
  FROM coupons
  WHERE UPPER(code) = UPPER(TRIM(p_coupon_code))
    AND is_active = true
    AND used_count < max_uses
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Invalid or expired coupon code');
  END IF;

  UPDATE coupons SET used_count = used_count + 1 WHERE id = v_coupon.id;
  UPDATE profiles SET credit_balance = credit_balance + v_coupon.amount WHERE id = p_user_id;

  INSERT INTO transaction_history (user_id, amount, description)
  VALUES (p_user_id, v_coupon.amount, 'Coupon Redeemed - ' || v_coupon.code);

  RETURN json_build_object('success', true, 'message', 'Coupon redeemed successfully', 'amount', v_coupon.amount);
END;
$$ LANGUAGE plpgsql;

-- ============================
-- Handle upcoming (overstay)
-- ============================
CREATE OR REPLACE FUNCTION handle_upcoming_bookings_for_overstay(p_spot_id UUID)
RETURNS VOID AS $$
DECLARE
  v_upcoming_booking RECORD;
  v_alternative_spot RECORD;
BEGIN
  FOR v_upcoming_booking IN
    SELECT *
    FROM bookings
    WHERE spot_id = p_spot_id
      AND is_completed = false
      AND start_time > NOW()
      AND start_time <= NOW() + INTERVAL '5 minutes'
    ORDER BY start_time
  LOOP
    SELECT id, spot_number, location INTO v_alternative_spot
    FROM parking_spots
    WHERE is_available = TRUE
      AND id != p_spot_id
      AND NOT EXISTS (
        SELECT 1 FROM bookings
        WHERE spot_id = parking_spots.id
          AND is_completed = false
          AND tstzrange(start_time, buffer_end_time) &&
              tstzrange(v_upcoming_booking.start_time, v_upcoming_booking.buffer_end_time)
      )
    LIMIT 1;

    IF FOUND THEN
      UPDATE bookings
      SET spot_id = v_alternative_spot.id,
          cancellation_reason = 'Automatically reassigned from Spot ' ||
                (SELECT spot_number FROM parking_spots WHERE id = p_spot_id) ||
                ' to Spot ' || v_alternative_spot.spot_number || ' due to previous booking overstay.'
      WHERE id = v_upcoming_booking.id;

      INSERT INTO transaction_history (user_id, amount, description)
      VALUES (v_upcoming_booking.user_id, 0, '⚠️ Booking Reassigned - New spot: ' || v_alternative_spot.spot_number || ' at ' || v_alternative_spot.location);
    ELSE
      UPDATE bookings
      SET is_completed = true, 
          cancellation_reason = 'Booking cancelled due to previous booking overstay. No alternative spots available. Full refund issued.'
      WHERE id = v_upcoming_booking.id;

      UPDATE profiles SET credit_balance = credit_balance + v_upcoming_booking.total_cost WHERE id = v_upcoming_booking.user_id;

      INSERT INTO transaction_history (user_id, amount, description)
      VALUES (v_upcoming_booking.user_id, v_upcoming_booking.total_cost, '💰 Full Refund - Booking cancelled due to overstay (No alternative spots available)');
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================
-- Check upcoming bookings (for scheduler)
-- ============================
CREATE OR REPLACE FUNCTION check_upcoming_bookings_before_start()
RETURNS JSON AS $$
DECLARE
  v_booking RECORD;
  v_sensor_status BOOLEAN;
  v_alternative_spot RECORD;
  v_reassigned_count INTEGER := 0;
  v_cancelled_count INTEGER := 0;
BEGIN
  FOR v_booking IN
    SELECT b.*, ps.sensor_id, ps.spot_number, ps.location
    FROM bookings b
    JOIN parking_spots ps ON b.spot_id = ps.id
    WHERE b.is_completed = false
      AND b.start_time > NOW()
      AND b.start_time <= NOW() + INTERVAL '5 minutes' -- Check 5 mins out
      AND b.start_time > NOW() + INTERVAL '4 minutes'  -- Only in this 1-min window
  LOOP
    SELECT is_occupied INTO v_sensor_status
    FROM sensor_data
    WHERE sensor_id = v_booking.sensor_id
      AND updated_at > NOW() - INTERVAL '2 minutes'; -- Ensure sensor data is fresh

    IF v_sensor_status = TRUE THEN
      -- Spot is occupied! Try to reassign.
      SELECT id, spot_number, location INTO v_alternative_spot
      FROM parking_spots
      WHERE is_available = TRUE
        AND id != v_booking.spot_id
        AND NOT EXISTS (
          SELECT 1 FROM bookings
          WHERE spot_id = parking_spots.id
            AND is_completed = false
            AND tstzrange(start_time, buffer_end_time) &&
                tstzrange(v_booking.start_time, v_booking.buffer_end_time)
        )
      LIMIT 1;

      IF FOUND THEN
        -- Reassign
        UPDATE bookings
        SET spot_id = v_alternative_spot.id,
            cancellation_reason = 'Auto-reassigned from ' || v_booking.spot_number || ' to ' || v_alternative_spot.spot_number || ' (original spot still occupied)'
        WHERE id = v_booking.id;

        INSERT INTO transaction_history (user_id, amount, description)
        VALUES (v_booking.user_id, 0, '⚠️ Booking Reassigned - New Spot: ' || v_alternative_spot.spot_number);

        v_reassigned_count := v_reassigned_count + 1;
      ELSE
        -- Cancel and Refund
        UPDATE bookings
        SET is_completed = true,
            cancellation_reason = 'Cancelled - Original spot occupied, no alternatives available. Full refund issued.'
        WHERE id = v_booking.id;

        UPDATE profiles SET credit_balance = credit_balance + v_booking.total_cost WHERE id = v_booking.user_id;

        INSERT INTO transaction_history (user_id, amount, description)
        VALUES (v_booking.user_id, v_booking.total_cost, '💰 Full Refund - Booking cancelled (spot occupied, no alternatives)');

        v_cancelled_count := v_cancelled_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN json_build_object('success', true, 'reassigned', v_reassigned_count, 'cancelled', v_cancelled_count);
END;
$$ LANGUAGE plpgsql;

-- ============================
-- Sync spot availability (for scheduler)
-- ============================
CREATE OR REPLACE FUNCTION update_spot_availability_from_sensor()
RETURNS JSON AS $$
DECLARE
  v_spot RECORD;
  v_has_active_booking BOOLEAN;
  v_updated_count INTEGER := 0;
BEGIN
  FOR v_spot IN
    SELECT ps.*, sd.is_occupied, sd.updated_at as sensor_updated
    FROM parking_spots ps
    LEFT JOIN sensor_data sd ON ps.sensor_id = sd.sensor_id
  LOOP
    -- Check for an active booking
    SELECT EXISTS (
      SELECT 1 FROM bookings
      WHERE spot_id = v_spot.id
        AND is_completed = false
        AND NOW() BETWEEN start_time AND buffer_end_time
    ) INTO v_has_active_booking;

    -- Case 1: Spot is (or should be) available
    -- (No active booking AND sensor is not occupied)
    IF NOT v_has_active_booking AND (v_spot.is_occupied = FALSE OR v_spot.is_occupied IS NULL) THEN
      UPDATE parking_spots SET is_available = TRUE WHERE id = v_spot.id AND is_available = FALSE;
      IF FOUND THEN v_updated_count := v_updated_count + 1; END IF;
    END IF;

    -- Case 2: Spot is unavailable (unauthorized car)
    -- (No active booking AND sensor IS occupied)
    IF NOT v_has_active_booking AND v_spot.is_occupied = TRUE THEN
      UPDATE parking_spots SET is_available = FALSE WHERE id = v_spot.id AND is_available = TRUE;
      IF FOUND THEN v_updated_count := v_updated_count + 1; END IF;
    END IF;

    -- Case 3: Spot has an authorized car
    -- (HAS active booking AND sensor IS occupied)
    -- We ensure is_available is TRUE so future bookings can be made
    IF v_has_active_booking AND v_spot.is_occupied = TRUE THEN
        UPDATE parking_spots SET is_available = TRUE WHERE id = v_spot.id AND is_available = FALSE;
        IF FOUND THEN v_updated_count := v_updated_count + 1; END IF;
    END IF;

  END LOOP;

  RETURN json_build_object('success', true, 'spots_updated', v_updated_count);
END;
$$ LANGUAGE plpgsql;

-- ============================
-- Manual profile creation helper
-- ============================
CREATE OR REPLACE FUNCTION create_user_profile(
  p_user_id UUID,
  p_username TEXT,
  p_email TEXT
)
RETURNS JSON AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RETURN json_build_object('success', false, 'message', 'Profile already exists for this user');
  END IF;

  INSERT INTO profiles (id, username, email)
  VALUES (p_user_id, p_username, p_email);

  RETURN json_build_object('success', true, 'message', 'Profile created successfully');
EXCEPTION WHEN others THEN
  RETURN json_build_object('success', false, 'message', 'Error creating profile: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;


-- =====================================================
-- == !! CORE LOGIC FIX !! ==
-- This trigger function fixes the availability bug.
-- =====================================================
CREATE OR REPLACE FUNCTION update_spot_availability()
RETURNS TRIGGER AS $$
DECLARE
    v_booking RECORD;
    v_overstay_minutes DECIMAL(10, 2);
    v_overstay_penalty DECIMAL(10, 2);
    v_has_active_booking BOOLEAN;
BEGIN
    
    -- Case 1: Vehicle LEAVES (Sensor changes from TRUE to FALSE)
    IF OLD.is_occupied = TRUE AND NEW.is_occupied = FALSE THEN
        
        -- Find and complete the active booking for this spot
        FOR v_booking IN
            SELECT b.*, ps.spot_number
            FROM bookings b
            JOIN parking_spots ps ON b.spot_id = ps.id
            WHERE ps.sensor_id = NEW.sensor_id
            AND b.is_completed = false
            AND b.start_time <= NOW() -- Find booking that was active
        LOOP
            -- Check if vehicle left after booking end time (overstay)
            IF NOW() > v_booking.end_time THEN
                v_overstay_minutes := EXTRACT(EPOCH FROM (NOW() - v_booking.end_time)) / 60;
                v_overstay_penalty := v_overstay_minutes * 1.5;
                
                UPDATE profiles
                SET credit_balance = credit_balance - v_overstay_penalty
                WHERE id = v_booking.user_id;
                
                INSERT INTO transaction_history (user_id, amount, description)
                VALUES (
                    v_booking.user_id,
                    -v_overstay_penalty,
                    'Overstay Penalty - Spot ' || v_booking.spot_number || ' (' || ROUND(v_overstay_minutes, 2) || ' min @ ₹1.5/min)'
                );
            END IF;
            
            -- Complete the booking
            UPDATE bookings
            SET is_completed = true,
                actual_end_time = NOW()
            WHERE id = v_booking.id;
        END LOOP;
        
        -- Now that the spot is empty, mark it as available
        UPDATE parking_spots
        SET is_available = TRUE
        WHERE sensor_id = NEW.sensor_id;

    -- Case 2: Vehicle ARRIVES (Sensor changes from FALSE to TRUE)
    ELSIF OLD.is_occupied = FALSE AND NEW.is_occupied = TRUE THEN
        
        -- Check if this arrival corresponds to an active, valid booking
        SELECT EXISTS (
            SELECT 1
            FROM bookings b
            JOIN parking_spots ps ON b.spot_id = ps.id
            WHERE ps.sensor_id = NEW.sensor_id
              AND b.is_completed = false
              AND NOW() BETWEEN b.start_time AND b.buffer_end_time
        ) INTO v_has_active_booking;

        -- If NO active booking, it's an unauthorized car. Mark spot as UNAVAILABLE.
        IF NOT v_has_active_booking THEN
            UPDATE parking_spots
            SET is_available = FALSE
            WHERE sensor_id = NEW.sensor_id;
        -- If YES, it's a valid booking.
        -- We do NOTHING and leave is_available = TRUE.
        -- This fixes your bug and allows future bookings.
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- (Re)create the trigger to use the fixed function
DROP TRIGGER IF EXISTS update_spot_availability_trigger ON sensor_data;
CREATE TRIGGER update_spot_availability_trigger
AFTER UPDATE ON sensor_data
FOR EACH ROW
EXECUTE FUNCTION update_spot_availability();

-- ============================
-- == !! CRON JOBS (Automatic Scheduling) !! ==
-- This schedules your refund and sync functions.
-- ============================

-- 1. Check for upcoming bookings 5 mins before start (for refunds/reassignment)
--    Runs every minute.
SELECT cron.schedule(
  'check-upcoming-bookings', -- A unique name for this job
  '* * * * *',               -- The schedule: "run every minute"
  'SELECT check_upcoming_bookings_before_start();' -- The function to run
);

-- 2. Failsafe sync for spot availability (in case a trigger fails)
--    Runs every 5 minutes.
SELECT cron.schedule(
  'sync-spot-availability', -- A unique name for this job
  '*/2 * * * *',            -- The schedule: "run every 2 minutes"
  'SELECT update_spot_availability_from_sensor();' -- The function to run
);

-- ============================
-- Indexes for performance
-- ============================
CREATE INDEX IF NOT EXISTS idx_transaction_history_user_id ON transaction_history(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_history_created_at ON transaction_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_is_completed ON bookings(is_completed);
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_parking_spots_available ON parking_spots(is_available);
CREATE INDEX IF NOT EXISTS idx_callback_requests_created_at ON callback_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_us_created_at ON contact_us_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_status ON security_alerts(status);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at DESC);

-- ============================
-- Sample data
-- ============================
INSERT INTO parking_spots (spot_number, location, camera_feed_url, is_available, sensor_id)
VALUES 
  ('A-101', 'Sec. A', 'https://example.com/camera/a101', true, 's1'),
  ('B-202', 'Sec. B', 'https://example.com/camera/a102', true, 's2'),
  ('C-303', 'Sec. C', 'https://example.com/camera/b201', true, 's3')
ON CONFLICT (spot_number) DO NOTHING;

INSERT INTO sensor_data (sensor_id, is_occupied, updated_at)
VALUES 
  ('s1', false, NOW()),
  ('s2', false, NOW()),
  ('s3', false, NOW())
ON CONFLICT (sensor_id) DO NOTHING;

-- ============================
-- FINISH
-- ============================
DO $$
BEGIN
  RAISE NOTICE '✅ Klyra schema 3.0 (with bugfixes and cron jobs) install/upgrade complete.';
END;
$$;