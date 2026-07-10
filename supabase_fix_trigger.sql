-- ============================================================
-- PERSONAL PRO — Fix updated_at trigger mismatch
-- Run this script in the Supabase Console → SQL Editor
-- ============================================================

-- 1. Safely add updated_at and created_at columns to the sessions table if they do not exist
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Make the update_updated_at trigger function robust to handle camelCase or missing columns
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    NEW.updated_at = NOW();
  EXCEPTION WHEN undefined_column THEN
    BEGIN
      NEW."updatedAt" = NOW();
    EXCEPTION WHEN undefined_column THEN
      -- Do nothing if neither column exists in the table schema
    END;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
