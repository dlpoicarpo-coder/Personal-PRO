-- =========================================================================
-- MIGRATION: STUDENT PORTAL ZERO-TRUST AUTH
-- Objective: Fix the security issue where 'anon' could select all rows.
-- Uses a custom RPC and session token header to securely scope RLS.
-- =========================================================================

-- 1. Table to track wrong PIN attempts (Rate Limiting)
CREATE TABLE IF NOT EXISTS public.student_pin_attempts (
    student_id uuid PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,
    attempts int DEFAULT 0,
    last_attempt timestamptz DEFAULT now()
);

-- 2. Table to store valid student sessions
CREATE TABLE IF NOT EXISTS public.student_sessions (
    token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz DEFAULT now() + interval '7 days'
);

-- 3. Security Definer RPC to Verify PIN without exposing 'portalPin'
CREATE OR REPLACE FUNCTION public.verify_student_pin(p_student_id uuid, p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_correct_pin text;
    v_attempts int;
    v_last_attempt timestamptz;
    v_token uuid;
    v_trainer_id uuid;
BEGIN
    -- Obter tentativas anteriores
    SELECT attempts, last_attempt INTO v_attempts, v_last_attempt
    FROM public.student_pin_attempts 
    WHERE student_id = p_student_id;
    
    IF v_attempts IS NULL THEN 
        v_attempts := 0; 
    END IF;

    -- Bloqueio de 15 minutos após 5 tentativas falhas
    IF v_attempts >= 5 AND (now() - v_last_attempt) < interval '15 minutes' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Muitas tentativas falhas. Tente novamente em 15 minutos.');
    END IF;

    -- Resetar se passou de 15 min
    IF v_attempts >= 5 AND (now() - v_last_attempt) >= interval '15 minutes' THEN
        v_attempts := 0;
    END IF;

    -- Pegar o PIN correto e o trainer_id do estudante
    SELECT "portalPin", trainer_id INTO v_correct_pin, v_trainer_id 
    FROM public.students 
    WHERE id = p_student_id;
    
    IF v_correct_pin IS NULL OR p_pin != v_correct_pin THEN
        -- Registrar erro e atualizar o timestamp
        INSERT INTO public.student_pin_attempts (student_id, attempts, last_attempt)
        VALUES (p_student_id, v_attempts + 1, now())
        ON CONFLICT (student_id) DO UPDATE 
        SET attempts = EXCLUDED.attempts, last_attempt = EXCLUDED.last_attempt;
        
        RETURN jsonb_build_object('success', false, 'error', 'PIN incorreto.');
    END IF;

    -- Sucesso: zerar erros e criar nova sessão (token UUIDv4 gerado por padrão)
    DELETE FROM public.student_pin_attempts WHERE student_id = p_student_id;
    
    INSERT INTO public.student_sessions (student_id) 
    VALUES (p_student_id) 
    RETURNING token INTO v_token;
    
    RETURN jsonb_build_object('success', true, 'token', v_token, 'trainer_id', v_trainer_id);
END;
$$;

-- 4. Helper function to read the 'x-student-token' header sent by Supabase JS Client
CREATE OR REPLACE FUNCTION public.get_active_student_id() 
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
    SELECT student_id 
    FROM public.student_sessions 
    WHERE token::text = (current_setting('request.headers', true)::json->>'x-student-token')
      AND expires_at > now()
    LIMIT 1;
$$;


-- =========================================================================
-- 5. REPLACING ANONYMOUS POLICIES
-- Change from USING (true) to USING (student_id = public.get_active_student_id())
-- =========================================================================

-- Students (The student can only select their own record)
DROP POLICY IF EXISTS "students_select_anonymous" ON students;
CREATE POLICY "students_select_anonymous" ON students FOR SELECT TO anon
USING (id = public.get_active_student_id());

-- Workouts
DROP POLICY IF EXISTS "workouts_select_anonymous" ON workouts;
CREATE POLICY "workouts_select_anonymous" ON workouts FOR SELECT TO anon
USING (student_id = public.get_active_student_id());

-- Assessments
DROP POLICY IF EXISTS "assessments_select_anonymous" ON assessments;
CREATE POLICY "assessments_select_anonymous" ON assessments FOR SELECT TO anon
USING (student_id = public.get_active_student_id());

-- Macrocycles
DROP POLICY IF EXISTS "macrocycles_select_anonymous" ON macrocycles;
CREATE POLICY "macrocycles_select_anonymous" ON macrocycles FOR SELECT TO anon
USING (student_id = public.get_active_student_id());

-- Schedules
DROP POLICY IF EXISTS "schedules_select_anonymous" ON schedules;
CREATE POLICY "schedules_select_anonymous" ON schedules FOR SELECT TO anon
USING (student_id = public.get_active_student_id());

-- Sessions
DROP POLICY IF EXISTS "sessions_select_anonymous" ON sessions;
CREATE POLICY "sessions_select_anonymous" ON sessions FOR SELECT TO anon
USING (student_id = public.get_active_student_id());

-- Biofeedback
DROP POLICY IF EXISTS "biofeedback_select_anonymous" ON biofeedback;
CREATE POLICY "biofeedback_select_anonymous" ON biofeedback FOR SELECT TO anon
USING (student_id = public.get_active_student_id());

-- Financial
DROP POLICY IF EXISTS "financial_select_anonymous" ON financial;
CREATE POLICY "financial_select_anonymous" ON financial FOR SELECT TO anon
USING (student_id = public.get_active_student_id());
