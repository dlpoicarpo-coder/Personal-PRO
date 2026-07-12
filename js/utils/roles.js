// ========================================
// VETOR â€” Sistema de PapÃ©is (Roles)
// admin    â†’ acessa todos os dados de todos os personals
//            edita exercÃ­cios/mÃ©todos padrÃ£o do sistema
//            vÃª estatÃ­sticas globais
// personal â†’ acessa apenas seus prÃ³prios alunos/dados
//            pode adicionar exercÃ­cios privados
// ========================================

// â”€â”€ Como diferenciar na prÃ¡tica â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//
// No Supabase Dashboard â†’ Authentication â†’ Users â†’ selecione o usuÃ¡rio
// â†’ Edit user â†’ Raw App Meta Data â†’ adicionar:
//   { "role": "admin" }
//
// Para personal trainer (padrÃ£o, sem metadado especial):
//   { "role": "personal" }   â† ou sem campo role
//
// O campo user_metadata.role Ã© definido pelo admin via dashboard
// ou via Supabase Admin API â€” nunca pelo prÃ³prio usuÃ¡rio
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import { getCurrentUser } from './auth.js';

// Cache em memÃ³ria para evitar mÃºltiplas chamadas durante a sessÃ£o
let _cachedRole = null;
let _cachedUserId = null;

export async function getUserRole() {
  try {
    const user = await getCurrentUser();
    if (!user) return 'guest';

    if (_cachedUserId !== user.id) { _cachedRole = null; _cachedUserId = user.id; }
    if (_cachedRole) return _cachedRole;

    // Tentar app_metadata primeiro (mais seguro)
    let role = user.app_metadata?.role || user.user_metadata?.role;

    // Se nÃ£o tem role no token atual, tentar refresh para pegar app_metadata
    if (!role) {
      try {
        const { getSupabase } = await import('./auth.js');
        const sb = getSupabase?.();
        if (sb) {
          const { data } = await sb.auth.refreshSession();
          role = data?.user?.app_metadata?.role
              || data?.user?.user_metadata?.role;
        }
      } catch(_) {}
    }

    role = role || 'personal';
    _cachedRole = role;
    return role;
  } catch(_) {
    return 'personal';
  }
}

export async function isAdmin() {
  const role = await getUserRole();
  return role === 'admin';
}

export async function isPersonal() {
  const role = await getUserRole();
  return role === 'personal' || role === 'admin'; // admin tb acessa tudo de personal
}

// Limpar cache ao fazer logout
export function clearRoleCache() {
  _cachedRole = null;
  _cachedUserId = null;
}

// â”€â”€ Helpers de UI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Ocultar ou mostrar elementos baseado no papel
export async function applyRoleUI() {
  const admin = await isAdmin();

  // Elementos visÃ­veis apenas para admin
  document.querySelectorAll('[data-role="admin"]').forEach(el => {
    el.style.display = admin ? '' : 'none';
  });

  // Elementos visÃ­veis apenas para personal (nÃ£o admin)
  document.querySelectorAll('[data-role="personal"]').forEach(el => {
    el.style.display = !admin ? '' : 'none';
  });

  // Badge de papel na sidebar
  const badge = document.getElementById('roleBadge');
  if (badge) {
    badge.textContent  = admin ? 'Admin' : 'Personal';
    badge.style.background = admin ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)';
    badge.style.color  = admin ? 'var(--danger)' : 'var(--primary)';
  }

  return admin;
}

