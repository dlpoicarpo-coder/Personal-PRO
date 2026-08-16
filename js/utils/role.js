import { getCurrentUser, getSupabase } from './auth.js';

let cachedRole = null;
let cachedUserId = null;

export async function getUserRole() {
  const user = await getCurrentUser();
  if (!user) {
    cachedRole = null;
    cachedUserId = null;
    return null;
  }

  if (cachedUserId === user.id && cachedRole) {
    return cachedRole;
  }

  const sb = getSupabase();
  if (!sb) return null;

  try {
    // 1. Checar se e aluno vinculado
    const { data: student, error: studentErr } = await sb
      .from('students')
      .select('id')
      .eq('auth_user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (studentErr) {
      console.warn('[Role] Erro ao consultar tabela students:', studentErr.message);
    }

    if (student) {
      cachedUserId = user.id;
      cachedRole = 'student';
      return cachedRole;
    }

    // 2. Checar se e treinador autorizado (prova positiva)
    const { data: trainer, error: trainerErr } = await sb
      .from('trainers')
      .select('id, status')
      .eq('id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (trainerErr) {
      console.warn('[Role] Erro ao consultar tabela trainers:', trainerErr.message);
    }

    if (trainer) {
      cachedUserId = user.id;
      cachedRole = 'trainer';
      return cachedRole;
    }

    // 3. Sem papel definido / nao autorizado (falha fechada)
    cachedUserId = user.id;
    cachedRole = null;
    return null;
  } catch (err) {
    console.error('[Role] Excecao ao verificar papel do usuario:', err);
    return null;
  }
}

export function clearRoleCache() {
  cachedRole = null;
  cachedUserId = null;
}
