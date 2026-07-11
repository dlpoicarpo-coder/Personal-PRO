-- =========================================================================
-- MIGRATION: PHASE 2 PIN DEPRECATION
-- Objective: Remove legacy PIN infrastructure, RPCs, and token policies.
-- =========================================================================

-- 1. Drop Anonymous RLS Policies that used x-student-token
DROP POLICY IF EXISTS "students_select_anonymous" ON public.students;
DROP POLICY IF EXISTS "workouts_select_anonymous" ON public.workouts;
DROP POLICY IF EXISTS "assessments_select_anonymous" ON public.assessments;
DROP POLICY IF EXISTS "macrocycles_select_anonymous" ON public.macrocycles;
DROP POLICY IF EXISTS "schedules_select_anonymous" ON public.schedules;
DROP POLICY IF EXISTS "sessions_select_anonymous" ON public.sessions;
DROP POLICY IF EXISTS "biofeedback_select_anonymous" ON public.biofeedback;
DROP POLICY IF EXISTS "financial_select_anonymous" ON public.financial;

-- 2. Drop RPCs for PIN authentication
DROP FUNCTION IF EXISTS public.verify_student_pin(text, text);
DROP FUNCTION IF EXISTS public.get_active_student_id();

-- 3. Drop legacy tables
DROP TABLE IF EXISTS public.student_sessions;
DROP TABLE IF EXISTS public.student_pin_attempts;

-- 4. Remove 'portalPin' from students table data JSONB (optional but recommended)
-- Only run this if 'portalPin' exists inside the 'data' JSONB column.
UPDATE public.students 
SET data = data - 'portalPin'
WHERE data ? 'portalPin';
