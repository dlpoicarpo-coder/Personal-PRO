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

// Get current authenticated user (null if not logged in)
export async function getCurrentUser() {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: { user } } = await sb.auth.getUser();
  return user;
}

// Get current session
export async function getSession() {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: { session } } = await sb.auth.getSession();
  return session;
}

// Register new trainer with email + password
// Returns: { user, error, needsConfirmation }
export async function signUp(email, password, trainerName, cref) {
  const sb = getSupabase();
  if (!sb) return { error: 'Supabase não disponível' };

  // Get the app URL for redirect after email confirmation
  const redirectTo = `${window.location.origin}${window.location.pathname}#/`;

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
}

// Login with email + password
export async function signIn(email, password) {
  const sb = getSupabase();
  if (!sb) return { error: 'Supabase não disponível' };

  const { data, error } = await sb.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) return { error: error.message };
  return { user: data.user, session: data.session };
}

// Logout
export async function signOut() {
  const sb = getSupabase();
  if (!sb) {
    localStorage.removeItem('pp_session');
    return;
  }
  await sb.auth.signOut();
  localStorage.removeItem('pp_session');
}

// Send password reset email
export async function sendPasswordReset(email) {
  const sb = getSupabase();
  if (!sb) return { error: 'Supabase não disponível' };
  const { error } = await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${window.location.origin}${window.location.pathname}#/reset-password`,
  });
  return error ? { error: error.message } : { success: true };
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

    return { trainerAuth, trainer };
  } catch (err) {
    console.warn('Erro ao sincronizar perfil do treinador:', err);
    return null;
  }
}

// Check if current session is valid
export async function isAuthenticated() {
  const user = await getCurrentUser();
  if (user) {
    // Sincroniza o perfil em segundo plano para garantir que os dados existem
    await syncTrainerProfile();
    return true;
  }
  return false;
}
