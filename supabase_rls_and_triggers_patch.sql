-- ============================================================
-- PERSONAL PRO — RLS Policies and Triggers Safe Patch
-- Run this in the Supabase Console → SQL Editor
-- ============================================================

-- 1. Create or replace the update_updated_at trigger function safely
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Safe Trigger Cleanup & Setup for all tables
-- This prevents the script from failing if the triggers already exist
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'students','workouts','sessions','events','assessments',
    'biofeedback','macrocycles','schedules','cycles','exercises','settings',
    'financial','anamneses'
  ]
  LOOP
    -- Safely drop old trigger
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I;', t, t);
    
    -- Create the trigger
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at();', t, t
    );
  END LOOP;
END $$;

-- 3. Enable RLS on all tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE biofeedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE macrocycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial ENABLE ROW LEVEL SECURITY;
ALTER TABLE anamneses ENABLE ROW LEVEL SECURITY;

-- 4. Clean up old RLS policies to prevent duplicates
DROP POLICY IF EXISTS "students_select" ON students;
DROP POLICY IF EXISTS "students_insert" ON students;
DROP POLICY IF EXISTS "students_update" ON students;
DROP POLICY IF EXISTS "students_delete" ON students;
DROP POLICY IF EXISTS "students_select_anonymous" ON students;

DROP POLICY IF EXISTS "workouts_select" ON workouts;
DROP POLICY IF EXISTS "workouts_insert" ON workouts;
DROP POLICY IF EXISTS "workouts_update" ON workouts;
DROP POLICY IF EXISTS "workouts_delete" ON workouts;
DROP POLICY IF EXISTS "workouts_select_anonymous" ON workouts;

DROP POLICY IF EXISTS "sessions_select" ON sessions;
DROP POLICY IF EXISTS "sessions_insert" ON sessions;
DROP POLICY IF EXISTS "sessions_update" ON sessions;
DROP POLICY IF EXISTS "sessions_delete" ON sessions;
DROP POLICY IF EXISTS "sessions_select_anonymous" ON sessions;
DROP POLICY IF EXISTS "sessions_insert_anonymous" ON sessions;
DROP POLICY IF EXISTS "sessions_update_anonymous" ON sessions;

DROP POLICY IF EXISTS "events_select" ON events;
DROP POLICY IF EXISTS "events_insert" ON events;
DROP POLICY IF EXISTS "events_update" ON events;
DROP POLICY IF EXISTS "events_delete" ON events;

DROP POLICY IF EXISTS "assessments_select" ON assessments;
DROP POLICY IF EXISTS "assessments_insert" ON assessments;
DROP POLICY IF EXISTS "assessments_update" ON assessments;
DROP POLICY IF EXISTS "assessments_delete" ON assessments;
DROP POLICY IF EXISTS "assessments_select_anonymous" ON assessments;

DROP POLICY IF EXISTS "biofeedback_select" ON biofeedback;
DROP POLICY IF EXISTS "biofeedback_insert" ON biofeedback;
DROP POLICY IF EXISTS "biofeedback_update" ON biofeedback;
DROP POLICY IF EXISTS "biofeedback_delete" ON biofeedback;
DROP POLICY IF EXISTS "biofeedback_select_anonymous" ON biofeedback;
DROP POLICY IF EXISTS "biofeedback_update_anonymous" ON biofeedback;

DROP POLICY IF EXISTS "macrocycles_select" ON macrocycles;
DROP POLICY IF EXISTS "macrocycles_insert" ON macrocycles;
DROP POLICY IF EXISTS "macrocycles_update" ON macrocycles;
DROP POLICY IF EXISTS "macrocycles_delete" ON macrocycles;
DROP POLICY IF EXISTS "macrocycles_select_anonymous" ON macrocycles;

DROP POLICY IF EXISTS "schedules_select" ON schedules;
DROP POLICY IF EXISTS "schedules_insert" ON schedules;
DROP POLICY IF EXISTS "schedules_update" ON schedules;
DROP POLICY IF EXISTS "schedules_delete" ON schedules;
DROP POLICY IF EXISTS "schedules_select_anonymous" ON schedules;

DROP POLICY IF EXISTS "cycles_select" ON cycles;
DROP POLICY IF EXISTS "cycles_insert" ON cycles;
DROP POLICY IF EXISTS "cycles_update" ON cycles;
DROP POLICY IF EXISTS "cycles_delete" ON cycles;

