-- ============================================================
-- PERSONAL PRO — SQL Patch: RLS Policies for Exercise Media in Student Portal
-- Execute no Supabase → SQL Editor
-- ============================================================

-- 1. Habilitar RLS e permitir leitura anônima dos Exercícios (para exibir imagens e vídeos de execução)
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exercises_select_anonymous" ON exercises;
CREATE POLICY "exercises_select_anonymous" ON exercises FOR SELECT TO anon USING (true);

-- 2. Habilitar RLS e permitir leitura anônima dos Métodos de Treinamento
ALTER TABLE methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "methods_select_anonymous" ON methods;
CREATE POLICY "methods_select_anonymous" ON methods FOR SELECT TO anon USING (true);

-- Verificação das políticas de RLS
SELECT 
  tablename, 
  policyname, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename IN ('exercises', 'methods');
