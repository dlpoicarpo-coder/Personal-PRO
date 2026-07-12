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
    const { data, error } = await sb
      .from('students')
      .select('id')
      .eq('auth_user_id', user.id)
      .limit(1)
      .maybeSingle();

    cachedUserId = user.id;
    if (data) {
      cachedRole = 'student';
    } else {
      cachedRole = 'trainer';
    }
    return cachedRole;
  } catch (err) {
    console.error('Erro ao verificar papel do usuário:', err);
    return null;
  }
}

export function clearRoleCache() {
  cachedRole = null;
  cachedUserId = null;
}
