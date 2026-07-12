-- ============================================================
-- VETOR â€” SQL Patch: RLS Policies for Exercise Media in Student Portal
-- Execute no Supabase â†’ SQL Editor
-- ============================================================

-- 1. Habilitar RLS e permitir leitura anÃ´nima dos ExercÃ­cios (para exibir imagens e vÃ­deos de execuÃ§Ã£o)
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exercises_select_anonymous" ON exercises;
CREATE POLICY "exercises_select_anonymous" ON exercises FOR SELECT TO anon USING (true);

-- 2. Habilitar RLS e permitir leitura anÃ´nima dos MÃ©todos de Treinamento
ALTER TABLE methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "methods_select_anonymous" ON methods;
CREATE POLICY "methods_select_anonymous" ON methods FOR SELECT TO anon USING (true);

-- VerificaÃ§Ã£o das polÃ­ticas de RLS
SELECT 
  tablename, 
  policyname, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename IN ('exercises', 'methods');

