-- =======================================================
-- MIGRATION: Etapa 2 - Tabela de Convites (WhatsApp)
-- =======================================================

-- 1. Criar a tabela de convites
CREATE TABLE IF NOT EXISTS public.student_invites (
    token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT false
);

-- 2. Habilitar RLS (Zero policies públicas)
-- Acesso será feito exclusivamente via SERVICE_ROLE_KEY pela Vercel.
ALTER TABLE public.student_invites ENABLE ROW LEVEL SECURITY;

-- 3. Índice para performance em buscas (invalidação de tokens antigos e busca de token válido)
CREATE INDEX IF NOT EXISTS idx_student_invites_student_id ON public.student_invites(student_id);
CREATE INDEX IF NOT EXISTS idx_student_invites_token ON public.student_invites(token);
