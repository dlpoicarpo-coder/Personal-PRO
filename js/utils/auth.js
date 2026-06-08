// ========================================
// PERSONAL PRO — Supabase Auth Utility
// Email/Password with email confirmation
// Multi-tenant: each trainer has isolated data
// ========================================

const SUPABASE_URL = 'https://vbxedlloesvjpqzunqyv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_d4P6mzDj_sSUpFibSGUcdg_2GOsD35E';

// Singleton client — reuse across modules
let _client = null;
export function getSupabase() {
  if (!_client && window.supabase) {
    _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true, // handles email confirmation redirect
      }
    });
  }
  return _client;
}

// Helper: wraps a promise with a timeout
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]);
}

// Get current authenticated user (null if not logged in)
export async function getCurrentUser() {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data: { user } } = await withTimeout(sb.auth.getUser(), 5000);
    if (user) {
      // Cache session locally for offline fallback
      try { localStorage.setItem('pp_cached_uid', user.id); } catch(_) {}
    }
    return user;
  } catch (err) {
    console.warn('getCurrentUser remote failed, trying local session:', err.message);
    try {
      const { data: { session } } = await withTimeout(sb.auth.getSession(), 3000);
      if (session?.user) return session.user;
    } catch (_) {}
    // Fallback: use cached UID from localStorage to keep app usable offline
    const cachedUid = localStorage.getItem('pp_cached_uid');
    if (cachedUid) {
      console.warn('Supabase unreachable — using cached offline session');
      return { id: cachedUid, email: '', _offline: true };
    }
    return null;
  }
}

// Get current session
export async function getSession() {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data: { session } } = await sb.auth.getSession();
    return session;
  } catch (err) {
    console.warn('getSession failed:', err);
    return null;
  }
}

// Register new trainer with email + password
// Returns: { user, error, needsConfirmation }
export async function signUp(email, password, trainerName, cref) {
  const sb = getSupabase();
  if (!sb) return { error: 'Supabase não disponível' };

  // Get the app URL for redirect after email confirmation
  const redirectTo = `${window.location.origin}${window.location.pathname}#/`;

  try {
    const { data, error } = await sb.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          trainer_name: trainerName,
          cref: cref || '',
        }
      }
    });

    if (error) return { error: error.message };

    // If user is returned but no session, email confirmation is required
    const needsConfirmation = data.user && !data.session;
    return { user: data.user, session: data.session, needsConfirmation };
  } catch (err) {
    console.error('signUp failed:', err);
    return { error: 'Falha na conexão. Verifique sua internet ou extensões/shields do navegador.' };
  }
}

// Login with email + password
export async function signIn(email, password) {
  const sb = getSupabase();
  if (!sb) return { error: 'Supabase não disponível' };

  try {
    const { data, error } = await sb.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) return { error: error.message };
    return { user: data.user, session: data.session };
  } catch (err) {
    console.error('signIn failed:', err);
    return { error: 'Falha na conexão. Verifique sua internet ou extensões/shields do navegador.' };
  }
}

// Logout
export async function signOut() {
  const sb = getSupabase();
  if (!sb) {
    localStorage.removeItem('pp_session');
    return;
  }
  try {
    await sb.auth.signOut();
  } catch (err) {
    console.warn('signOut failed:', err);
  }
  localStorage.removeItem('pp_session');
}

// Send password reset email
export async function sendPasswordReset(email) {
  const sb = getSupabase();
  if (!sb) return { error: 'Supabase não disponível' };
  try {
    const { error } = await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}${window.location.pathname}#/reset-password`,
    });
    return error ? { error: error.message } : { success: true };
  } catch (err) {
    console.error('sendPasswordReset failed:', err);
    return { error: 'Falha na conexão. Verifique sua internet ou extensões/shields do navegador.' };
  }
}

// Listen to auth state changes
export function onAuthChange(callback) {
  const sb = getSupabase();
  if (!sb) return () => {};
  const { data: { subscription } } = sb.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}

// Sync trainer profile settings in database from Supabase Auth metadata
export async function syncTrainerProfile() {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    const dbModule = await import('../db.js');
    const db = dbModule.default;

    const trainerName = user.user_metadata?.trainer_name || user.user_metadata?.name || user.email.split('@')[0];
    const cref = user.user_metadata?.cref || '';
    const email = user.email;

    let trainer = await db.get('settings', 'trainer');
    if (!trainer) {
      trainer = {
        id: 'trainer',
        trainerName,
        cref,
        email,
        trainerPhone: user.user_metadata?.phone || '',
      };
      await db.put('settings', trainer);
    }

    return { user, trainer };
  } catch (err) {
    console.warn('Erro ao sincronizar perfil do treinador:', err);
    return null;
  }
}

// Check if current session is valid
export async function isAuthenticated() {
  const user = await getCurrentUser();
  if (user) {
    // Se offline, pula sync (evita travar)
    if (!user._offline) {
      syncTrainerProfile().catch(() => {}); // fire-and-forget, não bloqueia
    }
    return true;
  }
  return false;
}
