-- ============================================================
-- PERSONAL PRO v3 — Supabase Schema
-- Multi-tenant: cada trainer_id (auth.uid()) acessa só seus dados
-- Execute no Supabase → SQL Editor
-- ============================================================

-- ── 1. HABILITAR EXTENSÃO UUID ──────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABELAS PRINCIPAIS
-- Estrutura: id (text), trainer_id (uuid), data (jsonb)
-- ============================================================

-- Alunos
CREATE TABLE IF NOT EXISTS students (
  id          TEXT PRIMARY KEY,
  trainer_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Treinos Prescritos
CREATE TABLE IF NOT EXISTS workouts (
  id          TEXT PRIMARY KEY,
  trainer_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Sessões de Treino ao Vivo
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  trainer_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Agenda / Calendário
CREATE TABLE IF NOT EXISTS events (
  id          TEXT PRIMARY KEY,
  trainer_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Avaliações Físicas
CREATE TABLE IF NOT EXISTS assessments (
  id          TEXT PRIMARY KEY,
  trainer_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Biofeedback (pré/pós treino)
CREATE TABLE IF NOT EXISTS biofeedback (
  id          TEXT PRIMARY KEY,
  trainer_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Macrociclos de Periodização
CREATE TABLE IF NOT EXISTS macrocycles (
  id          TEXT PRIMARY KEY,
  trainer_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Ciclos de Treinamento
CREATE TABLE IF NOT EXISTS cycles (
  id          TEXT PRIMARY KEY,
  trainer_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Biblioteca de Exercícios
CREATE TABLE IF NOT EXISTS exercises (
  id          TEXT PRIMARY KEY,
  trainer_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Configurações do Treinador
CREATE TABLE IF NOT EXISTS settings (
  id          TEXT PRIMARY KEY,
  trainer_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Financeiro
CREATE TABLE IF NOT EXISTS financial (
  id          TEXT PRIMARY KEY,
  trainer_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Anamneses (formulários de novos alunos)
CREATE TABLE IF NOT EXISTS anamneses (
  id          TEXT PRIMARY KEY,
  trainer_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- pode ser preenchida antes do login
  data        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Notificações Dispensadas (persiste dismiss entre dispositivos)
CREATE TABLE IF NOT EXISTS notification_dismissed (
  id           TEXT NOT NULL,
  trainer_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY  (id, trainer_id)
);

-- ============================================================
-- ÍNDICES DE PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_students_trainer    ON students(trainer_id);
CREATE INDEX IF NOT EXISTS idx_workouts_trainer    ON workouts(trainer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_trainer    ON sessions(trainer_id);
CREATE INDEX IF NOT EXISTS idx_events_trainer      ON events(trainer_id);
CREATE INDEX IF NOT EXISTS idx_assessments_trainer ON assessments(trainer_id);
CREATE INDEX IF NOT EXISTS idx_biofeedback_trainer ON biofeedback(trainer_id);
CREATE INDEX IF NOT EXISTS idx_macrocycles_trainer ON macrocycles(trainer_id);
CREATE INDEX IF NOT EXISTS idx_cycles_trainer      ON cycles(trainer_id);
CREATE INDEX IF NOT EXISTS idx_exercises_trainer   ON exercises(trainer_id);
CREATE INDEX IF NOT EXISTS idx_settings_trainer    ON settings(trainer_id);
CREATE INDEX IF NOT EXISTS idx_financial_trainer   ON financial(trainer_id);
CREATE INDEX IF NOT EXISTS idx_notif_dismissed_trainer ON notification_dismissed(trainer_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — Isolamento Multi-Tenant
-- Cada trainer_id só acessa seus próprios dados
-- ============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE students    ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE biofeedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE macrocycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises   ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial   ENABLE ROW LEVEL SECURITY;
ALTER TABLE anamneses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_dismissed ENABLE ROW LEVEL SECURITY;

-- ── FUNÇÃO AUXILIAR (evita repetição) ───────────────────────
-- Cria políticas CRUD completas para uma tabela
-- SELECT / INSERT / UPDATE / DELETE apenas para o próprio trainer

-- Macro para cada tabela:

-- STUDENTS
CREATE POLICY "students_select" ON students FOR SELECT USING (auth.uid() = trainer_id);
CREATE POLICY "students_insert" ON students FOR INSERT WITH CHECK (auth.uid() = trainer_id);
CREATE POLICY "students_update" ON students FOR UPDATE USING (auth.uid() = trainer_id);
CREATE POLICY "students_delete" ON students FOR DELETE USING (auth.uid() = trainer_id);

-- WORKOUTS
CREATE POLICY "workouts_select" ON workouts FOR SELECT USING (auth.uid() = trainer_id);
CREATE POLICY "workouts_insert" ON workouts FOR INSERT WITH CHECK (auth.uid() = trainer_id);
CREATE POLICY "workouts_update" ON workouts FOR UPDATE USING (auth.uid() = trainer_id);
CREATE POLICY "workouts_delete" ON workouts FOR DELETE USING (auth.uid() = trainer_id);

-- SESSIONS
CREATE POLICY "sessions_select" ON sessions FOR SELECT USING (auth.uid() = trainer_id);
CREATE POLICY "sessions_insert" ON sessions FOR INSERT WITH CHECK (auth.uid() = trainer_id);
CREATE POLICY "sessions_update" ON sessions FOR UPDATE USING (auth.uid() = trainer_id);
CREATE POLICY "sessions_delete" ON sessions FOR DELETE USING (auth.uid() = trainer_id);

-- EVENTS
CREATE POLICY "events_select" ON events FOR SELECT USING (auth.uid() = trainer_id);
CREATE POLICY "events_insert" ON events FOR INSERT WITH CHECK (auth.uid() = trainer_id);
CREATE POLICY "events_update" ON events FOR UPDATE USING (auth.uid() = trainer_id);
CREATE POLICY "events_delete" ON events FOR DELETE USING (auth.uid() = trainer_id);

-- ASSESSMENTS
CREATE POLICY "assessments_select" ON assessments FOR SELECT USING (auth.uid() = trainer_id);
CREATE POLICY "assessments_insert" ON assessments FOR INSERT WITH CHECK (auth.uid() = trainer_id);
CREATE POLICY "assessments_update" ON assessments FOR UPDATE USING (auth.uid() = trainer_id);
CREATE POLICY "assessments_delete" ON assessments FOR DELETE USING (auth.uid() = trainer_id);

-- BIOFEEDBACK
CREATE POLICY "biofeedback_select" ON biofeedback FOR SELECT USING (auth.uid() = trainer_id);
CREATE POLICY "biofeedback_insert" ON biofeedback FOR INSERT WITH CHECK (true);
CREATE POLICY "biofeedback_update" ON biofeedback FOR UPDATE USING (auth.uid() = trainer_id);
CREATE POLICY "biofeedback_delete" ON biofeedback FOR DELETE USING (auth.uid() = trainer_id);

-- MACROCYCLES
CREATE POLICY "macrocycles_select" ON macrocycles FOR SELECT USING (auth.uid() = trainer_id);
CREATE POLICY "macrocycles_insert" ON macrocycles FOR INSERT WITH CHECK (auth.uid() = trainer_id);
CREATE POLICY "macrocycles_update" ON macrocycles FOR UPDATE USING (auth.uid() = trainer_id);
CREATE POLICY "macrocycles_delete" ON macrocycles FOR DELETE USING (auth.uid() = trainer_id);

-- CYCLES
CREATE POLICY "cycles_select" ON cycles FOR SELECT USING (auth.uid() = trainer_id);
CREATE POLICY "cycles_insert" ON cycles FOR INSERT WITH CHECK (auth.uid() = trainer_id);
CREATE POLICY "cycles_update" ON cycles FOR UPDATE USING (auth.uid() = trainer_id);
CREATE POLICY "cycles_delete" ON cycles FOR DELETE USING (auth.uid() = trainer_id);

-- EXERCISES
CREATE POLICY "exercises_select" ON exercises FOR SELECT USING (auth.uid() = trainer_id);
CREATE POLICY "exercises_insert" ON exercises FOR INSERT WITH CHECK (auth.uid() = trainer_id);
CREATE POLICY "exercises_update" ON exercises FOR UPDATE USING (auth.uid() = trainer_id);
CREATE POLICY "exercises_delete" ON exercises FOR DELETE USING (auth.uid() = trainer_id);

-- SETTINGS
CREATE POLICY "settings_select" ON settings FOR SELECT USING (auth.uid() = trainer_id);
CREATE POLICY "settings_insert" ON settings FOR INSERT WITH CHECK (auth.uid() = trainer_id);
CREATE POLICY "settings_update" ON settings FOR UPDATE USING (auth.uid() = trainer_id);
CREATE POLICY "settings_delete" ON settings FOR DELETE USING (auth.uid() = trainer_id);

-- FINANCIAL
CREATE POLICY "financial_select" ON financial FOR SELECT USING (auth.uid() = trainer_id);
CREATE POLICY "financial_insert" ON financial FOR INSERT WITH CHECK (auth.uid() = trainer_id);
CREATE POLICY "financial_update" ON financial FOR UPDATE USING (auth.uid() = trainer_id);
CREATE POLICY "financial_delete" ON financial FOR DELETE USING (auth.uid() = trainer_id);

-- ANAMNESES — acesso público para INSERT (aluno preenche sem login)
-- e acesso do trainer para ver as suas
CREATE POLICY "anamneses_insert_public" ON anamneses FOR INSERT WITH CHECK (true);
CREATE POLICY "anamneses_select_trainer" ON anamneses FOR SELECT USING (
  auth.uid() = trainer_id OR trainer_id IS NULL
);
CREATE POLICY "anamneses_update_trainer" ON anamneses FOR UPDATE USING (auth.uid() = trainer_id);
CREATE POLICY "anamneses_delete_trainer" ON anamneses FOR DELETE USING (auth.uid() = trainer_id);

-- NOTIFICATION_DISMISSED
CREATE POLICY "notif_dismissed_select" ON notification_dismissed FOR SELECT USING (auth.uid() = trainer_id);
CREATE POLICY "notif_dismissed_insert" ON notification_dismissed FOR INSERT WITH CHECK (auth.uid() = trainer_id);
CREATE POLICY "notif_dismissed_delete" ON notification_dismissed FOR DELETE USING (auth.uid() = trainer_id);

-- ============================================================
-- TRIGGER: atualizar updated_at automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em cada tabela
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'students','workouts','sessions','events','assessments',
    'biofeedback','macrocycles','cycles','exercises','settings',
    'financial','anamneses'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %s
       FOR EACH ROW EXECUTE FUNCTION update_updated_at();', t, t
    );
  END LOOP;
END $$;

-- ============================================================
-- CONFIGURAR EMAIL DE CONFIRMAÇÃO (Supabase Dashboard)
-- ============================================================
-- Acesse: Authentication → Settings → Email Auth
-- Habilite: "Enable Email Confirmations" = ON
-- Configure: "Site URL" = https://seu-projeto.vercel.app
-- Configure: "Redirect URLs" = https://seu-projeto.vercel.app/*

-- ============================================================
-- VERIFICAÇÃO FINAL
-- ============================================================
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'students','workouts','sessions','events','assessments',
    'biofeedback','macrocycles','cycles','exercises','settings',
    'financial','anamneses'
  )
ORDER BY tablename;