DROP POLICY IF EXISTS "exercises_select" ON exercises;
DROP POLICY IF EXISTS "exercises_insert" ON exercises;
DROP POLICY IF EXISTS "exercises_update" ON exercises;
DROP POLICY IF EXISTS "exercises_delete" ON exercises;

DROP POLICY IF EXISTS "settings_select" ON settings;
DROP POLICY IF EXISTS "settings_insert" ON settings;
DROP POLICY IF EXISTS "settings_update" ON settings;
DROP POLICY IF EXISTS "settings_delete" ON settings;

DROP POLICY IF EXISTS "financial_select" ON financial;
DROP POLICY IF EXISTS "financial_insert" ON financial;
DROP POLICY IF EXISTS "financial_update" ON financial;
DROP POLICY IF EXISTS "financial_delete" ON financial;
DROP POLICY IF EXISTS "financial_select_anonymous" ON financial;

DROP POLICY IF EXISTS "anamneses_insert_public" ON anamneses;
DROP POLICY IF EXISTS "anamneses_select_trainer" ON anamneses;

-- 5. Re-create Trainer RLS Policies (Scoped by trainer_id)
CREATE POLICY "students_select" ON students FOR SELECT USING (auth.uid() = trainer_id);
CREATE POLICY "students_insert" ON students FOR INSERT WITH CHECK (auth.uid() = trainer_id);
CREATE POLICY "students_update" ON students FOR UPDATE USING (auth.uid() = trainer_id);
CREATE POLICY "students_delete" ON students FOR DELETE USING (auth.uid() = trainer_id);

CREATE POLICY "workouts_select" ON workouts FOR SELECT USING (auth.uid() = trainer_id);
CREATE POLICY "workouts_insert" ON workouts FOR INSERT WITH CHECK (auth.uid() = trainer_id);
CREATE POLICY "workouts_update" ON workouts FOR UPDATE USING (auth.uid() = trainer_id);
CREATE POLICY "workouts_delete" ON workouts FOR DELETE USING (auth.uid() = trainer_id);

CREATE POLICY "sessions_select" ON sessions FOR SELECT USING (auth.uid() = trainer_id);
CREATE POLICY "sessions_insert" ON sessions FOR INSERT WITH CHECK (auth.uid() = trainer_id);
CREATE POLICY "sessions_update" ON sessions FOR UPDATE USING (auth.uid() = trainer_id);
CREATE POLICY "sessions_delete" ON sessions FOR DELETE USING (auth.uid() = trainer_id);

CREATE POLICY "events_select" ON events FOR SELECT USING (auth.uid() = trainer_id);
CREATE POLICY "events_insert" ON events FOR INSERT WITH CHECK (auth.uid() = trainer_id);
CREATE POLICY "events_update" ON events FOR UPDATE USING (auth.uid() = trainer_id);
CREATE POLICY "events_delete" ON events FOR DELETE USING (auth.uid() = trainer_id);

CREATE POLICY "assessments_select" ON assessments FOR SELECT USING (auth.uid() = trainer_id);
CREATE POLICY "assessments_insert" ON assessments FOR INSERT WITH CHECK (auth.uid() = trainer_id);
CREATE POLICY "assessments_update" ON assessments FOR UPDATE USING (auth.uid() = trainer_id);
CREATE POLICY "assessments_delete" ON assessments FOR DELETE USING (auth.uid() = trainer_id);

CREATE POLICY "biofeedback_select" ON biofeedback FOR SELECT USING (auth.uid() = trainer_id);
CREATE POLICY "biofeedback_insert" ON biofeedback FOR INSERT WITH CHECK (true);
CREATE POLICY "biofeedback_update" ON biofeedback FOR UPDATE USING (auth.uid() = trainer_id);
CREATE POLICY "biofeedback_delete" ON biofeedback FOR DELETE USING (auth.uid() = trainer_id);

CREATE POLICY "macrocycles_select" ON macrocycles FOR SELECT USING (auth.uid() = trainer_id);
CREATE POLICY "macrocycles_insert" ON macrocycles FOR INSERT WITH CHECK (auth.uid() = trainer_id);
CREATE POLICY "macrocycles_update" ON macrocycles FOR UPDATE USING (auth.uid() = trainer_id);
CREATE POLICY "macrocycles_delete" ON macrocycles FOR DELETE USING (auth.uid() = trainer_id);

CREATE POLICY "schedules_select" ON schedules FOR SELECT USING (auth.uid() = trainer_id);
CREATE POLICY "schedules_insert" ON schedules FOR INSERT WITH CHECK (auth.uid() = trainer_id);
CREATE POLICY "schedules_update" ON schedules FOR UPDATE USING (auth.uid() = trainer_id);
CREATE POLICY "schedules_delete" ON schedules FOR DELETE USING (auth.uid() = trainer_id);

