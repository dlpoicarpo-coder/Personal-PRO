-- ============================================================
-- PERSONAL PRO — Schedules Table & RLS Policies Patch
-- Execute no Supabase → SQL Editor
-- ============================================================

-- 1. Certificar que a tabela schedules existe e tem a estrutura correta
CREATE TABLE IF NOT EXISTS schedules (
  id          TEXT PRIMARY KEY,
  trainer_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar RLS se não estiver habilitado
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- 3. Limpar políticas antigas se existirem
DROP POLICY IF EXISTS "schedules_select" ON schedules;
DROP POLICY IF EXISTS "schedules_insert" ON schedules;
DROP POLICY IF EXISTS "schedules_update" ON schedules;
DROP POLICY IF EXISTS "schedules_delete" ON schedules;
DROP POLICY IF EXISTS "schedules_select_anonymous" ON schedules;

-- 4. Criar políticas para o treinador autenticado
CREATE POLICY "schedules_select" ON schedules FOR SELECT USING (auth.uid() = trainer_id);
CREATE POLICY "schedules_insert" ON schedules FOR INSERT WITH CHECK (auth.uid() = trainer_id);
CREATE POLICY "schedules_update" ON schedules FOR UPDATE USING (auth.uid() = trainer_id);
CREATE POLICY "schedules_delete" ON schedules FOR DELETE USING (auth.uid() = trainer_id);

-- 5. Criar políticas para o portal do aluno (acesso anônimo via anon key)
CREATE POLICY "schedules_select_anonymous" ON schedules FOR SELECT TO anon USING (true);

-- 6. Adicionar índice de performance se não existir
CREATE INDEX IF NOT EXISTS idx_schedules_trainer ON schedules(trainer_id);

-- 7. Adicionar trigger de atualização automática do campo updated_at
DROP TRIGGER IF EXISTS trg_schedules_updated_at ON schedules;
CREATE TRIGGER trg_schedules_updated_at
  BEFORE UPDATE ON schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
