-- =========================================================================
-- MIGRATION: SAAS BILLING E ASSINATURAS (ASAAS)
-- Objective: Cria tabela de assinaturas, RLS e gatilho de trial 10 dias.
-- =========================================================================

-- 1. Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan text NOT NULL DEFAULT 'Start',
    status text NOT NULL DEFAULT 'trialing',
    trial_end timestamptz,
    current_period_end timestamptz,
    gateway_customer_id text,
    gateway_subscription_id text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(trainer_id)
);

-- 2. RLS Policies
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trainers can view their own subscription" ON public.subscriptions;
CREATE POLICY "Trainers can view their own subscription" ON public.subscriptions
FOR SELECT TO authenticated
USING (auth.uid() = trainer_id);

-- O frontend NÃO pode fazer UPDATE, INSERT ou DELETE. Apenas leitura.
-- As alterações virão exclusivamente da Vercel Serverless Function via SERVICE_ROLE_KEY (webhook).

-- 3. Trigger para criar o Trial de 10 dias automaticamente no signup
CREATE OR REPLACE FUNCTION public.handle_new_trainer_subscription() 
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (trainer_id, plan, status, trial_end, current_period_end)
  VALUES (new.id, 'Start', 'trialing', now() + interval '10 days', now() + interval '10 days')
  ON CONFLICT (trainer_id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_trainer_subscription();