CREATE POLICY "cycles_select" ON cycles FOR SELECT USING (auth.uid() = trainer_id);
CREATE POLICY "cycles_insert" ON cycles FOR INSERT WITH CHECK (auth.uid() = trainer_id);
CREATE POLICY "cycles_update" ON cycles FOR UPDATE USING (auth.uid() = trainer_id);
CREATE POLICY "cycles_delete" ON cycles FOR DELETE USING (auth.uid() = trainer_id);

CREATE POLICY "exercises_select" ON exercises FOR SELECT USING (auth.uid() = trainer_id);
CREATE POLICY "exercises_insert" ON exercises FOR INSERT WITH CHECK (auth.uid() = trainer_id);
CREATE POLICY "exercises_update" ON exercises FOR UPDATE USING (auth.uid() = trainer_id);
CREATE POLICY "exercises_delete" ON exercises FOR DELETE USING (auth.uid() = trainer_id);

CREATE POLICY "settings_select" ON settings FOR SELECT USING (auth.uid() = trainer_id);
CREATE POLICY "settings_insert" ON settings FOR INSERT WITH CHECK (auth.uid() = trainer_id);
CREATE POLICY "settings_update" ON settings FOR UPDATE USING (auth.uid() = trainer_id);
CREATE POLICY "settings_delete" ON settings FOR DELETE USING (auth.uid() = trainer_id);

CREATE POLICY "financial_select" ON financial FOR SELECT USING (auth.uid() = trainer_id);
CREATE POLICY "financial_insert" ON financial FOR INSERT WITH CHECK (auth.uid() = trainer_id);
CREATE POLICY "financial_update" ON financial FOR UPDATE USING (auth.uid() = trainer_id);
CREATE POLICY "financial_delete" ON financial FOR DELETE USING (auth.uid() = trainer_id);

CREATE POLICY "anamneses_insert_public" ON anamneses FOR INSERT WITH CHECK (true);
CREATE POLICY "anamneses_select_trainer" ON anamneses FOR SELECT USING (auth.uid() = trainer_id);

-- 6. Re-create Anonymous/Public RLS Policies for Student Portal (anon access)
CREATE POLICY "students_select_anonymous" ON students FOR SELECT TO anon USING (true);
CREATE POLICY "workouts_select_anonymous" ON workouts FOR SELECT TO anon USING (true);
CREATE POLICY "assessments_select_anonymous" ON assessments FOR SELECT TO anon USING (true);
CREATE POLICY "macrocycles_select_anonymous" ON macrocycles FOR SELECT TO anon USING (true);
CREATE POLICY "schedules_select_anonymous" ON schedules FOR SELECT TO anon USING (true);

CREATE POLICY "sessions_select_anonymous" ON sessions FOR SELECT TO anon USING (true);
CREATE POLICY "sessions_insert_anonymous" ON sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "sessions_update_anonymous" ON sessions FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "biofeedback_select_anonymous" ON biofeedback FOR SELECT TO anon USING (true);
CREATE POLICY "biofeedback_update_anonymous" ON biofeedback FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "financial_select_anonymous" ON financial FOR SELECT TO anon USING (true);

-- 7. Add helpful performance indexes
CREATE INDEX IF NOT EXISTS idx_students_trainer_id ON students(trainer_id);
CREATE INDEX IF NOT EXISTS idx_workouts_trainer_id ON workouts(trainer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_trainer_id ON sessions(trainer_id);
CREATE INDEX IF NOT EXISTS idx_assessments_trainer_id ON assessments(trainer_id);
CREATE INDEX IF NOT EXISTS idx_biofeedback_trainer_id ON biofeedback(trainer_id);
CREATE INDEX IF NOT EXISTS idx_macrocycles_trainer_id ON macrocycles(trainer_id);
CREATE INDEX IF NOT EXISTS idx_schedules_trainer_id ON schedules(trainer_id);
CREATE INDEX IF NOT EXISTS idx_cycles_trainer_id ON cycles(trainer_id);
CREATE INDEX IF NOT EXISTS idx_exercises_trainer_id ON exercises(trainer_id);
CREATE INDEX IF NOT EXISTS idx_settings_trainer_id ON settings(trainer_id);
CREATE INDEX IF NOT EXISTS idx_financial_trainer_id ON financial(trainer_id);
CREATE INDEX IF NOT EXISTS idx_anamneses_trainer_id ON anamneses(trainer_id);
