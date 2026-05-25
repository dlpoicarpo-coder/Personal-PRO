// ========================================
// PERSONAL PRO — Sistema de Papéis (Roles)
// admin    → acessa todos os dados de todos os personals
//            edita exercícios/métodos padrão do sistema
//            vê estatísticas globais
// personal → acessa apenas seus próprios alunos/dados
//            pode adicionar exercícios privados
// ========================================

// ── Como diferenciar na prática ──────────────────────────────
//
// No Supabase Dashboard → Authentication → Users → selecione o usuário
// → Edit user → Raw App Meta Data → adicionar:
//   { "role": "admin" }
//
// Para personal trainer (padrão, sem metadado especial):
//   { "role": "personal" }   ← ou sem campo role
//
// O campo user_metadata.role é definido pelo admin via dashboard
// ou via Supabase Admin API — nunca pelo próprio usuário
// ─────────────────────────────────────────────────────────────

import { getCurrentUser } from './auth.js';

// Cache em memória para evitar múltiplas chamadas durante a sessão
let _cachedRole = null;
let _cachedUserId = null;

export async function getUserRole() {
  try {
    const user = await getCurrentUser();
    if (!user) return 'guest';

    // Se o usuário mudou, limpar cache
    if (_cachedUserId !== user.id) { _cachedRole = null; _cachedUserId = user.id; }
    if (_cachedRole) return _cachedRole;

    // Verificar em app_metadata (definido pelo admin, não alterável pelo usuário)
    const role = user.app_metadata?.role
      || user.user_metadata?.role
      || 'personal'; // padrão: personal trainer

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

// ── Helpers de UI ─────────────────────────────────────────────

// Ocultar ou mostrar elementos baseado no papel
export async function applyRoleUI() {
  const admin = await isAdmin();

  // Elementos visíveis apenas para admin
  document.querySelectorAll('[data-role="admin"]').forEach(el => {
    el.style.display = admin ? '' : 'none';
  });

  // Elementos visíveis apenas para personal (não admin)
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
