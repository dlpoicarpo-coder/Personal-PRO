-- ============================================================
-- PERSONAL PRO — Tabela de Notificações Dispensadas
-- Permite que o dismiss persista entre dispositivos por trainer
-- Execute no Supabase → SQL Editor
-- ============================================================

-- Tabela de notificações dispensadas
CREATE TABLE IF NOT EXISTS notification_dismissed (
  id          TEXT NOT NULL,           -- ID da notificação (ex: "eval-vencida-abc123")
  trainer_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, trainer_id)
);

-- Índice para busca rápida por trainer
CREATE INDEX IF NOT EXISTS idx_notif_dismissed_trainer ON notification_dismissed(trainer_id);

-- RLS
ALTER TABLE notification_dismissed ENABLE ROW LEVEL SECURITY;

-- Cada trainer só vê/gerencia seus próprios dismisses
CREATE POLICY "notif_dismissed_select" ON notification_dismissed
  FOR SELECT USING (auth.uid() = trainer_id);

CREATE POLICY "notif_dismissed_insert" ON notification_dismissed
  FOR INSERT WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "notif_dismissed_delete" ON notification_dismissed
  FOR DELETE USING (auth.uid() = trainer_id);

-- Auto-limpeza: notificações dispensadas há mais de 30 dias são removidas
-- (opcional — rode manualmente ou crie um cron via pg_cron)
-- DELETE FROM notification_dismissed WHERE dismissed_at < NOW() - INTERVAL '30 days';
