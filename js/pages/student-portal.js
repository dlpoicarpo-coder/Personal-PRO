// ========================================
// PERSONAL PRO — Student Portal (PWA Mobile)
// Portal do Aluno · Glass UI · PIN Auth
// v2 — Check-in reminders, Series Colors,
//       Reports Feed, Solo Training, PWA Popup, Light Theme
// ========================================
import db from '../db.js';
import { Calc } from '../utils/calculations.js';
import { PAIN_REGIONS } from '../utils/alerts.js';
import { generateAlgorithmicInsight, generateAIInsight } from '../insights.js';

// ── PWA Install prompt ─────────────────────────────────────────
let deferredPrompt = null;
let pwaPopupShown = false;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Show popup with a slight delay after portal loads
  setTimeout(() => showPwaPopup(), 3000);
});

function showPwaPopup() {
  if (pwaPopupShown || !deferredPrompt) return;
  pwaPopupShown = true;
  const popup = document.getElementById('pwaInstallPopup');
  if (popup) { popup.classList.add('visible'); return; }
  // If portal already rendered, inject
  const root = document.querySelector('.portal-root');
  if (!root) return;
  const el = document.createElement('div');
  el.id = 'pwaInstallPopup';
  el.className = 'portal-pwa-popup visible';
  el.innerHTML = `
    <div class="portal-pwa-popup-inner">
      <div class="portal-pwa-icon">📲</div>
      <div class="portal-pwa-text">
        <div class="portal-pwa-title">Instalar Personal PRO</div>
        <div class="portal-pwa-sub">Adicione à tela inicial para acesso rápido sem abrir o navegador!</div>
      </div>
      <div class="portal-pwa-actions">
        <button id="pwaInstallYes" class="portal-pwa-btn-yes">Instalar</button>
        <button id="pwaInstallNo" class="portal-pwa-btn-no">Agora não</button>
      </div>
    </div>`;
  root.appendChild(el);
  document.getElementById('pwaInstallYes')?.addEventListener('click', () => {
    deferredPrompt.prompt();
    el.classList.remove('visible');
  });
  document.getElementById('pwaInstallNo')?.addEventListener('click', () => {
    el.classList.remove('visible');
  });
}

// Push notification permission
async function requestNotificationPermission() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
  if (Notification.permission === 'granted' || Notification.permission === 'denied') return;
  const perm = await Notification.requestPermission();
  if (perm === 'granted') {
    console.log('Notificações ativadas!');
  }
}

// ── THEME ──────────────────────────────────────────────────────
function getPortalTheme() {
  return localStorage.getItem('portal_theme') || 'dark';
}
function setPortalTheme(theme) {
  localStorage.setItem('portal_theme', theme);
  document.querySelector('.portal-root')?.setAttribute('data-theme', theme);
}

// Utility helpers for timezone-safe date operations
function parseLocalDate(dateStr) {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  return new Date(dateStr.includes('T') ? dateStr : dateStr + 'T12:00');
}

function getDaysDifference(targetDateStr) {
  if (!targetDateStr) return 0;
  const target = parseLocalDate(targetDateStr);
  const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((targetStart - todayStart) / 86400000);
}

// ── STATE ──────────────────────────────────────────────────────
const portalState = {
  studentId: null,
  trainerId: null,
  student: null,
  section: 'home',
  selectedReportMacroId: 'all',
};

// ── CHART REGISTRY (prevent 'Canvas already in use' errors) ────
const _portalCharts = {};
function destroyPortalChart(id) {
  if (_portalCharts[id]) {
    try { _portalCharts[id].destroy(); } catch(_) {}
    delete _portalCharts[id];
  }
}
function createPortalChart(id, canvas, config) {
  destroyPortalChart(id);
  const chart = new Chart(canvas, config);
  _portalCharts[id] = chart;
  return chart;
}

// ── RENDER ENTRY ───────────────────────────────────────────────
export async function renderStudentPortal(rawParam) {
  if (!rawParam || rawParam === 'undefined') {
    return renderEmailLoginScreen();
  }
  const [studentId, query] = rawParam.split('?');
  const params = new URLSearchParams(query || '');
  let trainerId = params.get('t') || '';

  const student = await db.get('students', studentId).catch(() => null);
  if (student && !trainerId) {
    trainerId = student.trainerId || student.trainer_id || '';
  }

  portalState.studentId = studentId;
  portalState.trainerId = trainerId;
  db.studentPortalTrainerId = trainerId;

  // If name loaded from DB, save it for PWA/offline use
  if (student?.name) {
    localStorage.setItem(`portal_name_${studentId}`, student.name);
    localStorage.setItem(`portal_logged_student_id`, studentId);
  }

  // PIN auth
  const sessionKey = `portal_auth_${studentId}`;
  const isAuth = sessionStorage.getItem(sessionKey) === 'ok' || localStorage.getItem(sessionKey) === 'ok';

  if (!isAuth) {
    return renderPINScreen(student, studentId, trainerId);
  }

  portalState.student = student;
  return renderPortalShell(student);
}

function startStudentAutoSync(sid, tid) {
  if (!sid || !tid) return;
  if (window._studentAutoSyncInterval) clearInterval(window._studentAutoSyncInterval);

  // Sync immediately in background
  db.syncStudentData(sid, tid).catch(err => console.warn('Background student sync failed:', err));

  // Periodic sync every 30 seconds
  window._studentAutoSyncInterval = setInterval(() => {
    db.syncStudentData(sid, tid).catch(err => console.warn('Periodic student sync failed:', err));
  }, 30_000);

  // Sync on online event
  if (!window._studentOnlineListenerBound) {
    window.addEventListener('online', () => {
      console.log('[Student Sync] Connection restored, triggering sync...');
      const currentSid = portalState.studentId;
      const currentTid = portalState.trainerId;
      if (currentSid && currentTid) {
        db.syncStudentData(currentSid, currentTid).catch(err => console.warn('Online student sync failed:', err));
      }
    });
    window._studentOnlineListenerBound = true;
  }
}

export function initStudentPortal(rawParam) {
  if (!rawParam || rawParam === 'undefined') {
    initEmailLoginScreen();
    return;
  }
  // PIN form
  const pinForm = document.getElementById('portalPinForm');
  if (pinForm) {
    initPINHandlers();
    return;
  }
  // Portal nav
  initPortalNav();

  // Start background auto sync for student
  const sid = portalState.studentId;
  const tid = portalState.trainerId;
  if (sid && tid) {
    startStudentAutoSync(sid, tid);
  }

  loadSection('home');
  // Apply saved theme
  document.querySelector('.portal-root')?.setAttribute('data-theme', getPortalTheme());
  // Try PWA popup if already available
  if (deferredPrompt) setTimeout(() => showPwaPopup(), 3000);
  // Request push notification permission after 5s
  setTimeout(() => requestNotificationPermission(), 5000);
}



// ── PIN SCREEN ─────────────────────────────────────────────────
function renderPINScreen(student, studentId, trainerId) {
  const name = student?.name || 'Aluno';
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  return `
    <div class="portal-root" data-sid="${studentId}" data-tid="${trainerId}" data-theme="${getPortalTheme()}">
      <div class="portal-pin-screen">
        <div class="portal-pin-card">
          <div class="portal-logo">Personal<strong>PRO</strong></div>
          <div class="portal-avatar-big">${initials}</div>
          <h2 class="portal-pin-name">${name}</h2>
          <p class="portal-pin-sub">Digite seu PIN de acesso</p>

          <form id="portalPinForm" autocomplete="off">
            <div class="portal-pin-dots" id="pinDots">
              <span class="pin-dot" id="dot0"></span>
              <span class="pin-dot" id="dot1"></span>
              <span class="pin-dot" id="dot2"></span>
              <span class="pin-dot" id="dot3"></span>
            </div>
            <div id="pinError" class="portal-pin-error" style="display:none">PIN incorreto. Tente novamente.</div>
            <div class="portal-keypad">
              ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((k) => `
                <button type="button" class="keypad-btn ${k===''?'keypad-empty':''}" data-key="${k}">${k}</button>
              `).join('')}
            </div>
            <label class="portal-remember-me">
              <input type="checkbox" id="rememberLoginCheck" checked />
              Lembrar login neste dispositivo
            </label>
          </form>

          <div class="portal-pin-footer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Acesso seguro por PIN
          </div>
        </div>
      </div>
    </div>`;
}

function initPINHandlers() {
  const root = document.querySelector('.portal-root');
  const sid = root?.dataset.sid;
  let pin = '';

  document.querySelectorAll('.keypad-btn:not(.keypad-empty)').forEach(btn => {
    btn.addEventListener('click', async () => {
      const k = btn.dataset.key;
      if (k === '⌫') {
        pin = pin.slice(0, -1);
      } else if (pin.length < 4) {
        pin += k;
      }
      updateDots(pin);

      if (pin.length === 4) {
        const student = await db.get('students', sid).catch(() => null);
        const correctPin = student?.portalPin || '1234';
        if (pin === String(correctPin)) {
          const rememberMe = document.getElementById('rememberLoginCheck')?.checked;
          if (rememberMe) {
            localStorage.setItem(`portal_auth_${sid}`, 'ok');
          } else {
            localStorage.removeItem(`portal_auth_${sid}`);
          }
          sessionStorage.setItem(`portal_auth_${sid}`, 'ok');
          // Save student name so PWA/header shows it immediately
          if (student?.name) localStorage.setItem(`portal_name_${sid}`, student.name);
          window.location.reload();
        } else {
          document.getElementById('pinError').style.display = 'block';
          document.querySelectorAll('.pin-dot').forEach(d => d.classList.add('pin-dot-error'));
          setTimeout(() => {
            pin = '';
            updateDots(pin);
            document.getElementById('pinError').style.display = 'none';
            document.querySelectorAll('.pin-dot').forEach(d => d.classList.remove('pin-dot-error', 'pin-dot-filled'));
          }, 1200);
        }
      }
    });
  });
}

function updateDots(pin) {
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById(`dot${i}`);
    if (dot) dot.classList.toggle('pin-dot-filled', i < pin.length);
  }
}

// ── PORTAL SHELL ───────────────────────────────────────────────
function renderPortalShell(student) {
  const sid = portalState.studentId;
  // Use cached name from localStorage so PWA shows name immediately
  const cachedName = sid ? (localStorage.getItem(`portal_name_${sid}`) || '') : '';
  const name = student?.name || cachedName || 'Aluno';
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  return `
    <div class="portal-root" data-sid="${portalState.studentId}" data-tid="${portalState.trainerId}" data-theme="${getPortalTheme()}">
      <div class="portal-header">
        <div class="portal-header-left">
          <div class="portal-avatar-sm">${initials}</div>
          <div>
            <div class="portal-header-name">${name.split(' ')[0]}</div>
            <div class="portal-header-sub">Portal do Aluno</div>
          </div>
        </div>
        <div class="portal-header-actions">
          <button class="portal-theme-btn" id="portalTutorialBtn" title="Como usar" data-section="tutorial" style="cursor:pointer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </button>
          <button class="portal-theme-btn" id="portalThemeToggle" title="Alternar tema">
            <svg id="themeIconDark" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            <svg id="themeIconLight" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </button>
          <button class="portal-logout-btn" id="portalLogout" title="Sair">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </div>

      <div class="portal-content" id="portalContent">
        <div class="portal-spinner"><div class="portal-spin-ring"></div></div>
      </div>

      <nav class="portal-nav">
        <button class="portal-nav-btn active" data-section="home">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span>Início</span>
        </button>
        <button class="portal-nav-btn" data-section="treinar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
          <span>Treinar</span>
        </button>
        <button class="portal-nav-btn" data-section="sessoes">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span>Sessões</span>
        </button>
        <button class="portal-nav-btn" data-section="bio">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          <span>Check-in</span>
        </button>
        <button class="portal-nav-btn" data-section="avaliacoes">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          <span>Avaliações</span>
        </button>
        <button class="portal-nav-btn" data-section="relatorios">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          <span>Relatórios</span>
        </button>
      </nav>

      <!-- PWA Install Popup -->
      <div id="pwaInstallPopup" class="portal-pwa-popup">
        <div class="portal-pwa-popup-inner">
          <div class="portal-pwa-icon">📲</div>
          <div class="portal-pwa-text">
            <div class="portal-pwa-title">Instalar Personal PRO</div>
            <div class="portal-pwa-sub">Adicione à tela inicial para acesso rápido sem abrir o navegador!</div>
          </div>
          <div class="portal-pwa-actions">
            <button id="pwaInstallYes" class="portal-pwa-btn-yes">Instalar</button>
            <button id="pwaInstallNo" class="portal-pwa-btn-no">Agora não</button>
          </div>
        </div>
      </div>
    </div>`;
}

function initPortalNav() {
  const root = document.querySelector('.portal-root');
  portalState.studentId = root?.dataset.sid;
  portalState.trainerId = root?.dataset.tid;
  db.studentPortalTrainerId = root?.dataset.tid;

  document.querySelectorAll('.portal-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const activeSession = document.getElementById('soloActiveSession');
      if (activeSession && activeSession.style.display === 'block') {
        if (!confirm('Você tem um treino em andamento! Tem certeza que deseja sair sem salvar? O progresso será perdido.')) {
          return;
        }
      }
      document.querySelectorAll('.portal-nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadSection(btn.dataset.section);
    });
  });

  document.getElementById('portalTutorialBtn')?.addEventListener('click', () => {
    document.querySelectorAll('.portal-nav-btn').forEach(b => b.classList.remove('active'));
    loadSection('tutorial');
  });

  document.getElementById('portalLogout')?.addEventListener('click', () => {
    sessionStorage.removeItem(`portal_auth_${portalState.studentId}`);
    localStorage.removeItem(`portal_auth_${portalState.studentId}`);
    window.location.reload();
  });

  // Theme toggle
  const themeBtn = document.getElementById('portalThemeToggle');
  const updateThemeIcon = () => {
    const t = getPortalTheme();
    document.getElementById('themeIconDark').style.display = t === 'dark' ? '' : 'none';
    document.getElementById('themeIconLight').style.display = t === 'light' ? '' : 'none';
  };
  updateThemeIcon();
  themeBtn?.addEventListener('click', () => {
    const next = getPortalTheme() === 'dark' ? 'light' : 'dark';
    setPortalTheme(next);
    updateThemeIcon();
  });

  // PWA Popup events
  document.getElementById('pwaInstallYes')?.addEventListener('click', () => {
    deferredPrompt?.prompt();
    document.getElementById('pwaInstallPopup')?.classList.remove('visible');
  });
  document.getElementById('pwaInstallNo')?.addEventListener('click', () => {
    document.getElementById('pwaInstallPopup')?.classList.remove('visible');
  });

  // Show button in header if prompt available
  if (deferredPrompt) {
    const installBtn = document.createElement('button');
    installBtn.className = 'portal-install-btn';
    installBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> App`;
    installBtn.addEventListener('click', () => showPwaPopup());
    document.querySelector('.portal-header-actions')?.prepend(installBtn);
  }
}

async function loadSection(section) {
  portalState.section = section;
  const content = document.getElementById('portalContent');
  if (!content) return;
  content.innerHTML = '<div class="portal-spinner"><div class="portal-spin-ring"></div></div>';

  const sid = portalState.studentId;
  const tid = portalState.trainerId;

  // Função auxiliar para buscar do Supabase focado no aluno atual e evitar limites de 1000 linhas, mesclando com o local storage offline e tratando deleções remotas
  const fetchForStudent = async (table) => {
    let localItems = [];
    try {
      localItems = db._getLocal(table, tid) || [];
    } catch (_) {}

    const studentLocal = (table === 'workouts' || table === 'exercises' || table === 'methods')
      ? localItems
      : localItems.filter(r => r && (r.studentId === sid || r.student_id === sid));

    if (!db.supabase) {
      return studentLocal;
    }

    try {
      let rows = [];
      if (table === 'exercises' || table === 'methods') {
        if (tid) {
          const q1 = db.supabase.from(table).select('*').eq('trainer_id', tid);
          const q2 = db.supabase.from(table).select('*').eq('is_default', true);
          const [r1, r2] = await Promise.all([q1, q2]);
          const combined = [...(r1.data || []), ...(r2.data || [])];
          const seenIds = new Set();
          rows = combined.filter(row => {
            if (!row || seenIds.has(row.id)) return false;
            seenIds.add(row.id);
            return true;
          });
        }
      } else if (table === 'workouts') {
        if (tid) {
          const { data: wd } = await db.supabase.from(table).select('*').eq('trainer_id', tid);
          rows = wd || [];
        }
      } else {
        const q1 = db.supabase.from(table).select('*').filter('data->>studentId', 'eq', sid);
        const { data: d1 } = await q1;
        if (d1) rows = d1;

        // Fallback for sessions
        if (table === 'sessions' && tid) {
          try {
            const { data: d2 } = await db.supabase.from(table).select('*').eq('trainer_id', tid);
            if (d2 && d2.length > 0) {
              const seenIds = new Set(rows.map(r => r.id));
              for (const r of d2) {
                const parsed = r.data ? { ...r.data, id: r.id } : r;
                const rSid = parsed.studentId || parsed.student_id;
                if (rSid === sid && !seenIds.has(r.id)) {
                  rows.push(r);
                  seenIds.add(r.id);
                }
              }
            }
          } catch(_) {}
        }
      }

      const remote = rows.map(r => {
        let itemData;
        if (r.data && typeof r.data === 'object') {
          itemData = {
            ...r.data, 
            id: r.id,
            updatedAt: r.data.updatedAt || r.updated_at,
            createdAt: r.data.createdAt || r.created_at
          };
        } else {
          itemData = {
            ...r,
            updatedAt: r.updatedAt || r.updated_at,
            createdAt: r.createdAt || r.created_at
          };
        }
        itemData._synced = true;
        return itemData;
      });

      const remoteMap = new Map(remote.map(r => [r.id, r]));
      const merged = new Map();

      // Check local student items for remote deletion or retention
      for (const localItem of studentLocal) {
        if (!localItem.id) continue;
        const remoteItem = remoteMap.get(localItem.id);
        if (!remoteItem) {
          if (localItem._synced === true) {
            // Deleted on remote, remove locally
            console.log(`[Student Portal] Item ${localItem.id} de ${table} foi removido no remote. Excluindo local.`);
            continue;
          } else {
            // New local item, keep it
            merged.set(localItem.id, localItem);
          }
        } else {
          const localTime = new Date(localItem.updatedAt || localItem.createdAt || 0).getTime();
          const remoteTime = new Date(remoteItem.updatedAt || remoteItem.createdAt || 0).getTime();
          if (localTime > remoteTime + 1000) {
            merged.set(localItem.id, localItem);
          } else {
            merged.set(localItem.id, remoteItem);
          }
        }
      }

      // Add new remote items
      for (const remoteItem of remote) {
        if (!merged.has(remoteItem.id)) {
          merged.set(remoteItem.id, remoteItem);
        }
      }

      const result = [...merged.values()];

      // Update local storage cache
      const allLocal = db._getLocal(table, tid) || [];
      const localMap = new Map(allLocal.map(x => [x.id, x]));

      // Clear deleted items of this student/scope
      studentLocal.forEach(localItem => {
        if (!merged.has(localItem.id)) {
          localMap.delete(localItem.id);
        }
      });

      // Add/update merged items
      result.forEach(r => {
        localMap.set(r.id, r);
      });

      db._saveLocal(table, [...localMap.values()], tid);

      return result;
    } catch (e) {
      console.warn(`Erro portal fetchForStudent(${table}):`, e);
      return studentLocal;
    }
  };

  if (sid && tid) {
    const hasLocalData = (db._getLocal('workouts', tid) || []).some(w => w.studentId === sid);
    if (!hasLocalData) {
      // First load or empty cache: await sync so the user doesn't see an empty screen
      await db.syncStudentData(sid, tid).catch(err => console.warn('Student loadSection sync failed:', err));
    } else {
      // Already has cache: sync in background so page renders instantly
      db.syncStudentData(sid, tid).catch(err => console.warn('Background student loadSection sync failed:', err));
    }
  }

  const [student, sessionsRaw, workoutsRaw, biofeedbacks, assessments, schedules, macrocycles, finances, exercisesRaw, methodsRaw] = await Promise.all([
    db.get('students', sid).catch(() => null),
    fetchForStudent('sessions'),
    fetchForStudent('workouts'),
    fetchForStudent('biofeedback').then(all => all.sort((a,b) => new Date(b.date)-new Date(a.date))),
    fetchForStudent('assessments').then(all => all.sort((a,b) => new Date(b.date)-new Date(a.date))),
    fetchForStudent('schedules'),
    fetchForStudent('macrocycles'),
    fetchForStudent('financial'),
    fetchForStudent('exercises'),
    fetchForStudent('methods'),
  ]);

  // Enrich exercises inside workouts with media fields from the exercises library
  const exercisesList = exercisesRaw || [];
  const workoutsEnriched = (workoutsRaw || []).map(w => {
    if (w.exercises && w.exercises.length) {
      const enrichedExs = w.exercises.map(ex => {
        const libraryEx = exercisesList.find(e => e.id === ex.exerciseId || e.id === ex.id) ||
                          exercisesList.find(e => e.name.toLowerCase().trim() === ex.name.toLowerCase().trim());
        if (libraryEx) {
          return {
            ...libraryEx,
            ...ex
          };
        }
        return ex;
      });
      return { ...w, exercises: enrichedExs };
    }
    return w;
  });

  // Filtrar treinos por studentId — com fallback por trainerId
  // Garante que treinos apareçam mesmo que o studentId tenha sido salvo
  // de forma levemente diferente (ex.: com ou sem trainerId no escopo)
  let workouts = workoutsEnriched.filter(w => w.studentId === sid);
  if (workouts.length === 0 && tid) {
    // Fallback: buscar treinos do mesmo treinador que tenham este aluno
    workouts = workoutsEnriched.filter(w =>
      (w.trainerId === tid || w.trainer_id === tid) && w.studentId === sid
    );
  }
  if (workouts.length === 0 && tid) {
    // Fallback mais amplo: qualquer treino cujo trainerId bate (caso studentId esteja errado)
    const byTrainer = workoutsEnriched.filter(w => w.trainerId === tid || w.trainer_id === tid);
    // Tentar match parcial de studentId (primeiros 8 chars)
    const sidShort = sid.substring(0, 8);
    workouts = byTrainer.filter(w => w.studentId?.startsWith(sidShort));
    if (workouts.length === 0) {
      // Último recurso: pegar todos treinos do treinador filtrados
      // somente se o aluno existe e é deste treinador
      if (student && (student.trainerId === tid || student.trainer_id === tid)) {
        workouts = byTrainer.filter(w => w.studentId === sid);
      }
    }
  }

  // Normalize sessions: unify field names from trainer live-tracker vs solo portal
  const sessions = sessionsRaw.map(s => {
    const durationMin = s.durationMin || (s.totalDuration ? Math.round(s.totalDuration / 60) : 0);
    // Resolve exercise names in setLog using session.exercises array
    const exercises = s.exercises || [];
    const setLog = (s.setLog || []).map(set => ({
      ...set,
      exerciseName: set.exerciseName || (exercises[set.exIdx]?.name) || (set.exerciseIdx != null ? exercises[set.exerciseIdx]?.name : null) || null,
      load: parseFloat(set.load) || 0,
      reps: parseFloat(set.reps) || 0,
    }));
    const totalVol = s.totalVolume || setLog.reduce((t,x)=>t+(x.load||0)*(x.reps||0),0);
    return { ...s, durationMin, setLog, totalVolume: totalVol };
  });


  portalState.student = student;

  switch (section) {
    case 'home': content.innerHTML = renderHome(student, sessions, workouts, schedules, macrocycles, finances, assessments, biofeedbacks); break;
    case 'treinar': content.innerHTML = renderTreinar(workouts, schedules); initTreinar(workouts, schedules, student); break;
    case 'sessoes': content.innerHTML = renderSessoes(sessions, schedules); break;
    case 'bio': content.innerHTML = renderBio(biofeedbacks, sid, tid); initBio(); break;
    case 'avaliacoes': content.innerHTML = renderAvaliacoes(assessments); break;
    case 'relatorios': content.innerHTML = await renderRelatorios(student, sessions, assessments, biofeedbacks, macrocycles); initRelatorios(student, sessions, assessments, biofeedbacks, macrocycles); break;
    case 'tutorial': content.innerHTML = renderStudentTutorial(); initStudentTutorial(); break;
    default: content.innerHTML = renderHome(student, sessions, workouts, schedules, macrocycles, finances, assessments, biofeedbacks);
  }

  // Bind events after render
  if (section === 'sessoes') initSessoesSection(sessions);
  if (section === 'home') initHomeSection(student, tid, sessions, biofeedbacks);

  // Check-in reminder (day of session)
  checkSessionReminders(schedules, sessions);
}

// ── SESSION REMINDERS ──────────────────────────────────────────
function checkSessionReminders(schedules, sessions) {
  const _d = new Date();
  const todayStr = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}`;

  // 1. Check-in reminder: session TODAY
  const todaySessions = schedules.filter(s => s.date === todayStr);
  if (todaySessions.length > 0) {
    const s = todaySessions[0];
    showToast(`📅 Você tem treino hoje${s.time ? ' às ' + s.time : ''}! Lembre-se de fazer o check-in antes de treinar.`, 'info', 8000);
  }

  // 2. Checkout reminder: sessions without student checkout
  const needsCheckout = sessions.filter(s => {
    if (s.status !== 'completed') return false;
    if (s.postBiofeedback && s.postBiofeedback.submittedByStudent) return false;
    if (!s.date) return false;
    const dateStr = s.date.includes('T') ? s.date.split('T')[0] : s.date;
    const daysAgo = (now - new Date(dateStr + 'T12:00')) / 86400000;
    return daysAgo <= 3; // only recent ones
  });
  if (needsCheckout.length > 0) {
    setTimeout(() => {
      showToast(` Você tem ${needsCheckout.length} treino(s) sem checkout (feedback pós-treino). Complete para registrar seu progresso!`, 'warning', 10000);
    }, 2000);
  }
}

function showToast(msg, type = 'info', duration = 5000) {
  const existing = document.getElementById('portalToast');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.id = 'portalToast';
  el.className = `portal-toast portal-toast-${type}`;
  el.innerHTML = `<span>${msg}</span><button onclick="this.parentElement.remove()" style="background:none;border:none;color:inherit;cursor:pointer;font-size:1.1rem;line-height:1">✕</button>`;
  document.querySelector('.portal-content')?.prepend(el);
  setTimeout(() => el.remove(), duration);
}

// ── HOME ───────────────────────────────────────────────────────
function renderHome(student, sessions, workouts, schedules, macrocycles, finances, assessments, biofeedbacks) {
  const _d = new Date();
  const todayStr = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}`;
  const now = new Date();
  const nextSchedule = schedules
    .filter(s => new Date(s.date + 'T' + (s.time || '00:00')) >= now)
    .sort((a,b) => new Date(a.date+'T'+a.time) - new Date(b.date+'T'+b.time))[0];

  const currentMacro = macrocycles.sort((a,b) => new Date(b.startDate)-new Date(a.startDate))[0];
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const lastSession = completedSessions.sort((a,b) => new Date(b.date)-new Date(a.date))[0];

  // Mensalidade
  let paymentDays = null, paymentColor = 'var(--portal-success)', paymentLabel = 'Em dia';
  
  // Encontrar se há algum pagamento pendente ou vencido em finances
  const activePending = (finances || []).filter(f => f.status === 'pending');
  const overdueFinances = activePending.filter(f => getDaysDifference(f.dueDate) < 0);
  
  if (overdueFinances.length > 0) {
    overdueFinances.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    const diff = getDaysDifference(overdueFinances[0].dueDate);
    paymentDays = diff;
    paymentColor = 'var(--portal-danger)';
    paymentLabel = `Venceu há ${Math.abs(diff)}d`;
  } else if (activePending.length > 0) {
    activePending.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    const diff = getDaysDifference(activePending[0].dueDate);
    paymentDays = diff;
    paymentColor = diff <= 5 ? 'var(--portal-warning)' : 'var(--portal-success)';
    paymentLabel = diff === 0 ? 'Vence hoje!' : `Vence em ${diff}d`;
  } else {
    // Fallback para o campo do aluno se finances estiver vazio
    const paymentDue = student?.paymentDue;
    if (paymentDue) {
      const diff = getDaysDifference(paymentDue);
      paymentDays = diff;
      paymentColor = diff < 0 ? 'var(--portal-danger)' : diff <= 5 ? 'var(--portal-warning)' : 'var(--portal-success)';
      paymentLabel = diff < 0 ? `Venceu há ${Math.abs(diff)}d` : diff === 0 ? 'Vence hoje!' : `Vence em ${diff}d`;
    } else {
      paymentLabel = 'Em dia';
      paymentColor = 'var(--portal-success)';
    }
  }

  // Backfill macrocycle endDate dynamically if not present in DB
  if (currentMacro && !currentMacro.endDate && currentMacro.startDate) {
    const totalW = parseInt(currentMacro.totalWeeks) || 12;
    const endD = new Date(currentMacro.startDate + 'T12:00');
    endD.setDate(endD.getDate() + (totalW * 7));
    currentMacro.endDate = endD.toISOString().slice(0, 10);
  }

  // Macrociclo progress — based on session count within macro period
  let macroProgress = 0;
  let macroSessionsCount = 0;
  if (currentMacro?.startDate && currentMacro?.endDate) {
    const ms = new Date(currentMacro.startDate + 'T12:00');
    const me = new Date(currentMacro.endDate + 'T12:00');
    const total = me - ms;
    const elapsed = now - ms;
    // Date-based progress
    const datePct = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
    // Session-based: sessions within macro date range
    macroSessionsCount = completedSessions.filter(s => {
      if (!s.date) return false;
      const sDateStr = s.date.includes('T') ? s.date.split('T')[0] : s.date;
      return sDateStr >= currentMacro.startDate && sDateStr <= currentMacro.endDate;
    }).length;
    // Planned sessions (approx: macrocycle weeks * sessions/week from schedules)
    const macroWeeks = Math.max(1, Math.ceil(total / (7*86400000)));
    const schedInMacro = schedules.filter(s => {
      if (!s.date) return false;
      const sDateStr = s.date.includes('T') ? s.date.split('T')[0] : s.date;
      return sDateStr >= currentMacro.startDate && sDateStr <= currentMacro.endDate;
    }).length;
    const plannedSessions = schedInMacro || (macroWeeks * 3);
    const sesssPct = plannedSessions > 0 ? Math.min(100, Math.round((macroSessionsCount / plannedSessions) * 100)) : 0;
    macroProgress = sesssPct;
  }

  // Today check-in banner
  const todaySched = schedules.find(s => s.date === todayStr);
  let checkinBanner = '';
  if (todaySched) {
    const checkedIn = biofeedbacks.find(b => b.date?.startsWith(todayStr) && b.formType === 'pre');
    checkinBanner = checkedIn
      ? `<div class="portal-reminder portal-reminder-success">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Check-in do treino de hoje já realizado ✅
        </div>`
      : `<div class="portal-reminder portal-reminder-info" id="checkinBanner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Você tem treino hoje às ${todaySched.time || '—'}! <button onclick="document.querySelector('[data-section=bio]').click()" class="portal-reminder-btn">Fazer check-in</button>
        </div>`;
  }

  // Checkout reminder: only sessions completed in the last 3 days
  const needsCheckout = sessions.filter(s => {
    if (s.status !== 'completed') return false;
    if (s.postBiofeedback && s.postBiofeedback.submittedByStudent) return false;
    if (!s.date) return false;
    const dateStr = s.date.includes('T') ? s.date.split('T')[0] : s.date;
    const daysAgo = -getDaysDifference(dateStr);
    return daysAgo <= 3;
  });
  let checkoutBanner = '';
  if (needsCheckout.length > 0) {
    const s = needsCheckout[0];
    checkoutBanner = `<div class="portal-reminder portal-reminder-warning">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      ${needsCheckout.length} treino(s) aguardando checkout!
      <button onclick="window.showPortalCheckoutById('${s.id}')" class="portal-reminder-btn" style="background:var(--portal-warning);color:#0f172a;border:none;border-radius:6px;padding:4px 8px;font-size:0.75rem;font-weight:700;cursor:pointer;margin-left:8px">Fazer agora</button>
    </div>`;
  }

  return `
    <div class="portal-section">
      <!-- Reminders -->
      ${checkinBanner}
      ${checkoutBanner}

      <!-- Greeting -->
      <div class="portal-greeting-card glass-card">
        <div class="portal-greeting-text">
          <div class="portal-greeting-hi">Olá, ${(student?.name||'').split(' ')[0]} 👋</div>
          <div class="portal-greeting-date">${now.toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' })}</div>
        </div>
        ${lastSession ? `<div class="portal-last-session">Último treino: ${Math.abs(getDaysDifference(lastSession.date))}d atrás</div>` : ''}
      </div>

      <!-- Stats rápidas -->
      <div class="portal-stats-row">
        <div class="portal-stat-card glass-card">
          <div class="portal-stat-icon" style="color:var(--portal-primary)">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div class="portal-stat-val">${completedSessions.length}</div>
          <div class="portal-stat-lbl">Sessões</div>
        </div>
        <div class="portal-stat-card glass-card" style="border-top:3px solid ${paymentColor}">
          <div class="portal-stat-icon" style="color:${paymentColor}">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          </div>
          <div class="portal-stat-val" style="color:${paymentColor};font-size:1rem">${paymentLabel}</div>
          <div class="portal-stat-lbl">Mensalidade</div>
        </div>
      </div>

      <!-- Próxima sessão -->
      ${nextSchedule ? `
        <div class="glass-card portal-next-session">
          <div class="portal-card-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Próxima Sessão
          </div>
          <div class="portal-next-date">${new Date(nextSchedule.date+'T12:00').toLocaleDateString('pt-BR', {weekday:'long', day:'numeric', month:'long'})}</div>
          <div class="portal-next-time">${nextSchedule.time || ''} ${nextSchedule.workoutName ? '· '+nextSchedule.workoutName : ''}</div>
        </div>` : `
        <div class="glass-card portal-next-session" style="opacity:0.6">
          <div class="portal-card-label">Próxima Sessão</div>
          <div class="portal-next-date">Nenhuma agendada</div>
        </div>`}

      <!-- Macrociclo atual -->
      ${(() => {
        if (!currentMacro) return '';
        
        let weekTimelineHtml = '';
        if (currentMacro.weeks && currentMacro.weeks.length) {
          const currentWeek = Math.floor(Math.abs(getDaysDifference(currentMacro.startDate)) / 7) + 1;
          
          weekTimelineHtml = `
            <div class="week-timeline" style="margin: 14px 0 8px; display: flex; gap: 4px; align-items: flex-end; min-height: 60px;">
              ${currentMacro.weeks.map((w, i) => {
                const isDeload = w.phase === 'Deload' || w.phase?.includes('Deload') || w.phase?.includes('Recuper');
                const intColor = isDeload ? '#3b82f6'
                  : w.intensityPct >= 88 ? '#ef4444'
                  : w.intensityPct >= 78 ? '#f97316'
                  : w.intensityPct >= 65 ? '#eab308' : '#22c55e';
                // Tooltip com info de sub-sessões (DUP, Conjugada, Concorrente)
                const dupInfo = w.dupSessions?.length
                  ? w.dupSessions.map(ds => `${ds.label}: ${ds.intensityPct}% · RPE ${ds.rpe}`).join(' | ')
                  : null;
                const tooltipText = dupInfo
                  ? `Sem ${w.week}: ${w.label||w.phase} — ${dupInfo}`
                  : `Sem ${w.week}: ${w.label||w.phase} — ${w.intensityPct}% Int · ${w.volumePct||'—'}% Vol`;
                const barHeight = Math.max(4, Math.round((w.intensityPct || 60) * 0.28));
                return `<div class="week-block ${i + 1 === currentWeek ? 'week-current' : ''}" style="display:flex; flex-direction:column; align-items:center; gap:2px; flex:1; min-width:20px; border-bottom:3px solid ${intColor}" title="${tooltipText}">
                  <div class="week-num" style="font-size:0.6rem; font-weight:600; color:${intColor}">S${w.week}</div>
                  <div style="height:${barHeight}px; background:${intColor}; width:100%; max-width:16px; border-radius:2px; min-height:2px;"></div>
                </div>`;
              }).join('')}
            </div>
            <div class="flex gap-md mt-xs text-xs text-muted" style="flex-wrap:wrap; display:flex; gap:8px; margin-bottom:12px;">
              <span style="color:#22c55e; font-size:0.65rem;">● Leve</span>
              <span style="color:#eab308; font-size:0.65rem;">● Moderada</span>
              <span style="color:#f97316; font-size:0.65rem;">● Alta</span>
              <span style="color:#ef4444; font-size:0.65rem;">● Máxima</span>
              <span style="color:#3b82f6; font-size:0.65rem;">● Deload</span>
            </div>
          `;
        } else {
          // Fallback to simple progress bar
          weekTimelineHtml = `
            <div class="portal-macro-progress-bar">
              <div class="portal-macro-progress-fill" style="width:${macroProgress}%"></div>
            </div>
          `;
        }

        return `
          <div class="glass-card portal-macro-card">
            <div class="portal-card-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              Macrociclo Atual
            </div>
            <div class="portal-macro-name">${currentMacro.name || 'Macrociclo'}</div>
            
            ${weekTimelineHtml}

            <div class="portal-macro-pct" style="text-align:left; margin-top:6px;">${macroProgress}% concluído &middot; ${macroSessionsCount} sessões no ciclo</div>
            ${currentMacro.endDate ? `<div class="text-xs" style="color:var(--portal-text-muted);margin-top:4px">Termina em: ${parseLocalDate(currentMacro.endDate).toLocaleDateString('pt-BR')}</div>` : ''}
          </div>
        `;
      })()}

      <!-- Botão Mensagem -->
      <button class="portal-btn-wa" id="portalMsgBtn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        Enviar mensagem ao Treinador
      </button>
    </div>`;
}

function initHomeSection(student, tid, sessions, biofeedbacks) {
  document.getElementById('portalMsgBtn')?.addEventListener('click', () => {
    const trainer = student?.trainerPhone || '';
    const msg = encodeURIComponent(`Olá! Sou ${student?.name || 'seu aluno'}. Preciso falar com você.`);
    const phone = trainer.replace(/\D/g,'');
    const url = phone ? `https://wa.me/${phone.startsWith('55')?phone:'55'+phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank');
  });
}

function getWorkoutSVG(name) {
  const norm = (name || '').toLowerCase();
  
  if (norm.includes('cardio') || norm.includes('corrida') || norm.includes('esteira') || norm.includes('bike') || norm.includes('aerob') || norm.includes('caminh') || norm.includes('pedal') || norm.includes('hiit')) {
    return `
      <svg class="portal-workout-pick-svg icon-cardio" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    `;
  }
  
  if (norm.includes('core') || norm.includes('funcional') || norm.includes('abd') || norm.includes('along') || norm.includes('mobil') || norm.includes('recup') || norm.includes('regen') || norm.includes('estabil')) {
    return `
      <svg class="portal-workout-pick-svg icon-shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    `;
  }
  
  if (norm.includes('livre') || !norm) {
    return `
      <svg class="portal-workout-pick-svg icon-target" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    `;
  }
  
  return `
    <svg class="portal-workout-pick-svg icon-dumbbell" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="6" y1="12" x2="18" y2="12" />
      <rect x="3" y="8" width="3" height="8" rx="1" />
      <rect x="18" y="8" width="3" height="8" rx="1" />
      <rect x="1" y="10" width="2" height="4" rx="0.5" />
      <rect x="21" y="10" width="2" height="4" rx="0.5" />
    </svg>
  `;
}

// ── TREINAR (Smart) ────────────────────────────────────────────────
function renderTreinar(workouts, schedules) {
  const _d = new Date();
  const todayStr = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}`;
  const todaySched = schedules.find(s => s.date === todayStr);
  const nextSched = schedules
    .filter(s => s.date > todayStr)
    .sort((a,b) => a.date.localeCompare(b.date))[0];
  const suggestedSched = todaySched || nextSched;
  const suggestedWorkout = suggestedSched ? workouts.find(w => w.id === suggestedSched.workoutId) : null;

  const suggestedCard = suggestedWorkout ? `
    <div class="portal-suggested-card" id="suggestedCard">
      <div class="portal-suggested-label">
        ${todaySched
          ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Treino de HOJE`
          : `📅 Próximo treino — ${new Date(suggestedSched.date+'T12:00').toLocaleDateString('pt-BR',{weekday:'short',day:'numeric',month:'short'})}`}
        ${suggestedSched.time ? ` · ${suggestedSched.time}` : ''}
      </div>
      <div class="portal-suggested-name">${suggestedWorkout.name || 'Treino'}</div>
      <div class="portal-suggested-meta">${(suggestedWorkout.exercises||[]).length} exercícios</div>
      <button class="portal-submit-btn" id="startSuggestedBtn" data-wid="${suggestedWorkout.id}" style="margin-top:12px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        Iniciar Este Treino
      </button>
    </div>` : '';

  return `
    <div class="portal-section">
      <h2 class="portal-section-title">Treinar</h2>

      ${suggestedCard}

      <div class="portal-section-sub" style="margin-top:${suggestedCard?'20px':'0'}">Ou escolha outro treino</div>
      <div class="portal-bio-field">
        <div class="portal-workout-picker" id="soloWorkoutPicker">
          <div class="portal-workout-pick-item selected" data-wid="">
            <div class="portal-workout-pick-icon">${getWorkoutSVG('Livre')}</div>
            <div class="portal-workout-pick-name">Livre</div>
            <div class="portal-workout-pick-sub">Sem base</div>
          </div>
          ${[...workouts]
            .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' }))
            .map(w => `
              <div class="portal-workout-pick-item" data-wid="${w.id}">
                <div class="portal-workout-pick-icon">${getWorkoutSVG(w.name)}</div>
                <div class="portal-workout-pick-name">${w.name || 'Treino'}</div>
                <div class="portal-workout-pick-sub">${(w.exercises||[]).length} ex.</div>
              </div>
            `).join('')}
        </div>
        <input type="hidden" id="soloWorkoutSel" value="">
      </div>

      <div id="soloExercisesBlock"></div>

      <button id="soloStartBtn" class="portal-submit-btn" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);box-shadow:0 4px 16px rgba(99,102,241,0.3)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        Iniciar Sessão
      </button>

      <!-- Active session -->
      <div id="soloActiveSession" style="display:none;margin-top:4px">

        <!-- Live panel -->
        <div class="portal-live-panel">
          <div class="portal-live-stat">
            <div class="portal-live-val" id="liveTotal">00:00</div>
            <div class="portal-live-lbl">⏱ Total</div>
          </div>
          <div class="portal-live-stat">
            <div class="portal-live-val" id="liveWork" style="color:#10b981">00:00</div>
            <div class="portal-live-lbl"> Trabalho</div>
          </div>
          <div class="portal-live-stat">
            <div class="portal-live-val" id="liveRest" style="color:#06b6d4">00:00</div>
            <div class="portal-live-lbl">🙏 Descanso</div>
          </div>
          <button id="soundToggleBtn" class="portal-sound-btn" title="Som do timer">🔔</button>
        </div>

        <!-- Rest timer overlay (hidden until set done) -->
        <div id="restTimerOverlay" class="portal-rest-overlay" style="display:none">
          <div class="portal-rest-label">Descanso</div>
          <div class="portal-rest-countdown" id="restCountdown">60</div>
          <div class="portal-rest-bar-track"><div class="portal-rest-bar-fill" id="restBarFill" style="width:100%"></div></div>
          <div class="portal-rest-actions" style="margin-top:12px;gap:8px">
            <button class="portal-rest-adj" id="restMinus">-15s</button>
            <button class="portal-rest-skip" id="restPauseToggle" style="background:rgba(245,158,11,0.15);border-color:rgba(245,158,11,0.3);color:#f59e0b">Pausar ⏸</button>
            <button class="portal-rest-skip" id="restSkip" style="background:rgba(99,102,241,0.15);border-color:rgba(99,102,241,0.3);color:#818cf8">Trabalho </button>
            <button class="portal-rest-adj" id="restPlus">+15s</button>
          </div>
        </div>

        <!-- Exercises -->
        <div id="soloExerciseLog" class="portal-live-exercises"></div>

        <!-- Session notes -->
        <div class="glass-card" style="margin-top:12px">
          <div class="portal-card-label"> Anotações da Sessão</div>
          <textarea id="soloNotes" class="portal-textarea" rows="3" placeholder="Observações gerais do treino..."></textarea>
        </div>

        <div class="portal-bio-field" style="margin-top:12px">
          <label class="portal-bio-label">PSE Geral da Sessão (Borg CR10)</label>
          <select id="soloPse" class="portal-textarea" style="display: none;">
            <option value="1">1 - Extremamente Leve (Repouso)</option>
            <option value="2">2 - Muito Leve</option>
            <option value="3">3 - Leve (Fácil)</option>
            <option value="4">4 - Moderado (Confortável)</option>
            <option value="5" selected>5 - Algo Pesado</option>
            <option value="6">6 - Pesado / Forte</option>
            <option value="7">7 - Muito Forte</option>
            <option value="8">8 - Muito Forte+</option>
            <option value="9">9 - Extremamente Forte (Quase Máximo)</option>
            <option value="10">10 - Esforço Máximo (Exaustão)</option>
          </select>
          <button type="button" id="soloPseBtn" class="portal-textarea" style="margin-top:4px;padding:12px;text-align:left;display:flex;justify-content:space-between;align-items:center;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--portal-text);border:1px solid var(--portal-border);border-radius:12px;width:100%;box-sizing:border-box;">
            <span id="soloPseBtnVal">5 - Algo Pesado</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>

        <button id="soloFinishBtn" class="portal-submit-btn" style="background:linear-gradient(135deg,#10b981,#059669);margin-top:8px">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Finalizar & Salvar Sessão
        </button>
      </div>
    </div>`;
}

function initTreinar(workouts, schedules, student) {
  let soloTimerInterval = null;
  let soloStartTime = null;
  let workSeconds = 0, restSeconds = 0;
  let isResting = false;
  let soundEnabled = true;
  let restTimer = null;
  let restTotal = 60;
  let restRemaining = 60;
  let activeRestingRowId = null;
  const sid = portalState.studentId;
  const tid = portalState.trainerId;
  const selInput = document.getElementById('soloWorkoutSel');
  const exBlock = document.getElementById('soloExercisesBlock');

  // Bind premium custom selector for General Session PSE
  document.getElementById('soloPseBtn')?.addEventListener('click', () => {
    const selectEl = document.getElementById('soloPse');
    if (!selectEl) return;
    openCustomSelector('Selecionar PSE Geral', PSE_OPTIONS, selectEl.value, (val) => {
      selectEl.value = val;
      selectEl.dispatchEvent(new Event('change'));
      const btnValEl = document.getElementById('soloPseBtnVal');
      if (btnValEl) {
        const descMap = {
          '1': '1 - Extremamente Leve',
          '2': '2 - Muito Leve',
          '3': '3 - Leve',
          '4': '4 - Moderado',
          '5': '5 - Um Pouco Forte',
          '6': '6 - Forte',
          '7': '7 - Muito Forte',
          '8': '8 - Muito Forte +',
          '9': '9 - Quase Máximo',
          '10': '10 - Máximo (Falha)'
        };
        btnValEl.textContent = descMap[val] || val;
      }
    });
  });

  let audioCtx = null;
  // Sound helper (Web Audio API)
  function playBeep(freq = 880, dur = 0.15, times = 3) {
    if (!soundEnabled) return;
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      let t = audioCtx.currentTime;
      for (let i = 0; i < times; i++) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.start(t); osc.stop(t + dur);
        t += dur + 0.05;
      }
    } catch (err) {
      console.warn("Audio Context play error:", err);
    }
  }

  // Sound toggle
  document.getElementById('soundToggleBtn')?.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    document.getElementById('soundToggleBtn').textContent = soundEnabled ? '🔔' : '🔕';
  });

  // Rest timer
  let isRestPaused = false;

  function startRestTimer(seconds) {
    if (restTimer) clearInterval(restTimer);
    restTotal = seconds;
    restRemaining = seconds;
    isResting = true;
    isRestPaused = false;
    
    const pauseToggle = document.getElementById('restPauseToggle');
    if (pauseToggle) {
      pauseToggle.textContent = 'Pausar ⏸';
      pauseToggle.style.background = 'rgba(245,158,11,0.15)';
      pauseToggle.style.borderColor = 'rgba(245,158,11,0.3)';
      pauseToggle.style.color = '#f59e0b';
    }

    const overlay = document.getElementById('restTimerOverlay');
    const cd = document.getElementById('restCountdown');
    const bar = document.getElementById('restBarFill');
    if (!overlay) return;
    overlay.style.display = 'block';
    
    const updateUI = () => {
      if (cd) cd.textContent = restRemaining;
      if (bar) bar.style.width = `${(restRemaining / restTotal) * 100}%`;
    };
    updateUI();
    
    restTimer = setInterval(() => {
      if (isRestPaused) return;
      restRemaining--;
      restSeconds++;
      updateUI();
      if (restRemaining <= 5 && restRemaining > 0) {
        playBeep(800, 0.06, 1);
      }
      if (restRemaining <= 0) {
        clearInterval(restTimer);
        overlay.style.display = 'none';
        isResting = false;
        activeRestingRowId = null;
        playBeep(1000, 0.25, 3);
      }
    }, 1000);
  }

  function stopRestTimer() {
    if (restTimer) clearInterval(restTimer);
    isResting = false;
    activeRestingRowId = null;
    const overlay = document.getElementById('restTimerOverlay');
    if (overlay) overlay.style.display = 'none';
  }

  // Helper to add a set row for free workouts
  const addFreeSetRow = (ei, si) => {
    const container = document.getElementById(`fex_sets_${ei}`);
    if (!container) return;
    
    const row = document.createElement('div');
    row.className = 'portal-solo-set-row';
    row.id = `fex_setrow_${ei}_${si}`;
    
    row.innerHTML = `
      <span class="portal-set-num">S${si+1}</span>
      <input type="number" placeholder="Reps" class="portal-solo-input" id="fex_${ei}_${si}_reps" min="0">
      <input type="number" placeholder="kg" class="portal-solo-input" id="fex_${ei}_${si}_load" min="0" step="0.5">
      
      <select class="portal-solo-input portal-solo-pse" id="fex_${ei}_${si}_pse" style="display: none;">
        <option value="" disabled selected>PSE</option>
        <option value="1">1 - M. Leve</option>
        <option value="2">2 - Leve</option>
        <option value="3">3 - Moderado</option>
        <option value="4">4 - A. Pesado</option>
        <option value="5">5 - Forte</option>
        <option value="6">6 - Forte+</option>
        <option value="7">7 - M. Forte</option>
        <option value="8">8 - M. Forte+</option>
        <option value="9">9 - Extr. Forte</option>
        <option value="10">10 - Máximo</option>
      </select>
      <button type="button" class="portal-solo-input portal-solo-pse portal-solo-pse-btn" id="fex_psebtn_${ei}_${si}">PSE</button>
      
      <select class="portal-solo-input portal-solo-pse" id="fex_${ei}_${si}_rir" style="display: none;">
        <option value="" disabled selected>RIR</option>
        <option value="0">0 RIR (Falha)</option>
        <option value="1">1 RIR</option>
        <option value="2">2 RIR</option>
        <option value="3">3 RIR</option>
        <option value="4">4 RIR</option>
        <option value="5">5 RIR</option>
        <option value="6">6 RIR</option>
        <option value="7">7 RIR</option>
        <option value="8">8 RIR</option>
        <option value="9">9 RIR</option>
        <option value="10">10+ RIR</option>
      </select>
      <button type="button" class="portal-solo-input portal-solo-pse portal-solo-rir-btn" id="fex_rirbtn_${ei}_${si}">RIR</button>
      
      <button class="portal-solo-done-btn" id="fex_sdb_${ei}_${si}" data-ei="${ei}" data-si="${si}">&#10003;</button>
    `;
    
    container.appendChild(row);
    
    const pseBtn = row.querySelector(`#fex_psebtn_${ei}_${si}`);
    const pseSelect = row.querySelector(`#fex_${ei}_${si}_pse`);
    if (pseBtn && pseSelect) {
      updatePseButton(pseBtn, '');
      pseBtn.addEventListener('click', () => {
        openCustomSelector('Selecionar PSE', PSE_OPTIONS, pseSelect.value, (val) => {
          pseSelect.value = val;
          pseSelect.dispatchEvent(new Event('change'));
          updatePseButton(pseBtn, val);
        });
      });
    }
    
    const rirBtn = row.querySelector(`#fex_rirbtn_${ei}_${si}`);
    const rirSelect = row.querySelector(`#fex_${ei}_${si}_rir`);
    if (rirBtn && rirSelect) {
      updateRirButton(rirBtn, '');
      rirBtn.addEventListener('click', () => {
        openCustomSelector('Selecionar RIR', RIR_OPTIONS, rirSelect.value, (val) => {
          rirSelect.value = val;
          rirSelect.dispatchEvent(new Event('change'));
          updateRirButton(rirBtn, val);
        });
      });
    }
    
    const doneBtn = row.querySelector(`.portal-solo-done-btn`);
    doneBtn.addEventListener('click', () => {
      const isDone = doneBtn.classList.toggle('done');
      row.classList.toggle('set-done', isDone);
      if (isDone) {
        workSeconds += 30;
        const restInput = document.getElementById(`fex_${ei}_rest`);
        const restSec = parseInt(restInput?.value) || 60;
        const overlay = document.getElementById('restTimerOverlay');
        if (overlay) {
          row.after(overlay);
        }
        activeRestingRowId = row.id;
        startRestTimer(restSec);
        playBeep(440, 0.1, 1);
      } else {
        if (activeRestingRowId === row.id) {
          stopRestTimer();
        }
      }
    });
  };

  document.getElementById('restPauseToggle')?.addEventListener('click', () => {
    isRestPaused = !isRestPaused;
    const btn = document.getElementById('restPauseToggle');
    if (btn) {
      if (isRestPaused) {
        btn.textContent = 'Retomar ▶';
        btn.style.background = 'rgba(16,185,129,0.15)';
        btn.style.borderColor = 'rgba(16,185,129,0.3)';
        btn.style.color = '#10b981';
      } else {
        btn.textContent = 'Pausar ⏸';
        btn.style.background = 'rgba(245,158,11,0.15)';
        btn.style.borderColor = 'rgba(245,158,11,0.3)';
        btn.style.color = '#f59e0b';
      }
    }
  });

  document.getElementById('restSkip')?.addEventListener('click', stopRestTimer);
  document.getElementById('restMinus')?.addEventListener('click', () => {
    restRemaining = Math.max(5, restRemaining - 15);
    restTotal = Math.max(5, restTotal - 15);
    document.getElementById('restCountdown').textContent = restRemaining;
  });
  document.getElementById('restPlus')?.addEventListener('click', () => {
    restRemaining += 15; restTotal += 15;
    document.getElementById('restCountdown').textContent = restRemaining;
  });

  // Workout card picker
  document.querySelectorAll('.portal-workout-pick-item').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.portal-workout-pick-item').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      const wid = card.dataset.wid;
      if (selInput) selInput.value = wid;
      const w = workouts.find(w => w.id === wid);
    if (w && w.exercises?.length) {
        // Garantir groupId para métodos combinados (treinos salvos antes dessa feature)
        const COMBO = new Set(['Bi-set','Super-série Agonista','Super-série Antagonista','Tri-set','Série Gigante','Pré-exaustão']);
        let gc = 0;
        for (let i = 0; i < w.exercises.length; i++) {
          if (!COMBO.has(w.exercises[i].method)) continue;
          if (w.exercises[i].groupId) continue;
          const gid = `grp_${++gc}`;
          w.exercises[i].groupId = gid;
          for (let j = i + 1; j < w.exercises.length; j++) {
            if (w.exercises[j].method === w.exercises[i].method) w.exercises[j].groupId = gid;
            else break;
          }
        }
        exBlock.innerHTML = `
          <div class="portal-section-sub" style="margin-bottom:8px">Exercícios do Treino</div>
          ${w.exercises.map((ex,i) => `
            <div class="glass-card portal-ex-pick-card" data-ei="${i}" data-wid="${w.id}" style="padding:12px;margin-bottom:8px;cursor:pointer;display:flex;align-items:center;gap:12px;transition:all 0.2s">
              <div class="portal-ex-num" style="min-width:28px;height:28px;border-radius:50%;background:rgba(99,102,241,0.2);color:#818cf8;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700">${i+1}</div>
              <div style="flex:1;min-width:0">
                <div class="portal-ex-name" style="font-size:0.88rem;font-weight:600">${ex.name}</div>
                <div class="portal-ex-detail">${ex.sets||3}×${ex.reps||'10-12'}${ex.load?' &middot; '+ex.load+'kg':''}${ex.rest?' &middot; '+ex.rest+'s':''}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--portal-text-muted);flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
          `).join('')}`;
        // Bind info tap
        exBlock.querySelectorAll('.portal-ex-pick-card').forEach(card => {
          card.addEventListener('click', async () => {
            const ei = parseInt(card.dataset.ei);
            const ex = w.exercises[ei];
            if (ex) await showExerciseModal(ex);
          });
        });
      } else { exBlock.innerHTML = ''; }
    });
  });

  // Start suggested workout
  document.getElementById('startSuggestedBtn')?.addEventListener('click', (e) => {
    const wid = e.currentTarget.dataset.wid;
    if (selInput) selInput.value = wid;
    document.querySelectorAll('.portal-workout-pick-item').forEach(c => c.classList.remove('selected'));
    const matchCard = document.querySelector(`.portal-workout-pick-item[data-wid="${wid}"]`);
    if (matchCard) matchCard.classList.add('selected');
    document.getElementById('soloStartBtn')?.click();
  });

  // Build exercise log HTML
  function buildExerciseLog(w) {
    const exLogEl = document.getElementById('soloExerciseLog');
    if (w && w.exercises?.length) {
      exLogEl.innerHTML = w.exercises.map((ex, ei) => `
        <div class="glass-card portal-live-ex-card" id="excard_${ei}">
          <div class="portal-live-ex-header">
            <div class="portal-ex-num">${ei+1}</div>
            <div style="flex:1;min-width:0">
              <div class="portal-ex-name">${ex.name}</div>
              <div class="portal-ex-detail">${ex.sets||3}×${ex.reps||'10-12'}${ex.load?` · ${ex.load}kg`:''}${ex.rest?` · ${ex.rest}s descanso`:''}</div>
              ${ex.method?`<div class="portal-ex-method">${ex.method}</div>`:''}
              ${(() => {
                const CARDIO = {
                  'Zona 1 (Z1)':{fc:'50-65'},
                  'Zona 2 (Z2)':{fc:'65-75'},
                  'Zona 3 (Z3) — Zona Cinzenta':{fc:'75-87'},
                  'Zona 4 (Z4) — Limiar':{fc:'85-92'},
                  'Zona 5 (Z5) — VO2max':{fc:'90-100'},
                  'Tabata':{fc:'90-100'},
                  'HIIT 1:2':{fc:'85-95'},
                  'HIIT 1:1':{fc:'85-95'},
                  'SIT (Sprint Interval Training)':{fc:'ALL-OUT'},
                  'Série de Repetição (VO2max)':{fc:'90-100'},
                  'Steady State Z2':{fc:'65-75'},
                  'Progressivo':{fc:'60-90'},
                };
                const COMBINED = new Set(['Bi-set','Super-série Agonista','Super-série Antagonista','Tri-set','Série Gigante','Pré-exaustão']);
                const cm = CARDIO[ex.method];
                const isCombo = COMBINED.has(ex.method);
                const nextEx2 = w.exercises[ei + 1];
                // Usar groupId se disponível, fallback para método consecutivo
                const isLastOfGroup = !nextEx2
                  || (ex.groupId ? nextEx2.groupId !== ex.groupId : (!COMBINED.has(nextEx2.method) || nextEx2.method !== ex.method));
                return [
                  cm ? `<div style="font-size:0.62rem;color:var(--portal-accent,#06b6d4);margin-top:2px;font-weight:600"> ${cm.fc}% FC Máx</div>` : '',
                  isCombo ? `<div style="font-size:0.62rem;font-weight:700;color:#f59e0b;margin-top:3px;padding:2px 6px;background:rgba(245,158,11,0.12);border-radius:6px;display:inline-block"> ${ex.method} · ${isLastOfGroup ? `${ex.rest||90}s descanso pós-par` : '→ próximo exercício'}</div>` : '',
                ].join('');
              })()}
              ${(ex.trainerNotes || ex.notes) ? `
                <div style="margin-top:6px;padding:7px 10px;background:rgba(16,185,129,0.08);border-left:3px solid #10b981;border-radius:0 8px 8px 0">
                  <div style="font-size:0.58rem;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px"> Orientações</div>
                  <div style="font-size:0.78rem;color:var(--portal-text-secondary,#cbd5e1);line-height:1.5">${ex.trainerNotes || ex.notes}</div>
                </div>` : ''}
            </div>
            <button class="portal-ex-info-btn" data-ei="${ei}" title="Ver detalhes" style="background:rgba(99,102,241,0.15);border:none;border-radius:50%;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </button>
            ${ex.videoUrl?`<a href="${ex.videoUrl}" target="_blank" class="portal-ex-video"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>Vídeo</a>`:''}
          </div>

          ${ex.description||ex.notes?`<div class="portal-ex-desc">${ex.description||ex.notes}</div>`:''}

          <!-- Sets container (suporta séries extras adicionadas dinamicamente) -->
          <div id="sets_container_${ei}">
            ${Array.from({length: parseInt(ex.sets)||3}, (_, si) => {
              let repsVal = '';
              let loadVal = '';
              let restVal = ex.rest || 60;

              if (ex.seriesProgression && ex.seriesProgression[si]) {
                const sp = ex.seriesProgression[si];
                repsVal = parseInt(sp.reps) || '';
                loadVal = sp.load !== undefined && sp.load !== null ? sp.load : '';
                restVal = sp.rest !== undefined && sp.rest !== null ? sp.rest : restVal;
              } else {
                if (ex.reps && typeof ex.reps === 'string' && ex.reps.includes('→')) {
                  const parts = ex.reps.split('→');
                  repsVal = parseInt(parts[si] || ex.reps) || '';
                } else {
                  repsVal = parseInt(ex.reps) || '';
                }
                loadVal = ex.load || '';
              }

              // Badge inteligente para métodos com clusters (Rest-Pause, Cluster)
              const isClusterMethod = ex.method === 'Rest-Pause' || ex.method === 'Cluster';
              let setNumLabel = `S${si+1}`;
              let setSubLabel = '';
              if (isClusterMethod && ex.seriesProgression?.[si]?.label) {
                const lbl = ex.seriesProgression[si].label;
                const cMatch = lbl.match(/Cluster\s*(\d+)/i);
                if (cMatch) {
                  const cNum = cMatch[1];
                  const isPausa = lbl.toLowerCase().includes('pausa');
                  const miniIdx = ex.seriesProgression.slice(0, si).filter(s => s.label?.match(new RegExp(`Cluster\\s*${cNum}`, 'i'))).length + 1;
                  setNumLabel = `C${cNum}`;
                  setSubLabel = isPausa ? `P${miniIdx}` : `M1`;
                }
              }

              return `
                <div class="portal-solo-set-row" id="setrow_${ei}_${si}">
                  <span class="portal-set-num" style="display:flex;flex-direction:column;align-items:center;line-height:1.1">
                    <span>${setNumLabel}</span>
                    ${setSubLabel ? `<span style="font-size:0.55em;opacity:0.7">${setSubLabel}</span>` : ''}
                  </span>
                  <input type="number" placeholder="Reps" class="portal-solo-input" id="sr_${ei}_${si}_reps" min="0" value="${repsVal}">
                  <input type="number" placeholder="kg" class="portal-solo-input" id="sr_${ei}_${si}_load" min="0" step="0.5" value="${loadVal}">
                  <select class="portal-solo-input portal-solo-pse" id="sr_${ei}_${si}_pse" style="display:none;">
                    <option value="" disabled selected>PSE</option>
                    ${[1,2,3,4,5,6,7,8,9,10].map(n=>`<option value="${n}">${n}</option>`).join('')}
                  </select>
                  <button type="button" class="portal-solo-input portal-solo-pse portal-solo-pse-btn" id="psebtn_${ei}_${si}">PSE</button>
                  <select class="portal-solo-input portal-solo-pse" id="sr_${ei}_${si}_rir" style="display:none;">
                    <option value="" disabled selected>RIR</option>
                    ${[0,1,2,3,4,5,6,7,8,9,10].map(n=>`<option value="${n}">${n===0?'0 (Falha)':n+' RIR'}</option>`).join('')}
                  </select>
                  <button type="button" class="portal-solo-input portal-solo-pse portal-solo-rir-btn" id="rirbtn_${ei}_${si}">RIR</button>
                  <button class="portal-solo-done-btn" id="sdb_${ei}_${si}" data-ei="${ei}" data-si="${si}" data-rest="${restVal}">&#10003;</button>
                </div>`;
            }).join('')}
          </div>

          <!-- + Série -->
          <button type="button" class="portal-add-set-btn" id="addset_${ei}" data-ei="${ei}" data-rest="${ex.rest||60}"
            style="width:100%;margin-top:6px;padding:7px;background:rgba(99,102,241,0.08);border:1px dashed rgba(99,102,241,0.25);border-radius:8px;color:#818cf8;font-size:0.75rem;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            + Série extra
          </button>

          <!-- Observações do exercício -->
          <div style="margin-top:8px">
            <div style="font-size:0.65rem;font-weight:600;color:var(--portal-text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px"> Observações</div>
            <textarea class="portal-textarea" id="exnotes_${ei}" rows="2"
              placeholder="Sensação na série, ajuste de técnica, dor, carga ideal..."
              style="font-size:0.8rem;resize:none;background:rgba(255,255,255,0.03);border-color:rgba(255,255,255,0.1);border-radius:8px;padding:8px 10px;color:var(--portal-text)"></textarea>
          </div>
        </div>
      `).join('');

      // Botão flutuante "+ Exercício extra" ao fim da lista
      exLogEl.insertAdjacentHTML('beforeend', `
        <button id="addExtraExBtn" type="button"
          style="width:100%;padding:10px;background:rgba(16,185,129,0.08);border:1px dashed rgba(16,185,129,0.3);border-radius:10px;color:#10b981;font-size:0.8rem;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;margin-top:4px">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          + Exercício extra
        </button>
        <div id="extraExercisesBlock"></div>
      `);
    } else {
      // Free log
      exLogEl.innerHTML = `
        <div id="soloFreeExercises"></div>
        <button id="soloAddExBtn" class="portal-expand-btn" style="border:1px dashed rgba(255,255,255,0.15);border-radius:10px;padding:10px;width:100%;justify-content:center;margin-bottom:8px;color:var(--portal-primary)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Adicionar exercício
        </button>`;
      let cnt = 0;
      document.getElementById('soloAddExBtn')?.addEventListener('click', () => {
        const div = document.createElement('div');
        div.className = 'glass-card'; 
        div.style.cssText = 'padding:14px;margin-bottom:12px;position:relative;';
        const ei = cnt++;
        let setCnt = 0;
        
        div.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:8px">
            <input type="text" placeholder="Nome do exercício" class="portal-textarea" id="fex_${ei}_name" style="margin-bottom:0;flex:1;font-weight:600">
            <button type="button" class="fex-remove-btn" style="background:rgba(239,68,68,0.15);border:none;border-radius:50%;width:24px;height:24px;color:#ef4444;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:0.8rem;flex-shrink:0" title="Remover exercício">&times;</button>
          </div>
          
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span style="font-size:0.75rem;color:var(--portal-text-muted)">Tempo de descanso:</span>
            <input type="number" id="fex_${ei}_rest" value="60" class="portal-solo-input" style="width:65px;padding:2px 4px;font-size:0.75rem;height:24px" min="0">
            <span style="font-size:0.75rem;color:var(--portal-text-muted)">segundos</span>
          </div>

          <div class="free-sets-container" id="fex_sets_${ei}" style="display:flex;flex-direction:column;gap:6px"></div>
          
          <button type="button" class="portal-expand-btn add-free-set-btn" id="fex_addset_${ei}" style="background:rgba(99,102,241,0.1);color:#818cf8;border:1px dashed rgba(99,102,241,0.2);padding:8px;border-radius:6px;width:100%;font-size:0.8rem;margin-top:8px;display:flex;align-items:center;justify-content:center;gap:4px">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Adicionar série
          </button>
          
          <div style="margin-top:8px">
            <textarea class="portal-textarea" id="fex_notes_${ei}" rows="1" placeholder="Anotações deste exercício..." style="font-size:0.8rem"></textarea>
          </div>
        `;
        
        document.getElementById('soloFreeExercises').appendChild(div);
        
        // Add first set row
        addFreeSetRow(ei, setCnt++);
        
        // Bind add set button
        div.querySelector(`#fex_addset_${ei}`).addEventListener('click', () => {
          addFreeSetRow(ei, setCnt++);
        });
        
        // Bind remove button
        div.querySelector('.fex-remove-btn').addEventListener('click', () => {
          div.remove();
        });
      });
    }

    // Bind done buttons
    const COMBINED_SET = new Set(['Bi-set','Super-série Agonista','Super-série Antagonista','Tri-set','Série Gigante','Pré-exaustão']);

    exLogEl.querySelectorAll('.portal-solo-done-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const isDone = btn.classList.toggle('done');
        const row = btn.closest('.portal-solo-set-row');
        if (row) {
          row.classList.toggle('set-done', isDone);
          if (isDone) {
            workSeconds += 30;
            const ei = parseInt(btn.dataset.ei);
            const ex = w?.exercises?.[ei];
            const isCombined = COMBINED_SET.has(ex?.method);
            const nextEx = w?.exercises?.[ei + 1];
            // Usar groupId se disponível
            const isLastOfGroup = !nextEx
              || (ex?.groupId ? nextEx?.groupId !== ex?.groupId : (!COMBINED_SET.has(nextEx?.method) || nextEx?.method !== ex?.method));

            let restSec = parseInt(btn.dataset.rest) || 60;
            // Métodos combinados: descanso=0 se não é o último do grupo
            if (isCombined && !isLastOfGroup) restSec = 0;

            const overlay = document.getElementById('restTimerOverlay');
            if (overlay) row.after(overlay);
            activeRestingRowId = row.id;

            if (restSec === 0) {
              // Avança visualmente para o próximo exercício sem descanso
              const nextCard = document.getElementById(`excard_${ei + 1}`);
              if (nextCard) {
                nextCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                nextCard.style.boxShadow = '0 0 0 2px #f59e0b';
                setTimeout(() => { nextCard.style.boxShadow = ''; }, 1200);
              }
            } else {
              startRestTimer(restSec);
            }
            playBeep(440, 0.1, 1);
          } else {
            if (activeRestingRowId === row.id) stopRestTimer();
          }
        }
      });
    });

    // Bind info buttons and image previews
    if (w?.exercises) {
      exLogEl.querySelectorAll('.portal-ex-info-btn, .portal-ex-img-preview').forEach(el => {
        el.addEventListener('click', async (e) => {
          e.stopPropagation();
          const ei = parseInt(el.dataset.ei);
          const ex = w.exercises[ei];
          if (ex) await showExerciseModal(ex);
        });
      });
    }

    // Bind custom PSE/RIR buttons for preset exercises
    exLogEl.querySelectorAll('.portal-solo-pse-btn').forEach(btn => {
      const selectId = btn.id.replace('psebtn_', 'sr_') + '_pse';
      const selectEl = document.getElementById(selectId);
      if (!selectEl) return;
      
      // Initialize state
      updatePseButton(btn, selectEl.value);

      btn.addEventListener('click', () => {
        openCustomSelector('Selecionar PSE', PSE_OPTIONS, selectEl.value, (val) => {
          selectEl.value = val;
          selectEl.dispatchEvent(new Event('change'));
          updatePseButton(btn, val);
        });
      });
    });

    exLogEl.querySelectorAll('.portal-solo-rir-btn').forEach(btn => {
      const selectId = btn.id.replace('rirbtn_', 'sr_') + '_rir';
      const selectEl = document.getElementById(selectId);
      if (!selectEl) return;

      // Initialize state
      updateRirButton(btn, selectEl.value);

      btn.addEventListener('click', () => {
        openCustomSelector('Selecionar RIR', RIR_OPTIONS, selectEl.value, (val) => {
          selectEl.value = val;
          selectEl.dispatchEvent(new Event('change'));
          updateRirButton(btn, val);
        });
      });
    });
    // ── + SÉRIE EXTRA por exercício ──
    exLogEl.querySelectorAll('.portal-add-set-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const ei = parseInt(btn.dataset.ei);
        const restSec = btn.dataset.rest || 60;
        const container = document.getElementById(`sets_container_${ei}`);
        if (!container) return;
        const existing = container.querySelectorAll('.portal-solo-set-row').length;
        const si = existing; // próximo índice
        const row = document.createElement('div');
        row.className = 'portal-solo-set-row';
        row.id = `setrow_${ei}_${si}`;
        row.style.cssText = 'border-left:2px solid rgba(99,102,241,0.4);padding-left:4px';
        row.innerHTML = `
          <span class="portal-set-num" style="color:#818cf8">S${si+1}</span>
          <input type="number" placeholder="Reps" class="portal-solo-input" id="sr_${ei}_${si}_reps" min="0">
          <input type="number" placeholder="kg"   class="portal-solo-input" id="sr_${ei}_${si}_load" min="0" step="0.5">
          <select class="portal-solo-input portal-solo-pse" id="sr_${ei}_${si}_pse" style="display:none;">
            ${[1,2,3,4,5,6,7,8,9,10].map(n=>`<option value="${n}">${n}</option>`).join('')}
          </select>
          <button type="button" class="portal-solo-input portal-solo-pse portal-solo-pse-btn" id="psebtn_${ei}_${si}">PSE</button>
          <select class="portal-solo-input portal-solo-pse" id="sr_${ei}_${si}_rir" style="display:none;">
            ${[0,1,2,3,4,5,6,7,8,9,10].map(n=>`<option value="${n}">${n===0?'0 (Falha)':n+' RIR'}</option>`).join('')}
          </select>
          <button type="button" class="portal-solo-input portal-solo-pse portal-solo-rir-btn" id="rirbtn_${ei}_${si}">RIR</button>
          <button class="portal-solo-done-btn" id="sdb_${ei}_${si}" data-ei="${ei}" data-si="${si}" data-rest="${restSec}">&#10003;</button>
        `;
        container.appendChild(row);
        // Bind done button
        row.querySelector(`#sdb_${ei}_${si}`)?.addEventListener('click', (e) => {
          const doneBtn = e.currentTarget;
          const isDone = doneBtn.classList.toggle('done');
          if (isDone) { workSeconds += 30; startRestTimer(parseInt(restSec)||60); }
          else if (activeRestingRowId === row.id) stopRestTimer();
        });
        // Bind PSE/RIR
        const pseBtn = row.querySelector(`#psebtn_${ei}_${si}`);
        const pseSelect = row.querySelector(`#sr_${ei}_${si}_pse`);
        if (pseBtn && pseSelect) {
          updatePseButton(pseBtn, '');
          pseBtn.addEventListener('click', () => openCustomSelector('PSE', PSE_OPTIONS, pseSelect.value, val => { pseSelect.value = val; updatePseButton(pseBtn, val); }));
        }
        const rirBtn = row.querySelector(`#rirbtn_${ei}_${si}`);
        const rirSelect = row.querySelector(`#sr_${ei}_${si}_rir`);
        if (rirBtn && rirSelect) {
          updateRirButton(rirBtn, '');
          rirBtn.addEventListener('click', () => openCustomSelector('RIR', RIR_OPTIONS, rirSelect.value, val => { rirSelect.value = val; updateRirButton(rirBtn, val); }));
        }
        row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });

    // ── + EXERCÍCIO EXTRA durante sessão ──
    let extraExCount = 0;
    document.getElementById('addExtraExBtn')?.addEventListener('click', () => {
      const block = document.getElementById('extraExercisesBlock');
      if (!block) return;
      const xei = `x${extraExCount++}`;
      const card = document.createElement('div');
      card.className = 'glass-card portal-live-ex-card';
      card.style.borderLeft = '2px solid rgba(16,185,129,0.4)';
      card.id = `extracard_${xei}`;
      card.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <input type="text" placeholder="Nome do exercício" class="portal-textarea" id="extraex_${xei}_name"
            style="margin-bottom:0;flex:1;font-weight:600;font-size:0.88rem;padding:8px 10px">
          <button type="button" style="background:rgba(239,68,68,0.12);border:none;border-radius:50%;width:26px;height:26px;color:#ef4444;cursor:pointer;font-size:0.9rem;flex-shrink:0" onclick="this.closest('.portal-live-ex-card').remove()">×</button>
        </div>
        <div id="extrasets_${xei}" style="display:flex;flex-direction:column;gap:5px"></div>
        <button type="button" class="extra-addset-btn" data-xei="${xei}" data-rest="60"
          style="width:100%;margin-top:6px;padding:7px;background:rgba(99,102,241,0.08);border:1px dashed rgba(99,102,241,0.25);border-radius:8px;color:#818cf8;font-size:0.75rem;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          + Série
        </button>
        <div style="margin-top:8px">
          <div style="font-size:0.65rem;font-weight:600;color:var(--portal-text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px"> Observações</div>
          <textarea class="portal-textarea" id="extraex_${xei}_notes" rows="2"
            placeholder="Sensação, carga ideal, observações técnicas..."
            style="font-size:0.8rem;resize:none"></textarea>
        </div>
      `;
      block.appendChild(card);
      // Add first set automatically
      card.querySelector('.extra-addset-btn').click();
      // Bind future + Série buttons
      card.querySelector('.extra-addset-btn').addEventListener('click', () => {
        const setsBlock = document.getElementById(`extrasets_${xei}`);
        const si = setsBlock.querySelectorAll('.portal-solo-set-row').length;
        const row = document.createElement('div');
        row.className = 'portal-solo-set-row';
        row.id = `extrarow_${xei}_${si}`;
        row.innerHTML = `
          <span class="portal-set-num">S${si+1}</span>
          <input type="number" placeholder="Reps" class="portal-solo-input" id="extra_${xei}_${si}_reps" min="0">
          <input type="number" placeholder="kg"   class="portal-solo-input" id="extra_${xei}_${si}_load" min="0" step="0.5">
          <select class="portal-solo-input portal-solo-pse" id="extra_${xei}_${si}_pse" style="display:none;">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<option value="${n}">${n}</option>`).join('')}</select>
          <button type="button" class="portal-solo-input portal-solo-pse portal-solo-pse-btn" id="extra_psebtn_${xei}_${si}">PSE</button>
          <select class="portal-solo-input portal-solo-pse" id="extra_${xei}_${si}_rir" style="display:none;">${[0,1,2,3,4,5,6,7,8,9,10].map(n=>`<option value="${n}">${n===0?'0 (Falha)':n+' RIR'}</option>`).join('')}</select>
          <button type="button" class="portal-solo-input portal-solo-pse portal-solo-rir-btn" id="extra_rirbtn_${xei}_${si}">RIR</button>
          <button class="portal-solo-done-btn" data-ei="${xei}" data-si="${si}" data-rest="60">&#10003;</button>
        `;
        setsBlock.appendChild(row);
        const pb = row.querySelector(`.portal-solo-pse-btn`);
        const ps = row.querySelector(`#extra_${xei}_${si}_pse`);
        if (pb && ps) { updatePseButton(pb,''); pb.addEventListener('click', ()=>openCustomSelector('PSE',PSE_OPTIONS,ps.value,v=>{ps.value=v;updatePseButton(pb,v);})); }
        const rb = row.querySelector(`.portal-solo-rir-btn`);
        const rs = row.querySelector(`#extra_${xei}_${si}_rir`);
        if (rb && rs) { updateRirButton(rb,''); rb.addEventListener('click', ()=>openCustomSelector('RIR',RIR_OPTIONS,rs.value,v=>{rs.value=v;updateRirButton(rb,v);})); }
        row.querySelector('.portal-solo-done-btn')?.addEventListener('click', e => {
          const isDone = e.currentTarget.classList.toggle('done');
          if (isDone) { workSeconds += 30; startRestTimer(60); }
        });
      });
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  function startMainTimer() {
    soloStartTime = new Date();
    soloTimerInterval = setInterval(() => {
      const elapsed = Math.floor((new Date() - soloStartTime) / 1000);
      // Only count work when NOT resting
      if (!isResting) workSeconds++;
      const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
      const el = document.getElementById('liveTotal');
      const ew = document.getElementById('liveWork');
      const er = document.getElementById('liveRest');
      if (el) el.textContent = fmt(elapsed);
      if (ew) ew.textContent = fmt(workSeconds);
      if (er) er.textContent = fmt(restSeconds);
    }, 1000);
  }

  document.getElementById('soloStartBtn')?.addEventListener('click', () => {
    document.getElementById('soloActiveSession').style.display = 'block';
    document.getElementById('soloStartBtn').style.display = 'none';
    document.getElementById('soloExercisesBlock').style.display = 'none';
    document.getElementById('soloWorkoutPicker').style.display = 'none';
    document.getElementById('suggestedCard')?.remove();
    document.querySelector('.portal-section-sub')?.remove();

    const wid = selInput?.value || '';
    const w = workouts.find(w => w.id === wid);
    buildExerciseLog(w);
    startMainTimer();
  });

  document.getElementById('soloFinishBtn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (btn.disabled) return;
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.style.pointerEvents = 'none';
    btn.innerHTML = '<div class="portal-spin-ring" style="width:16px;height:16px;border-width:2px;border-top-color:#fff;margin-right:8px"></div> Salvando...';

    clearInterval(soloTimerInterval);
    stopRestTimer();
    const durationMin = Math.round((new Date() - soloStartTime) / 60000);
    const wid = selInput?.value || '';
    let w = workouts.find(wk => wk.id === wid);
    // Fallback: buscar direto do DB se não encontrou no array local (ex: sync lag)
    if (!w && wid) {
      try { w = await db.get('workouts', wid); } catch(_) {}
    }
    const pse = parseInt(document.getElementById('soloPse')?.value) || 5;
    const notes = document.getElementById('soloNotes')?.value || '';

    // Collect setLog
    const setLog = [];
    const exercisesList = [];

    if (w && w.exercises?.length) {
      w.exercises.forEach((ex, ei) => {
        exercisesList.push({
          name: ex.name,
          sets: ex.sets || '3',
          reps: ex.reps || '10',
          load: parseFloat(ex.load) || 0,
          method: ex.method || ''
        });
        const exNotes = document.getElementById(`exnotes_${ei}`)?.value || '';
        // Collect all set rows (including extra sets added with + Série)
        const container = document.getElementById(`sets_container_${ei}`);
        const rows = container ? container.querySelectorAll('.portal-solo-set-row') : [];
        rows.forEach((row, si) => {
          const reps = row.querySelector(`[id$="_${si}_reps"]`)?.value || document.getElementById(`sr_${ei}_${si}_reps`)?.value;
          const load = row.querySelector(`[id$="_${si}_load"]`)?.value || document.getElementById(`sr_${ei}_${si}_load`)?.value;
          const psei = row.querySelector(`[id$="_${si}_pse"]`)?.value || document.getElementById(`sr_${ei}_${si}_pse`)?.value;
          const rir  = row.querySelector(`[id$="_${si}_rir"]`)?.value  || document.getElementById(`sr_${ei}_${si}_rir`)?.value;
          setLog.push({
            exIdx: ei, exerciseIdx: ei, exerciseName: ex.name, setIdx: si,
            reps: parseInt(reps)||0, load: parseFloat(load)||0,
            pse: psei ? parseInt(psei) : null,
            rir: rir !== '' && rir != null ? parseInt(rir) : null,
            notes: exNotes, isExtra: si >= (parseInt(ex.sets)||3)
          });
        });
      });

      // Collect extra exercises added during session
      const extraBlock = document.getElementById('extraExercisesBlock');
      if (extraBlock) {
        extraBlock.querySelectorAll('.portal-live-ex-card').forEach((card, xIdx) => {
          const xei = card.id.replace('extracard_', '');
          const nameEl = card.querySelector(`#extraex_${xei}_name`);
          const name = nameEl?.value || `Exercício Extra ${xIdx+1}`;
          const exNotes = card.querySelector(`#extraex_${xei}_notes`)?.value || '';
          const rows = card.querySelectorAll('.portal-solo-set-row');
          const baseExIdx = (w.exercises?.length || 0) + xIdx;
          exercisesList.push({ name, sets: String(rows.length), reps: '10', load: 0, method: '', isExtra: true });
          rows.forEach((row, si) => {
            const reps = row.querySelector(`[id$="_${si}_reps"]`)?.value;
            const load = row.querySelector(`[id$="_${si}_load"]`)?.value;
            const psei = row.querySelector(`[id*="_pse"]`)?.value;
            const rir  = row.querySelector(`[id*="_rir"]`)?.value;
            setLog.push({
              exIdx: baseExIdx, exerciseName: name, setIdx: si,
              reps: parseInt(reps)||0, load: parseFloat(load)||0,
              pse: psei ? parseInt(psei) : null, rir: rir ? parseInt(rir) : null,
              notes: exNotes, isExtra: true
            });
          });
        });
      }
    } else {
      // Collect from free exercises
      const freeCards = document.getElementById('soloFreeExercises')?.children || [];
      Array.from(freeCards).forEach((card, ei) => {
        const nameInput = card.querySelector(`input[id^="fex_${ei}_name"]`);
        if (!nameInput) return; // not an exercise card
        const name = nameInput.value || `Exercício ${ei+1}`;
        const exNotes = document.getElementById(`fex_notes_${ei}`)?.value || '';
        
        let si = 0;
        while (true) {
          const rowEl = document.getElementById(`fex_setrow_${ei}_${si}`);
          if (!rowEl) break;
          
          const reps = document.getElementById(`fex_${ei}_${si}_reps`)?.value;
          const load = document.getElementById(`fex_${ei}_${si}_load`)?.value;
          const psei = document.getElementById(`fex_${ei}_${si}_pse`)?.value;
          const rir = document.getElementById(`fex_${ei}_${si}_rir`)?.value;

          setLog.push({
            exIdx: ei,
            exerciseIdx: ei,
            exerciseName: name,
            setIdx: si,
            reps: parseInt(reps) || 0,
            load: parseFloat(load) || 0,
            pse: psei ? parseInt(psei) : null,
            rir: rir !== '' && rir != null ? parseInt(rir) : null,
            notes: exNotes
          });
          
          si++;
        }

        exercisesList.push({
          name: name,
          sets: String(si || 1),
          reps: document.getElementById(`fex_${ei}_0_reps`)?.value || '10',
          load: parseFloat(document.getElementById(`fex_${ei}_0_load`)?.value) || 0,
          method: ''
        });
      });
    }

    const totalVolume = setLog.reduce((t, x) => t + (x.load || 0) * (x.reps || 0), 0);
    const totalSets = setLog.length;
    const localDate = (()=>{ const d=new Date(),o=d.getTimezoneOffset(),l=new Date(d.getTime()-o*60000); return l.toISOString().split('T')[0]; })();

    const sessionData = {
      studentId: sid,
      trainerId: tid,
      trainer_id: tid,
      workoutId: wid || null,
      workoutName: w?.name || 'Treino Autônomo',
      date: localDate,
      status: 'completed',
      isSolo: true,
      durationMin,
      totalDuration: durationMin * 60,
      totalVolume,
      totalSets,
      exercises: exercisesList,
      setLog,
      postBiofeedback: { pse, notes },
    };

    try {
      // Tenta salvar — com retry em caso de falha transitória
      let saved = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await db.add('sessions', sessionData);
          saved = true;
          break;
        } catch (err) {
          console.error(`Tentativa ${attempt} falhou:`, err);
          if (attempt < 3) await new Promise(r => setTimeout(r, 600 * attempt));
        }
      }

      if (!saved) {
        // Salvar backup no localStorage para não perder dados
        const backupKey = `pp_session_backup_${sid}_${Date.now()}`;
        try { localStorage.setItem(backupKey, JSON.stringify(sessionData)); } catch(_) {}
        btn.disabled = false;
        btn.style.opacity = '';
        btn.style.pointerEvents = '';
        btn.innerHTML = '! Erro ao salvar — Tentar novamente';
        btn.style.background = 'linear-gradient(135deg,#ef4444,#dc2626)';
        if (typeof showToast === 'function') {
          showToast('Erro ao salvar treino. Seus dados foram preservados. Tente novamente.', 'error', 8000);
        }
        return;
      }

      document.getElementById('soloActiveSession').innerHTML = `
        <div class="portal-success">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--portal-success)" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <div>Treino salvo! Duração: ${durationMin} min · ${totalSets} séries</div>
        </div>`;

      setTimeout(async () => {
        document.getElementById('soloActiveSession').style.display = 'none';
        document.getElementById('soloActiveSession').innerHTML = '';
        document.getElementById('soloStartBtn').style.display = 'block';
        document.getElementById('soloWorkoutPicker').style.display = 'block';
        document.querySelectorAll('.portal-nav-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.section === 'home');
        });
        await loadSection('home');
      }, 1500);

    } catch(e) {
      console.error('Erro inesperado ao finalizar treino:', e);
      btn.disabled = false;
      btn.style.opacity = '';
      btn.style.pointerEvents = '';
      btn.innerHTML = '! Erro — Tentar novamente';
      btn.style.background = 'linear-gradient(135deg,#ef4444,#dc2626)';
    }
  });
}

// ── SESSÕES ────────────────────────────────────────────────────
function safeFormatDate(dStr, timeStr = '') {
  if (!dStr) return '';
  try {
    if (dStr.includes('/')) {
      const [d, m, y] = dStr.split('/');
      return new Date(y, m-1, d, 12).toLocaleDateString('pt-BR', {weekday:'short',day:'numeric',month:'short'});
    }
    const d = new Date(dStr + (dStr.includes('T') ? '' : (timeStr ? 'T'+timeStr : 'T12:00')));
    if (isNaN(d.getTime())) return dStr;
    return d.toLocaleDateString('pt-BR', {weekday:'short',day:'numeric',month:'short'});
  } catch { return dStr; }
}

// -- EXERCISE DETAIL MODAL -------------------------------------
async function showExerciseModal(ex) {
  // Remove any existing modal
  document.getElementById('exDetailModal')?.remove();
  const finalImageUrl = ex.imageUrl || (ex.videoUrl ? getYouTubeThumbnailUrl(ex.videoUrl) : '');

  let methodDesc = '';
  if (ex.method) {
    try {
      const allMethods = await db.getAll('methods');
      const method = allMethods.find(m => m.name.toLowerCase().trim() === ex.method.toLowerCase().trim());
      if (method && method.description) {
        methodDesc = method.description;
      }
    } catch (e) {
      console.warn('Erro ao buscar método para modal:', e);
    }
  }

  const muscleIcons = {
    'peito': '#f97316', 'chest': '#f97316',
    'costas': '#10b981', 'back': '#10b981',
    'pernas': '#6366f1', 'quad': '#6366f1', 'legs': '#6366f1', 'gluteo': '#6366f1',
    'ombro': '#06b6d4', 'shoulder': '#06b6d4',
    'biceps': '#f59e0b', 'bicep': '#f59e0b',
    'triceps': '#8b5cf6', 'tricep': '#8b5cf6',
    'core': '#ef4444', 'abdominal': '#ef4444',
  };
  const muscleLower = (ex.muscleGroup || ex.muscle || '').toLowerCase();
  const muscleColor = Object.entries(muscleIcons).find(([k])=>muscleLower.includes(k))?.[1] || '#818cf8';

  const loadTypeLabel = ex.loadType === 'bodyweight' ? 'Peso Corporal' :
                        ex.loadType === 'intensity' ? 'Intensidade (%)' : 'Carga (kg)';

  const modal = document.createElement('div');
  modal.id = 'exDetailModal';
  modal.style.cssText = `
    position:fixed;inset:0;z-index:9000;display:flex;flex-direction:column;justify-content:flex-end;
    align-items:center;
    background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);
    animation:fadeIn 0.2s ease;
  `;

  modal.innerHTML = `
    <style>
      @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
      @keyframes fadeIn { from{opacity:0} to{opacity:1} }
      #exDetailSheet { animation: slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1); }
    </style>
    <div id="exDetailSheet" style="
      background:var(--portal-card,#1e293b);border-radius:24px 24px 0 0;
      padding:0 0 env(safe-area-inset-bottom,20px);max-height:85vh;overflow-y:auto;
      box-shadow:0 -20px 60px rgba(0,0,0,0.5);
      width:100%;max-width:480px;margin:0 auto;box-sizing:border-box;
      border-top:1px solid rgba(255,255,255,0.08);
    ">
      <!-- Handle -->
      <div style="display:flex;justify-content:center;padding:12px 0 0">
        <div style="width:40px;height:4px;border-radius:2px;background:rgba(255,255,255,0.2)"></div>
      </div>

      <!-- Header -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;padding:16px 20px 12px">
        <div style="flex:1">
          <div style="font-size:1.15rem;font-weight:800;color:var(--portal-text,#f1f5f9);line-height:1.3">${ex.name}</div>
          ${ex.muscleGroup||ex.muscle ? `<div style="font-size:0.8rem;color:${muscleColor};font-weight:600;margin-top:4px">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="${muscleColor}" style="vertical-align:middle;margin-right:4px"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
            ${ex.muscleGroup||ex.muscle}
          </div>` : ''}
        </div>
        <button id="closeExModal" style="background:rgba(255,255,255,0.08);border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <!-- Quick stats row -->
      <div style="display:flex;gap:8px;padding:0 20px 16px;overflow-x:auto">
        ${ex.sets ? `<div style="background:rgba(99,102,241,0.15);border-radius:10px;padding:8px 14px;text-align:center;flex-shrink:0">
          <div style="font-size:1.1rem;font-weight:800;color:#818cf8">${ex.sets}</div>
          <div style="font-size:0.68rem;color:#94a3b8;margin-top:2px">Séries</div>
        </div>` : ''}
        ${ex.reps ? `<div style="background:rgba(16,185,129,0.15);border-radius:10px;padding:8px 14px;text-align:center;flex-shrink:0">
          <div style="font-size:1.1rem;font-weight:800;color:#10b981">${ex.reps}</div>
          <div style="font-size:0.68rem;color:#94a3b8;margin-top:2px">Reps</div>
        </div>` : ''}
        ${ex.load ? `<div style="background:rgba(249,115,22,0.15);border-radius:10px;padding:8px 14px;text-align:center;flex-shrink:0">
          <div style="font-size:1.1rem;font-weight:800;color:#f97316">${ex.load}${ex.loadType!=='bodyweight'?'kg':'%'}</div>
          <div style="font-size:0.68rem;color:#94a3b8;margin-top:2px">${loadTypeLabel}</div>
        </div>` : ''}
        ${ex.rest ? `<div style="background:rgba(6,182,212,0.15);border-radius:10px;padding:8px 14px;text-align:center;flex-shrink:0">
          <div style="font-size:1.1rem;font-weight:800;color:#06b6d4">${ex.rest}s</div>
          <div style="font-size:0.68rem;color:#94a3b8;margin-top:2px">Descanso</div>
        </div>` : ''}
        ${ex.rir!=null ? `<div style="background:rgba(245,158,11,0.15);border-radius:10px;padding:8px 14px;text-align:center;flex-shrink:0">
          <div style="font-size:1.1rem;font-weight:800;color:#f59e0b">RIR ${ex.rir}</div>
          <div style="font-size:0.68rem;color:#94a3b8;margin-top:2px">Reserva</div>
        </div>` : ''}
      </div>

      <!-- Media Container -->
      <div id="portalExMediaContainer" style="padding:0 20px 16px">
        ${finalImageUrl ? `
          <div id="portalExMediaCover" style="position:relative;width:100%;border-radius:14px;overflow:hidden;height:240px;background:#090d16;cursor:pointer;display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,0.08)">
            <img src="${finalImageUrl}" style="max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain" />
          </div>
        ` : ''}

        ${!finalImageUrl && ex.videoUrl ? `
          <div id="portalExMediaCover" style="position:relative;width:100%;border-radius:14px;overflow:hidden;height:180px;background:linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.15));cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;border:1px solid rgba(255,255,255,0.08)">
            <div style="width:56px;height:56px;border-radius:50%;background:var(--portal-primary);display:flex;align-items:center;justify-content:center;color:white;box-shadow:0 8px 20px var(--portal-primary-glow)">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style="margin-left:4px"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
            <span style="font-size:0.8rem;font-weight:700;color:var(--portal-text-secondary)">Carregar vídeo de execução</span>
          </div>
        ` : ''}

        ${ex.videoUrl ? `
          <button id="portalExPlayVideoBtn" style="width:100%;padding:10px 16px;border-radius:10px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.25);color:#818cf8;font-size:0.8rem;font-weight:700;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;margin-top:8px;transition:all 0.2s" onmouseover="this.style.background='rgba(99,102,241,0.18)'" onmouseout="this.style.background='rgba(99,102,241,0.1)'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Assistir vídeo de execução
          </button>
        ` : ''}

        ${!ex.videoUrl && !finalImageUrl ? `
          <div id="portalExMediaFallback" style="display:flex;height:120px;background:linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.08));border-radius:14px;flex-direction:column;align-items:center;justify-content:center;gap:8px;border:1px dashed rgba(255,255,255,0.1)">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            <span style="font-size:0.75rem;color:rgba(255,255,255,0.3)">Nenhuma mídia vinculada</span>
          </div>
        ` : ''}
      </div>

      <!-- Description / Technique -->
      <div style="padding:0 20px 20px">
        ${ex.description||ex.notes||ex.technique ? `
        <div style="background:rgba(255,255,255,0.04);border-radius:14px;padding:14px 16px;border-left:3px solid ${muscleColor}">
          <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${muscleColor};margin-bottom:8px">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${muscleColor}" stroke-width="2" style="vertical-align:middle;margin-right:4px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Técnica de Execução
          </div>
          <p style="font-size:0.82rem;line-height:1.7;color:var(--portal-text-secondary,#94a3b8);margin:0">${ex.description||ex.notes||ex.technique}</p>
        </div>` : `
        <div style="background:rgba(255,255,255,0.04);border-radius:14px;padding:14px 16px">
          <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin-bottom:8px">Dicas de Execução</div>
          <p style="font-size:0.82rem;line-height:1.7;color:#64748b;margin:0">Mantenha a postura correta durante todo o movimento. Controle a fase excêntrica (descida) em 2-3 segundos. Respire corretamente: expire no esforço, inspire no retorno.</p>
        </div>`}

        ${ex.method ? `
        <div style="margin-top:10px;background:rgba(139,92,246,0.1);border-radius:10px;padding:12px 14px;border:1px solid rgba(139,92,246,0.2)">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2.5"><polygon points="12 2 2 7 12 22 22 7 12 2"/></svg>
            <span style="font-size:0.8rem;color:#a78bfa;font-weight:700">${ex.method}</span>
          </div>
          ${methodDesc ? `<div style="font-size:0.75rem;color:rgba(255,255,255,0.75);line-height:1.45;margin-top:4px">${methodDesc}</div>` : ''}
        </div>` : ''}
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  document.getElementById('closeExModal')?.addEventListener('click', () => modal.remove());

  // Handle media interactions (play video, image load errors)
  if (finalImageUrl) {
    const img = modal.querySelector('#portalExMediaCover img');
    if (img) {
      img.addEventListener('error', () => {
        const cover = modal.querySelector('#portalExMediaCover');
        if (cover) cover.style.display = 'none';
        if (!ex.videoUrl) {
          const fallback = modal.querySelector('#portalExMediaFallback');
          if (fallback) fallback.style.display = 'flex';
        }
      });
    }
  }

  if (ex.videoUrl) {
    const playVideo = () => {
      const videoHtml = ex.videoUrl.includes('youtube') || ex.videoUrl.includes('youtu.be') ?
        `<div style="position:relative;padding-top:56.25%;border-radius:14px;overflow:hidden;background:#000">
          <iframe src="${getYouTubeEmbedUrl(ex.videoUrl)}" style="position:absolute;inset:0;width:100%;height:100%;border:none" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe>
        </div>` :
        `<video src="${ex.videoUrl}" controls autoplay playsinline style="width:100%;border-radius:14px;max-height:220px;background:#000"></video>`;
      
      const container = modal.querySelector('#portalExMediaContainer');
      if (container) {
        container.innerHTML = videoHtml;
      }
    };

    modal.querySelector('#portalExMediaCover')?.addEventListener('click', playVideo);
    modal.querySelector('#portalExPlayVideoBtn')?.addEventListener('click', playVideo);
  }
}

function renderSessoes(sessions, schedules) {
  const now = new Date();
  const upcoming = schedules
    .filter(s => new Date(s.date+'T'+(s.time||'23:59')) >= now)
    .sort((a,b) => new Date(a.date+'T'+a.time)-new Date(b.date+'T'+b.time))
    .slice(0,5);

  const allCompleted = sessions.filter(s => s.status === 'completed');
  const completed = allCompleted.sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0,20);
  // Sessions needing checkout (no student checkout, completed in the last 3 days)
  const needsCheckout = allCompleted.filter(s => {
    if (!s.postBiofeedback || !s.postBiofeedback.submittedByStudent) {
      if (!s.date) return false;
      const dateStr = s.date.includes('T') ? s.date.split('T')[0] : s.date;
      const daysAgo = (now - new Date(dateStr + 'T12:00')) / 86400000;
      return daysAgo <= 3;
    }
    return false;
  }).slice(0,3);

  return `
    <div class="portal-section">
      <h2 class="portal-section-title">Sessões</h2>

      ${upcoming.length ? `
        <div class="portal-section-sub">Próximas sessões</div>
        ${upcoming.map(s => `
          <div class="glass-card portal-session-upcoming">
            <div class="portal-session-date">${safeFormatDate(s.date)}</div>
            <div class="portal-session-time">${s.time || 'Horário a confirmar'}</div>
            <div class="portal-session-name">${s.workoutName || 'Treino'}</div>
          </div>
        `).join('')}
      ` : ''}

      <!-- CHECKOUT PENDENTE -->
      ${needsCheckout.length ? `
        <div class="portal-section-sub" style="margin-top:20px;color:var(--portal-warning)"> Checkout pendente</div>
        ${needsCheckout.map(s => `
          <div class="glass-card portal-checkout-card" id="checkout_${s.id}" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px">
            <div>
              <div class="portal-session-name" style="font-weight:700;font-size:0.95rem">${s.workoutName||'Treino'}</div>
              <div class="portal-session-meta" style="font-size:0.75rem;color:var(--portal-text-muted);margin-top:2px">${safeFormatDate(s.date)}</div>
            </div>
            <button onclick="window.showPortalCheckoutById('${s.id}')" class="portal-reminder-btn" style="background:linear-gradient(135deg,#f59e0b,#d97706);box-shadow:0 4px 12px rgba(245,158,11,0.15);color:#ffffff;border:none;border-radius:6px;padding:6px 12px;font-size:0.75rem;font-weight:700;cursor:pointer;white-space:nowrap;margin-left:12px">Fazer checkout</button>
          </div>
        `).join('')}
      ` : ''}

      <div class="portal-section-sub" style="margin-top:20px">Histórico</div>
      ${completed.length === 0 ? `<div class="portal-empty">Nenhuma sessão concluída ainda</div>` :
        completed.map(s => {
          const setLog = s.setLog || [];
          const vol = setLog.reduce((t,x) => t+(parseFloat(x.load)||0)*(parseFloat(x.reps)||0),0);
          const pse = s.postBiofeedback?.pse;
          const isSolo = s.isSolo;
          const hasCheckout = !!(s.postBiofeedback && s.postBiofeedback.submittedByStudent);
          return `
            <div class="portal-session-card glass-card${isSolo ? ' portal-session-solo' : ''}">
              <div class="portal-session-header">
                <div>
                  <div class="portal-session-name">${s.workoutName||'Treino'}${isSolo ? ' <span class="portal-solo-badge">autônomo</span>' : ''}</div>
                  <div class="portal-session-meta">${safeFormatDate(s.date)}</div>
                </div>
                <div class="portal-session-stats-sm">
                  ${vol>0?`<span>${Math.round(vol)}kg</span>`:''}
                  ${pse?`<span class="pse-badge ${getPseBadgeClass(pse)}">PSE ${pse}</span>`:
                    !hasCheckout?`<span class="portal-no-checkout">sem checkout</span>`:''}
                  ${s.durationMin ? `<span>${s.durationMin}min</span>` : ''}
                </div>
              </div>
              <div class="portal-session-sets" id="sets_${s.id}" style="display:none">
                ${(() => {
                  if (!setLog.length) return '<div class="text-muted" style="font-size:0.75rem;padding:8px 0">Sem dados de série</div>';
                  // Group sets by exerciseName
                  const groups = [];
                  const seen = {};
                  setLog.forEach(x => {
                    const key = x.exerciseName || ('Exercício ' + ((x.exerciseIdx||0)+1));
                    if (!seen[key]) { seen[key] = groups.length; groups.push({ name: key, sets: [] }); }
                    groups[seen[key]].sets.push(x);
                  });
                  return groups.map(g => `
                    <div class="portal-ex-group">
                      <div class="portal-ex-group-name" style="color:var(--portal-primary);font-size:0.8rem;margin-bottom:4px;font-weight:700">${g.name}</div>
                      ${g.sets.map(x => {
                        const pseClass = getPseBadgeClass(x.pse);
                        const rirColor = x.rir == null || x.rir === '' ? '' : x.rir <= 1 ? 'color:#ef4444' : x.rir <= 2 ? 'color:#f59e0b' : 'color:#10b981';
                        return `
                          <div class="portal-set-row set-colored">
                            <span class="portal-set-num">S${x.setIdx+1}</span>
                            <span>${x.reps} reps</span>
                            <span>${x.load}kg</span>
                            ${x.pse?`<span class="pse-mini ${pseClass}">PSE ${x.pse}</span>`:''}
                            ${x.rir!=null&&x.rir!==''?`<span style="${rirColor};font-size:0.68rem;font-weight:600">RIR ${x.rir}</span>`:''}
                          </div>`;
                      }).join('')}
                    </div>`).join('');
                })()}
              </div>
              ${setLog.length?`<button class="portal-expand-btn session-expand" data-id="${s.id}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                Ver exercícios
              </button>`:''}
            </div>`;
        }).join('')}
    </div>`;
}

function getPseBadgeClass(pse) {
  if (!pse) return '';
  if (pse >= 9) return 'pse-red';
  if (pse >= 7) return 'pse-orange';
  if (pse >= 5) return 'pse-yellow';
  return 'pse-green';
}

function initSessoesSection() {
  document.querySelectorAll('.session-expand').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const div = document.getElementById(`sets_${id}`);
      const isOpen = div.style.display !== 'none';
      div.style.display = isOpen ? 'none' : 'block';
      btn.innerHTML = isOpen
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg> Ver séries`
        : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg> Fechar`;
    });
  });
}

// ── BIOFEEDBACK ────────────────────────────────────────────────
function renderBio(biofeedbacks, sid, tid) {
  const last7 = biofeedbacks.slice(0, 7);
  const student = portalState.student;
  const birth = student?.birthDate ? new Date(student.birthDate) : null;
  const age = birth ? new Date().getFullYear() - birth.getFullYear() : parseInt(student?.age) || null;
  const isWomanUnder40 = student && (student.gender === 'F' || student.gender === 'Feminino') && age !== null && age < 40;

  return `
    <div class="portal-section">
      <h2 class="portal-section-title">Check-in</h2>

      <div class="glass-card portal-bio-form-card">
        <div class="portal-card-label">Biofeedback Pré-treino</div>
        <form id="portalBioForm">
          <div class="portal-bio-field">
            <label class="portal-bio-label">😴 Qualidade do Sono</label>
            ${renderInlineCardSelector('sleep', SONO_OPTIONS, 8)}
          </div>
          <div class="portal-bio-field">
            <label class="portal-bio-label"> Recuperação (TQR)</label>
            ${renderInlineCardSelector('tqr', TQR_OPTIONS, 5)}
          </div>
          <div class="portal-bio-field">
            <label class="portal-bio-label">🍎 Alimentação nas últimas 24h</label>
            ${renderInlineCardSelector('food', ALIMENTACAO_OPTIONS, 5)}
          </div>
          <div class="portal-bio-field">
            <label class="portal-bio-label">🤯 Estresse</label>
            ${renderInlineCardSelector('stress', ESTRESSE_OPTIONS, 5)}
          </div>
          <div class="portal-bio-field">
            <label class="portal-bio-label">🩹 Dor ou Desconforto Articular</label>
            ${renderInlineCardSelector('pain', DOR_OPTIONS, 1, 'window.onBioPainChange')}
          </div>
          <div id="portalPainGrp" style="display:none;margin-top:12px;margin-bottom:12px">
            <label class="portal-bio-label">Locais de dor <span class="text-muted text-xs">(toque para marcar/desmarcar)</span></label>
            <div id="painRegionsGrid" style="margin-top:8px;padding:10px;background:rgba(255,255,255,0.02);border:1px solid var(--portal-border);border-radius:12px">
              ${(() => {
                const groups = {};
                PAIN_REGIONS.forEach(r => {
                  if (!groups[r.group]) groups[r.group] = [];
                  groups[r.group].push(r);
                });
                return Object.entries(groups).map(([grp, regions]) => `
                  <div style="margin-bottom:10px">
                    <div style="font-size:0.6rem;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--portal-text-muted);margin-bottom:5px">${grp}</div>
                    <div style="display:flex;flex-wrap:wrap;gap:5px">
                      ${regions.map(r => `
                        <button type="button" class="portal-pain-chip" data-region="${r.id}"
                          style="display:flex;align-items:center;padding:5px 12px;border-radius:20px;border:1.5px solid var(--portal-border);background:transparent;color:var(--portal-text-muted);font-size:0.75rem;cursor:pointer;transition:all 0.15s;-webkit-tap-highlight-color:transparent">
                          <span>${r.label}</span>
                          <input type="checkbox" name="painRegions" value="${r.id}" style="display:none" />
                        </button>`).join('')}
                    </div>
                  </div>`).join('');
              })()}
            </div>
            <div class="portal-bio-field" style="margin-top:10px">
              <input class="portal-solo-input" name="painDescription" placeholder="Descreva a dor (opcional)..." style="text-align:left;padding:8px 12px;width:100%" />
            </div>
          </div>
          <div class="portal-bio-field">
            <label class="portal-bio-label">🎯 Motivação para Treinar</label>
            ${renderInlineCardSelector('motivation', MOTIVACAO_OPTIONS, 8)}
          </div>
          
          ${isWomanUnder40 ? `
          <div class="portal-bio-field">
            <label class="portal-bio-label">Ciclo Menstrual (Se aplicável)</label>
            <select name="menstrualCycle" class="portal-textarea" style="background:rgba(255,255,255,0.05);color:var(--portal-text);font-size:0.85rem">
              <option value="" selected>Não se aplica / Prefiro não informar</option>
              <option value="Menstruacao">Menstruação</option>
              <option value="Folicular">Fase Folicular (Pós-menstruação)</option>
              <option value="Ovulatoria">Fase Ovulatória</option>
              <option value="Lutea">Fase Lútea (Pré-menstrual / TPM)</option>
            </select>
          </div>
          ` : ''}

          <div class="portal-bio-field">
            <label class="portal-bio-label">Notas</label>
            <textarea name="notes" class="portal-textarea" rows="2" placeholder="Como está se sentindo hoje?"></textarea>
          </div>
          <button type="submit" class="portal-submit-btn">Enviar Check-in</button>
        </form>
      </div>

      ${last7.length ? `
        <div class="portal-section-sub" style="margin-top:20px">Histórico recente</div>
        ${last7.map(b => `
          <div class="glass-card portal-bio-history">
            <div class="portal-bio-date">${parseLocalDate(b.date).toLocaleDateString('pt-BR',{weekday:'short',day:'numeric',month:'short'})}</div>
            <div class="portal-bio-row" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
              ${b.sleep!=null?`
                <span style="display:inline-flex;align-items:center;gap:4px;background:rgba(96,165,250,0.12);border:1px solid rgba(96,165,250,0.2);color:#93c5fd;padding:2px 8px;border-radius:6px;font-size:0.68rem;font-weight:600">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="flex-shrink:0"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                  Sono: ${b.sleep}
                </span>`:''}
              ${b.tqr!=null?`
                <span style="display:inline-flex;align-items:center;gap:4px;background:rgba(52,211,153,0.12);border:1px solid rgba(52,211,153,0.2);color:#6ee7b7;padding:2px 8px;border-radius:6px;font-size:0.68rem;font-weight:600">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="flex-shrink:0"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  TQR: ${b.tqr}
                </span>`:''}
              ${b.food!=null?`
                <span style="display:inline-flex;align-items:center;gap:4px;background:rgba(244,63,94,0.12);border:1px solid rgba(244,63,94,0.2);color:#fda4af;padding:2px 8px;border-radius:6px;font-size:0.68rem;font-weight:600">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="flex-shrink:0"><path d="M12 2a5 5 0 0 0-5 5v3a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5z"/></svg>
                  Alim: ${b.food}/5
                </span>`:''}
              ${b.stress!=null?`
                <span style="display:inline-flex;align-items:center;gap:4px;background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.2);color:#fde047;padding:2px 8px;border-radius:6px;font-size:0.68rem;font-weight:600">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Stress: ${b.stress}
                </span>`:''}
              ${b.pain!=null?`
                <span style="display:inline-flex;align-items:center;gap:4px;background:rgba(248,113,113,0.12);border:1px solid rgba(248,113,113,0.2);color:#fca5a5;padding:2px 8px;border-radius:6px;font-size:0.68rem;font-weight:600">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="flex-shrink:0"><path d="M12 2v20M2 12h20"/></svg>
                  Dor: ${b.pain}
                </span>`:''}
              ${b.motivation!=null?`
                <span style="display:inline-flex;align-items:center;gap:4px;background:rgba(249,115,22,0.12);border:1px solid rgba(249,115,22,0.2);color:#ffedd5;padding:2px 8px;border-radius:6px;font-size:0.68rem;font-weight:600">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="flex-shrink:0"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  Mot: ${b.motivation}
                </span>`:''}
              ${b.pse!=null?`<span class="pse-badge ${getPseBadgeClass(b.pse)}">PSE ${b.pse}</span>`:''}
            </div>
            ${b.notes?`<div class="portal-bio-notes">${b.notes}</div>`:''}
          </div>
        `).join('')}
      ` : ''}
    </div>`;
}

function initBio() {
  window.onBioPainChange = (val) => {
    const painVal = parseInt(val) || 1;
    const grp = document.getElementById('portalPainGrp');
    if (grp) grp.style.display = painVal >= 3 ? 'block' : 'none';
  };

  setTimeout(() => {
    const initialPain = parseInt(document.getElementById('portal_pain')?.value) || 1;
    window.onBioPainChange(initialPain);

    document.querySelectorAll('#painRegionsGrid .portal-pain-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const cb = btn.querySelector('input[type="checkbox"]');
        if (!cb) return;
        cb.checked = !cb.checked;
        const selected = cb.checked;
        // Visual toggle
        btn.style.borderColor = selected ? '#ef4444' : 'var(--portal-border)';
        btn.style.background  = selected ? 'rgba(239,68,68,0.12)' : 'transparent';
        btn.style.color       = selected ? '#ef4444' : 'var(--portal-text-muted)';
        btn.style.fontWeight  = selected ? '700' : '';
      });
    });
  }, 100);

  document.getElementById('portalBioForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const painVal = parseInt(fd.get('pain')) || 1;
    
    const _d = new Date();
    const todayYMD = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}`;
    const bfId = `bf_${portalState.studentId}_${todayYMD}`;
    let existingBf = {};
    try {
      existingBf = await db.get('biofeedback', bfId) || {};
    } catch (e) {
      console.warn('Erro ao obter biofeedback existente:', e);
    }

    const tzoffset = _d.getTimezoneOffset() * 60000;
    const localISO = new Date(_d.getTime() - tzoffset).toISOString().slice(0, -1);

    const data = {
      ...existingBf,
      id: bfId,
      studentId: portalState.studentId,
      trainerId: portalState.trainerId,
      trainer_id: portalState.trainerId,
      formType: existingBf.formType === 'complete' ? 'complete' : 'pre',
      date: existingBf.date || localISO,
      sleep: parseInt(fd.get('sleep')),
      tqr: parseInt(fd.get('tqr')),
      stress: parseInt(fd.get('stress')),
      pain: painVal,
      painRegions: painVal >= 3 ? fd.getAll('painRegions') : [],
      painDescription: painVal >= 3 ? fd.get('painDescription') : '',
      food: parseInt(fd.get('food')) || 5,
      motivation: parseInt(fd.get('motivation')) || 7,
      menstrualCycle: fd.get('menstrualCycle') || '',
      notes: fd.get('notes') || existingBf.notes || '',
    };

    // Mapeamento para retrocompatibilidade
    data.mood = data.tqr;
    data.energy = data.tqr;

    // Sempre salvar localmente e sincronizar via db.put (que cuida do Supabase com o wrapper correto)
    await db.put('biofeedback', data);

    e.target.innerHTML = `<div class="portal-success">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--portal-success)" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <div>Check-in enviado! ✅</div>
    </div>`;
  });
}

function renderAvaliacoes(assessments) {
  const compAss = assessments.filter(a => a.type === 'composicao').sort((a,b) => new Date(b.date) - new Date(a.date));
  const forcaAss = assessments.filter(a => a.type === 'forca').sort((a,b) => new Date(b.date) - new Date(a.date));
  const conconiAss = assessments.filter(a => a.type === 'conconi').sort((a,b) => new Date(b.date) - new Date(a.date));

  let html = `
    <div class="portal-section" id="portalAvaliacoesSection" style="padding-bottom: 80px;">
      <h2 class="portal-section-title">Avaliações</h2>
      
      <!-- COMPOSIÇÃO CORPORAL -->
      <div class="glass-card" style="margin-bottom:16px">
        <div class="portal-card-label" style="display:flex;align-items:center;gap:6px;font-size:0.95rem;font-weight:800">
          ⚖️ Composição Corporal
        </div>
        ${compAss.length === 0 ? `
          <p class="portal-text-muted" style="text-align:center;padding:20px 0;font-size:0.8rem">Nenhuma avaliação de composição corporal registrada.</p>
        ` : `
          <!-- Latest evaluation key numbers -->
          <div class="portal-stats-row" style="margin-top:12px;margin-bottom:12px;display:flex;gap:10px">
            <div class="portal-stat-card glass-card" style="flex:1;text-align:center;padding:10px 4px">
              <div class="portal-stat-val" style="color:var(--portal-primary);font-size:1.15rem;font-weight:800">${compAss[0].peso || '—'} <span style="font-size:0.7rem;font-weight:400">kg</span></div>
              <div class="portal-stat-lbl" style="font-size:0.68rem">Peso Atual</div>
            </div>
            <div class="portal-stat-card glass-card" style="flex:1;text-align:center;padding:10px 4px">
              <div class="portal-stat-val" style="color:var(--portal-warning);font-size:1.15rem;font-weight:800">${compAss[0].percentualGordura || '—'} <span style="font-size:0.7rem;font-weight:400">%</span></div>
              <div class="portal-stat-lbl" style="font-size:0.68rem">% Gordura</div>
            </div>
            <div class="portal-stat-card glass-card" style="flex:1;text-align:center;padding:10px 4px">
              <div class="portal-stat-val" style="color:var(--portal-success);font-size:1.15rem;font-weight:800">${compAss[0].massaMagra || '—'} <span style="font-size:0.7rem;font-weight:400">kg</span></div>
              <div class="portal-stat-lbl" style="font-size:0.68rem">Massa Magra</div>
            </div>
          </div>

          <!-- Circumferences and skins -->
          <div style="font-size:0.8rem;line-height:1.6;margin-top:12px">
            <div style="font-weight:800;margin-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:4px;color:var(--portal-text)">Circunferências & Dobras Recentes</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
              <div>
                <div style="display:flex;justify-content:space-between;border-bottom:1px dashed rgba(255,255,255,0.03);padding:2px 0"><span>Cintura:</span> <strong>${compAss[0].cintura || '—'} cm</strong></div>
                <div style="display:flex;justify-content:space-between;border-bottom:1px dashed rgba(255,255,255,0.03);padding:2px 0"><span>Quadril:</span> <strong>${compAss[0].quadril || '—'} cm</strong></div>
                <div style="display:flex;justify-content:space-between;border-bottom:1px dashed rgba(255,255,255,0.03);padding:2px 0"><span>Coxa:</span> <strong>${compAss[0].coxa || '—'} cm</strong></div>
                <div style="display:flex;justify-content:space-between;border-bottom:1px dashed rgba(255,255,255,0.03);padding:2px 0"><span>Busto:</span> <strong>${compAss[0].busto || '—'} cm</strong></div>
              </div>
              <div>
                <div style="display:flex;justify-content:space-between;border-bottom:1px dashed rgba(255,255,255,0.03);padding:2px 0"><span>Braço:</span> <strong>${compAss[0].braco || '—'} cm</strong></div>
                <div style="display:flex;justify-content:space-between;border-bottom:1px dashed rgba(255,255,255,0.03);padding:2px 0"><span>Panturrilha:</span> <strong>${compAss[0].panturrilha || '—'} cm</strong></div>
                <div style="display:flex;justify-content:space-between;border-bottom:1px dashed rgba(255,255,255,0.03);padding:2px 0"><span>D. Abdominal:</span> <strong>${compAss[0].dobraAbdominal || '—'} mm</strong></div>
                <div style="display:flex;justify-content:space-between;border-bottom:1px dashed rgba(255,255,255,0.03);padding:2px 0"><span>D. Coxa:</span> <strong>${compAss[0].dobraCoxa || '—'} mm</strong></div>
              </div>
            </div>
          </div>

          <!-- History table -->
          ${compAss.length >= 2 ? `
            <div style="margin-top:16px">
              <div style="font-weight:800;margin-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:4px;color:var(--portal-text)">Evolução Histórica</div>
              <div style="overflow-x:auto">
                <table style="width:100%;font-size:0.75rem;border-collapse:collapse;text-align:left">
                  <thead>
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.1);color:var(--portal-text-muted)">
                      <th style="padding:6px 4px">Data</th>
                      <th style="padding:6px 4px">Peso</th>
                      <th style="padding:6px 4px">% Gordura</th>
                      <th style="padding:6px 4px">M. Magra</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${compAss.map(a => `
                      <tr style="border-bottom:1px solid rgba(255,255,255,0.04)">
                        <td style="padding:6px 4px;color:var(--portal-text-muted)">${safeFormatDate(a.date)}</td>
                        <td style="padding:6px 4px;font-weight:600">${a.peso || '—'} kg</td>
                        <td style="padding:6px 4px;color:var(--portal-warning);font-weight:600">${a.percentualGordura || '—'}%</td>
                        <td style="padding:6px 4px;color:var(--portal-success);font-weight:600">${a.massaMagra || '—'} kg</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          ` : ''}
        `}
      </div>

      <!-- FORÇA E 1RM -->
      <div class="glass-card" style="margin-bottom:16px">
        <div class="portal-card-label" style="display:flex;align-items:center;gap:6px;font-size:0.95rem;font-weight:800">
           Força (Carga Máxima Estimada - 1RM)
        </div>
        ${forcaAss.length === 0 ? `
          <p class="portal-text-muted" style="text-align:center;padding:20px 0;font-size:0.8rem">Nenhum teste de força (1RM) registrado.</p>
        ` : `
          <div style="overflow-x:auto;margin-top:10px">
            <table style="width:100%;font-size:0.75rem;border-collapse:collapse;text-align:left">
              <thead>
                <tr style="border-bottom:1px solid rgba(255,255,255,0.1);color:var(--portal-text-muted)">
                  <th style="padding:6px 4px">Exercício</th>
                  <th style="padding:6px 4px">1RM Est.</th>
                  <th style="padding:6px 4px">Teste Realizado</th>
                  <th style="padding:6px 4px">Data</th>
                </tr>
              </thead>
              <tbody>
                ${forcaAss.map(a => `
                  <tr style="border-bottom:1px solid rgba(255,255,255,0.04)">
                    <td style="padding:8px 4px;font-weight:700;color:var(--portal-primary)">${a.exercise || '—'}</td>
                    <td style="padding:8px 4px"><strong>${a.rm1 || '—'} kg</strong></td>
                    <td style="padding:8px 4px;color:var(--portal-text-muted)">${a.load || '—'}kg × ${a.reps || '—'} reps</td>
                    <td style="padding:8px 4px;color:var(--portal-text-muted)">${safeFormatDate(a.date)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

      <!-- CONCONI E CARDIO -->
      <div class="glass-card" style="margin-bottom:16px">
        <div class="portal-card-label" style="display:flex;align-items:center;gap:6px;font-size:0.95rem;font-weight:800">
           Capacidade Aeróbia (Conconi / Cardio)
        </div>
        ${conconiAss.length === 0 ? `
          <p class="portal-text-muted" style="text-align:center;padding:20px 0;font-size:0.8rem">Nenhuma avaliação cardiorrespiratória registrada.</p>
        ` : `
          <div style="overflow-x:auto;margin-top:10px">
            <table style="width:100%;font-size:0.75rem;border-collapse:collapse;text-align:left">
              <thead>
                <tr style="border-bottom:1px solid rgba(255,255,255,0.1);color:var(--portal-text-muted)">
                  <th style="padding:6px 4px">Modalidade</th>
                  <th style="padding:6px 4px">VMA</th>
                  <th style="padding:6px 4px">VO2 Máx</th>
                  <th style="padding:6px 4px">FC Máx</th>
                  <th style="padding:6px 4px">Data</th>
                </tr>
              </thead>
              <tbody>
                ${conconiAss.map(a => `
                  <tr style="border-bottom:1px solid rgba(255,255,255,0.04)">
                    <td style="padding:8px 4px;font-weight:700;color:var(--portal-warning)">${a.exercise || 'Cardio'}</td>
                    <td style="padding:8px 4px"><strong>${a.vma || '—'} km/h</strong></td>
                    <td style="padding:8px 4px"><strong>${a.vo2Max || '—'} ml/kg</strong></td>
                    <td style="padding:8px 4px;color:var(--portal-text-muted)">${a.hrMax || '—'} bpm</td>
                    <td style="padding:8px 4px;color:var(--portal-text-muted)">${safeFormatDate(a.date)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    </div>
  `;
  return html;
}

// -- RELATORIOS -------------------------------------------------
async function renderRelatorios(student, sessions, assessments, biofeedbacks, macrocycles = []) {
  const selectedMacroId = portalState.selectedReportMacroId || 'all';
  let completed = sessions.filter(s => s.status === 'completed').sort((a,b) => new Date(a.date)-new Date(b.date));
  const compAss = assessments.filter(a => a.type === 'composicao').sort((a,b) => new Date(a.date)-new Date(b.date));
  let bf = [...biofeedbacks].sort((a,b) => new Date(a.date)-new Date(b.date));

  if (selectedMacroId !== 'all') {
    const macro = macrocycles.find(m => m.id === selectedMacroId);
    if (macro) {
      completed = completed.filter(s => s.macrocycleId === macro.id || (s.date >= macro.startDate && s.date <= macro.endDate));
      bf = bf.filter(b => b.date >= macro.startDate && b.date <= macro.endDate);
    }
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sessionsMonth = completed.filter(s => new Date(s.date) >= startOfMonth).length;
  const recent10 = bf.slice(-10);
  const avgPse   = recent10.length ? (recent10.reduce((t,b)=>t+(b.pse||0),0)/recent10.length).toFixed(1) : '--';
  const avgSleep = recent10.length ? (recent10.reduce((t,b)=>t+(b.sleep||0),0)/recent10.length).toFixed(1) : '--';

  const totalVol = completed.reduce((t,s)=>t+(s.setLog||[]).reduce((tt,x)=>tt+(parseFloat(x.load)||0)*(parseFloat(x.reps)||0),0),0);
  const avgVolPerSess = completed.length ? Math.round(totalVol/completed.length) : 0;
  const avgDurMin = completed.length ? Math.round(completed.reduce((t,s)=>t+(s.durationMin||0),0)/completed.length) : 0;

  const lastComp = compAss[compAss.length-1];
  const age = student?.birthDate ? Calc.calcularIdade(student.birthDate) : (student?.age||0);
  const objMap = {'Emagrecimento':'emagrecimento','Perda de peso':'emagrecimento','Hipertrofia':'hipertrofia','Ganho de massa':'hipertrofia','Manutencao':'manutencao','Saude':'manutencao'};
  const obj = objMap[student?.goal] || 'manutencao';
  const tmbRes = lastComp?.peso && age ? Calc.tmb(lastComp.peso, lastComp.altura, age, student?.gender||'M', lastComp.massaMagra) : null;
  const sessPerWeek = completed.length>1 ? completed.length/Math.max(1,Math.ceil((new Date(completed[completed.length-1].date)-new Date(completed[0].date))/(7*86400000))) : 3;
  const nivelAtiv = sessPerWeek>=5?'ativo':sessPerWeek>=3?'moderado':sessPerWeek>=1?'leve':'sedentario';
  const tdeeRes = tmbRes ? Calc.tdee(tmbRes.valor, nivelAtiv) : null;
  const metaRes = tdeeRes ? Calc.metaCalorica(tdeeRes.valor, obj) : null;
  const macrosRes = metaRes && lastComp?.peso ? Calc.macros(metaRes.kcal, lastComp.peso, obj) : null;

  // Exercise load progression — full table (same as trainer reports)
  const exMap = {};
  completed.forEach(s => {
    (s.setLog||[]).forEach(x => {
      if (!x.exerciseName || !x.load || x.load<=0) return;
      if (!exMap[x.exerciseName]) exMap[x.exerciseName] = [];
      exMap[x.exerciseName].push({
        date: s.date,
        load: parseFloat(x.load)||0,
        reps: parseFloat(x.reps)||0,
        vol:  (parseFloat(x.load)||0) * (parseFloat(x.reps)||1),
      });
    });
  });
  const topEx = Object.entries(exMap).filter(([,sets])=>sets.length>=2)
    .map(([name,sets])=>{
      const sorted=sets.sort((a,b)=>new Date(a.date)-new Date(b.date));
      const first=sorted[0], last=sorted[sorted.length-1];
      const maxLoad=Math.max(...sorted.map(s=>s.load));
      const delta=last.load-first.load;
      const pct=first.load>0?Math.round((delta/first.load)*100):0;
      const totalVol=sorted.reduce((t,s)=>t+s.vol,0);
      return {name,first,last,maxLoad,delta,pct,totalVol,series:sorted.length,sets:sorted};
    }).sort((a,b)=>Math.abs(b.pct)-Math.abs(a.pct)).slice(0,8);

  // Caloric card
  let caloricHtml = '';
  if (tmbRes && tdeeRes && metaRes) {
    caloricHtml = `<div class="glass-card portal-caloric-card" style="margin-bottom:12px">
      <div class="portal-card-label">Gasto Energetico Estimado &middot; ${tmbRes.formula}</div>
      <div class="portal-caloric-grid">
        <div class="portal-caloric-item"><div class="portal-caloric-val">${tmbRes.valor}</div><div class="portal-caloric-lbl">TMB kcal</div></div>
        <div class="portal-caloric-item" style="color:var(--portal-primary)"><div class="portal-caloric-val">${tdeeRes.valor}</div><div class="portal-caloric-lbl">TDEE kcal</div></div>
        <div class="portal-caloric-item" style="color:var(--portal-accent)"><div class="portal-caloric-val">${metaRes.kcal}</div><div class="portal-caloric-lbl">Meta kcal</div></div>
      </div>
      ${macrosRes?`<div class="portal-macros-row" style="margin-top:8px">
        <div style="color:#10b981">Proteina: <b>${macrosRes.proteina.g}g</b></div>
        <div style="color:#f59e0b">Carb: <b>${macrosRes.carboidrato.g}g</b></div>
        <div style="color:#8b5cf6">Gordura: <b>${macrosRes.gordura.g}g</b></div>
      </div>`:''}
    </div>`;
  }

  // Motivational feed
  const pseNum = parseFloat(avgPse)||0;
  const sleepNum = parseFloat(avgSleep)||0;
  let feedTxt = '';
  if (pseNum>8) feedTxt='Seus treinos estao muito intensos! Vamos ajustar o ritmo para garantir boa recuperacao.';
  else if (pseNum>6) feedTxt='Voce esta treinando na intensidade ideal! Continue assim.';
  else feedTxt='Boa consistencia! Temos margem para evoluir a intensidade gradualmente.';
  if (sleepNum>0 && sleepNum<6) feedTxt+=' O sono esta abaixo do ideal.';
  else if (sleepNum>=7) feedTxt+=' Otima qualidade de sono!';
  if (completed.length>0) feedTxt+=` ${completed.length} sessoes concluidas. Incrivel!`;

  // Exercise progression — full table card
  const exHtml = topEx.length>0 ? `<div class="glass-card" style="margin-bottom:12px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
      <div class="portal-card-label" style="margin:0"> Progressão de Carga</div>
      <span style="font-size:0.68rem;color:var(--portal-text-muted)">${topEx.length} exercícios</span>
    </div>
    <p style="font-size:0.68rem;color:var(--portal-text-muted);margin:4px 0 10px">Verde = progresso · Vermelho = regressão</p>
    <div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:0.72rem">
      <thead>
        <tr style="border-bottom:1px solid rgba(255,255,255,0.1)">
          <th style="text-align:left;padding:4px 4px 6px;color:var(--portal-text-muted);font-weight:600">Exercício</th>
          <th style="text-align:center;padding:4px;color:var(--portal-text-muted);font-weight:600">1ª</th>
          <th style="text-align:center;padding:4px;color:var(--portal-text-muted);font-weight:600">Atual</th>
          <th style="text-align:center;padding:4px;color:var(--portal-text-muted);font-weight:600">Máx</th>
          <th style="text-align:center;padding:4px;color:var(--portal-text-muted);font-weight:600">Δ</th>
          <th style="text-align:center;padding:4px;color:var(--portal-text-muted);font-weight:600">%</th>
          <th style="text-align:center;padding:4px;color:var(--portal-text-muted);font-weight:600">Vol</th>
          <th style="text-align:center;padding:4px;color:var(--portal-text-muted);font-weight:600">S</th>
        </tr>
      </thead>
      <tbody>
        ${topEx.map(ex=>{
          const col=ex.delta>0?'#10b981':ex.delta<0?'#ef4444':'#94a3b8';
          const arrow=ex.delta>0?'↑':ex.delta<0?'↓':'=';
          const barW=Math.min(100,Math.abs(ex.pct));
          return `<tr style="border-bottom:1px solid rgba(255,255,255,0.05)">
            <td style="padding:5px 4px;font-weight:700;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ex.name}</td>
            <td style="text-align:center;padding:5px 4px;color:var(--portal-text-muted)">${ex.first.load}kg</td>
            <td style="text-align:center;padding:5px 4px;font-weight:600">${ex.last.load}kg</td>
            <td style="text-align:center;padding:5px 4px;color:#f59e0b;font-weight:600">${ex.maxLoad}kg</td>
            <td style="text-align:center;padding:5px 4px;color:${col};font-weight:700">${ex.delta>0?'+':''}${ex.delta.toFixed(1)}</td>
            <td style="text-align:center;padding:5px 4px;min-width:60px">
              <div style="display:flex;align-items:center;gap:3px;justify-content:center">
                <div style="width:28px;height:5px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden">
                  <div style="height:100%;width:${barW}%;background:${col};border-radius:3px"></div>
                </div>
                <span style="color:${col};font-weight:700">${arrow}${Math.abs(ex.pct)}%</span>
              </div>
            </td>
            <td style="text-align:center;padding:5px 4px;color:var(--portal-text-secondary)">${(ex.totalVol/1000).toFixed(1)}t</td>
            <td style="text-align:center;padding:5px 4px;color:var(--portal-text-muted)">${ex.series}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    </div>
    <div style="height:180px;position:relative;margin-top:12px"><canvas id="portalLoadProgressChart"></canvas></div>
  </div>` : '';

  // Group workouts by base name for comparative chart
  const getBaseWorkoutName = name => {
    if (!name) return 'Treino Avulso';
    return name
      .replace(/\s*[\-—–]\s*Semana\s*\d+/i, '')
      .replace(/\s*[\-—–]\s*Sem\s*\d+/i, '')
      .replace(/\s*Semana\s*\d+/i, '')
      .replace(/\s*Sem\s*\d+/i, '')
      .replace(/\s*[\-—–]\s*$/g, '')
      .trim();
  };

  const workoutsByName = {};
  completed.forEach(s => {
    if (!s.workoutName) return;
    const base = getBaseWorkoutName(s.workoutName);
    if (!workoutsByName[base]) workoutsByName[base] = [];
    workoutsByName[base].push(s);
  });
  const comparableBases = Object.keys(workoutsByName).filter(base => base !== 'Treino Avulso' && workoutsByName[base].length >= 2);

  let compareSessionsHtml = '';
  if (comparableBases.length > 0) {
    compareSessionsHtml = `
      <div class="glass-card" style="margin-bottom:12px">
        <div class="portal-card-label"> Comparativo de Sessões Idênticas</div>
        <p style="font-size:0.72rem;color:var(--portal-text-muted);margin:4px 0 8px">Compare a evolução de Volume total e PSE para o mesmo treino ao longo das semanas.</p>
        <select id="portalCompareWorkoutSel" class="portal-textarea" style="margin-bottom:12px;padding:8px">
          ${comparableBases.map((base, idx) => `<option value="${base}" ${idx===0?'selected':''}>${base}</option>`).join('')}
        </select>
        <div style="height:200px;position:relative"><canvas id="portalCompareChart"></canvas></div>
      </div>
    `;
  }

  // Extract all unique exercises performed by the student
  const allExercises = new Set();
  completed.forEach(s => {
    (s.setLog || []).forEach(x => {
      if (x.exerciseName) allExercises.add(x.exerciseName);
    });
  });
  const uniqueExercises = Array.from(allExercises).sort();

  let exerciseProgressionChartHtml = '';
  if (uniqueExercises.length > 0) {
    exerciseProgressionChartHtml = `
      <div class="glass-card" style="margin-bottom:12px">
        <div class="portal-card-label">📊 Análise Multivariada por Exercício</div>
        <p style="font-size:0.72rem;color:var(--portal-text-muted);margin:4px 0 8px">
          Compare a evolução da Carga (eixo esquerdo) vs PSE e RIR (eixo direito) ao longo do tempo.
        </p>
        <select id="portalExerciseAnalysisSel" class="portal-textarea" style="margin-bottom:12px;padding:8px;font-size:0.85rem">
          ${uniqueExercises.map((ex, idx) => `<option value="${ex}" ${idx===0?'selected':''}>${ex}</option>`).join('')}
        </select>
        <div style="height:220px;position:relative"><canvas id="portalExerciseAnalysisChart"></canvas></div>
      </div>
    `;
  }

  return `<div class="portal-section" id="portalRelatoriosSection">
    <h2 class="portal-section-title">Relatorios</h2>

    <div class="glass-card" style="margin-bottom:12px;padding:12px">
      <div class="portal-card-label" style="margin-bottom:6px">Filtro de Macrociclo</div>
      <select id="portalReportMacroFilter" class="portal-textarea" style="padding:8px;font-size:0.85rem">
        <option value="all" ${selectedMacroId==='all'?'selected':''}>Todos os macrociclos</option>
        ${macrocycles.map(m => `<option value="${m.id}" ${selectedMacroId===m.id?'selected':''}>${m.name}</option>`).join('')}
      </select>
    </div>

    <div class="portal-stats-row" style="grid-template-columns:repeat(2,1fr)">
      <div class="portal-stat-card glass-card"><div class="portal-stat-val" style="color:var(--portal-primary)">${completed.length}</div><div class="portal-stat-lbl">Sessoes</div></div>
      <div class="portal-stat-card glass-card"><div class="portal-stat-val" style="color:var(--portal-accent)">${avgPse}</div><div class="portal-stat-lbl">PSE Medio</div></div>
    </div>
    <div class="portal-stats-row" style="grid-template-columns:repeat(2,1fr)">
      <div class="portal-stat-card glass-card"><div class="portal-stat-val" style="color:#10b981;font-size:1.1rem">${(totalVol/1000).toFixed(1)}t</div><div class="portal-stat-lbl">Volume Total</div></div>
      <div class="portal-stat-card glass-card"><div class="portal-stat-val" style="color:#f59e0b;font-size:1.1rem">${avgDurMin}min</div><div class="portal-stat-lbl">Duracao Media</div></div>
    </div>
    <div class="portal-stats-row" style="grid-template-columns:repeat(2,1fr)">
      <div class="portal-stat-card glass-card"><div class="portal-stat-val" style="color:#6366f1;font-size:1.1rem">${avgVolPerSess.toLocaleString('pt-BR')}kg</div><div class="portal-stat-lbl">Vol/Sessao</div></div>
      <div class="portal-stat-card glass-card"><div class="portal-stat-val" style="color:#06b6d4;font-size:1.1rem">${sessionsMonth}</div><div class="portal-stat-lbl">Treinos/mes</div></div>
    </div>

    ${caloricHtml}

    ${exHtml}

    <!-- Evolução IA -->
    <div class="glass-card" style="border:1px solid rgba(139, 92, 246, 0.4); position: relative; overflow: hidden; margin-bottom:12px">
      <div style="position: absolute; top: -20px; right: -20px; font-size: 8rem; opacity: 0.05; user-select: none;">✨</div>
      <div class="portal-card-label" style="color:var(--accent)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
        Sua Evolução Analítica (Últimas 4 semanas)
      </div>
      <div id="aiInsightResultPortal" style="display:none; margin-top:12px; padding-top:12px; border-top:1px dashed var(--border-color); position:relative; z-index:2">
        <p style="font-size:0.85rem; line-height:1.5; color:var(--portal-text);" id="aiInsightTextPortal"></p>
      </div>
      <button id="btnGenerateAIPortal" class="portal-reminder-btn" style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); border:none; width:100%; color:#fff; display:flex; align-items:center; justify-content:center; gap:8px; padding:10px; border-radius:8px; font-weight:700; position:relative; z-index:2; margin-top: 12px;">
        <span>Analisar Gráficos com IA ✨</span>
      </button>
    </div>

    <div class="glass-card portal-feed-card" style="margin-bottom:12px">
      <div class="portal-card-label">Resumo do seu Desempenho</div>
      <p style="font-size:0.82rem;line-height:1.7;color:var(--portal-text-secondary);margin-top:8px">${feedTxt}</p>
    </div>

    <div class="glass-card" style="margin-bottom:12px">
      <div class="portal-card-label">Evolucao do Bem-estar</div>
      <p style="font-size:0.72rem;color:var(--portal-text-muted);margin:4px 0 8px">Sono (roxo) &middot; TQR (verde) &middot; Estresse (amarelo) &middot; Dor (verm.) &middot; Motiv. (azul) &middot; Alim. (laranja)</p>
      <div style="height:200px;position:relative"><canvas id="portalWellnessChart"></canvas></div>
    </div>

    <div class="glass-card" style="margin-bottom:12px">
      <div class="portal-card-label">PSE por Sessao</div>
      <p style="font-size:0.72rem;color:var(--portal-text-muted);margin:4px 0 8px">Zona ideal: 6-8. Acima de 8 por 3+ sessoes = atencao a fadiga.</p>
      <div style="height:180px;position:relative"><canvas id="portalPseChart"></canvas></div>
    </div>

    <div class="glass-card" style="margin-bottom:12px">
      <div class="portal-card-label">Volume por Sessao (kg)</div>
      <div style="height:180px;position:relative"><canvas id="portalVolChart"></canvas></div>
    </div>

    <div class="glass-card" style="margin-bottom:12px">
      <div class="portal-card-label">Carga de Treino Semanal (PSE x min)</div>
      <p style="font-size:0.72rem;color:var(--portal-text-muted);margin:4px 0 8px">Aumentos graduais de ~10%/semana sao ideais.</p>
      <div style="height:180px;position:relative"><canvas id="portalLoadChart"></canvas></div>
    </div>

    <div class="glass-card" style="margin-bottom:12px">
      <div class="portal-card-label">Gasto Calorico nas Sessoes (kcal)</div>
      <p style="font-size:0.72rem;color:var(--portal-text-muted);margin:4px 0 8px">Estimativa com MET de musculacao x peso x duracao.</p>
      <div style="height:180px;position:relative"><canvas id="portalKcalChart"></canvas></div>
    </div>

    <div class="glass-card" style="margin-bottom:12px">
      <div class="portal-card-label">Densidade de Treino (kg/min)</div>
      <p style="font-size:0.72rem;color:var(--portal-text-muted);margin:4px 0 8px">Volume levantado por minuto de treino.</p>
      <div style="height:180px;position:relative"><canvas id="portalDensityChart"></canvas></div>
    </div>

    <div class="glass-card" style="margin-bottom:12px">
      <div class="portal-card-label">Frequencia Semanal (ultimas 8 semanas)</div>
      <div style="height:160px;position:relative"><canvas id="portalFreqChart"></canvas></div>
    </div>

    <div class="glass-card" style="margin-bottom:12px">
      <div class="portal-card-label">Radar de Wellness</div>
      <p style="font-size:0.72rem;color:var(--portal-text-muted);margin:4px 0 8px">Media dos ultimos 5 check-ins. Quanto maior, melhor.</p>
      <div style="height:220px;position:relative"><canvas id="portalRadarChart"></canvas></div>
    </div>

    ${compareSessionsHtml}

    ${exerciseProgressionChartHtml}

    ${compAss.length>=2?`<div class="glass-card" style="margin-bottom:12px">
      <div class="portal-card-label">Evolucao da Composicao Corporal</div>
      <div style="height:200px;position:relative"><canvas id="portalMeasuresChart"></canvas></div>
    </div>`:''}

    ${completed.length===0?`<div class="portal-empty">Realize sessoes de treino para ver os graficos de evolucao.</div>`:''}
  </div>`;
}

// -- INIT RELATORIOS (Chart.js) --------------------------------
function initRelatorios(student, sessions, assessments, biofeedbacks, macrocycles = []) {
  const selectedMacroId = portalState.selectedReportMacroId || 'all';
  let completed = sessions.filter(s => s.status === 'completed').sort((a,b) => new Date(a.date)-new Date(b.date));
  const compAss = assessments.filter(a => a.type === 'composicao').sort((a,b) => new Date(a.date)-new Date(b.date));
  let bf = [...biofeedbacks].sort((a,b) => new Date(a.date)-new Date(b.date));

  if (selectedMacroId !== 'all') {
    const macro = macrocycles.find(m => m.id === selectedMacroId);
    if (macro) {
      completed = completed.filter(s => s.macrocycleId === macro.id || (s.date >= macro.startDate && s.date <= macro.endDate));
      bf = bf.filter(b => b.date >= macro.startDate && b.date <= macro.endDate);
    }
  }

  // Calculate topEx for portalLoadProgressChart in this macrocycle filter
  const exMap = {};
  completed.forEach(s => {
    (s.setLog||[]).forEach(x => {
      if (!x.exerciseName || !x.load || x.load<=0) return;
      if (!exMap[x.exerciseName]) exMap[x.exerciseName] = [];
      exMap[x.exerciseName].push({
        date: s.date,
        load: parseFloat(x.load)||0,
        reps: parseFloat(x.reps)||0,
        vol:  (parseFloat(x.load)||0) * (parseFloat(x.reps)||1),
      });
    });
  });
  const topEx = Object.entries(exMap).filter(([,sets])=>sets.length>=2)
    .map(([name,sets])=>{
      const sorted=sets.sort((a,b)=>new Date(a.date)-new Date(b.date));
      const first=sorted[0], last=sorted[sorted.length-1];
      const maxLoad=Math.max(...sorted.map(s=>s.load));
      const delta=last.load-first.load;
      const pct=first.load>0?Math.round((delta/first.load)*100):0;
      const totalVol=sorted.reduce((t,s)=>t+s.vol,0);
      return {name,first,last,maxLoad,delta,pct,totalVol,series:sorted.length,sets:sorted};
    }).sort((a,b)=>Math.abs(b.pct)-Math.abs(a.pct)).slice(0,8);

  const btnAI = document.getElementById('btnGenerateAIPortal');
  const txtAI = document.getElementById('aiInsightTextPortal');
  const resAI = document.getElementById('aiInsightResultPortal');
  
  if (btnAI && txtAI && resAI) {
    btnAI.addEventListener('click', async () => {
      btnAI.disabled = true;
      btnAI.innerHTML = '<div class="portal-spin-ring" style="width:16px;height:16px;border-width:2px;border-top-color:#fff;margin-right:8px"></div> <span>Analisando gráficos...</span>';
      resAI.style.display = 'block';
      txtAI.innerHTML = 'A IA está processando suas tendências dos últimos 28 dias...';
      
      try {
        const sortedSes = [...sessions].filter(s => s.status === 'completed').sort((a,b) => new Date(a.date) - new Date(b.date));
        const aiText = await generateAIInsight(student, sortedSes, biofeedbacks, 28);
        txtAI.innerHTML = `<strong>Insight Analítico ✨:</strong><br/><br/>`;
        const textNode = document.createElement('div');
        textNode.style.whiteSpace = 'pre-wrap';
        textNode.style.wordBreak = 'break-word';
        textNode.textContent = aiText;
        txtAI.appendChild(textNode);
        btnAI.style.display = 'none';
      } catch(err) {
        txtAI.innerHTML = `<span style="color:var(--portal-danger)">Erro: ${err.message}</span>`;
        btnAI.innerHTML = '<span>Tentar novamente</span>';
        btnAI.disabled = false;
      }
    });
  }

  const fmtDate = d => {
    if (!d) return '';
    try {
      const dStr = typeof d === 'string' ? d : new Date(d).toISOString();
      return new Date(dStr.includes('T') ? dStr : dStr + 'T12:00').toLocaleDateString('pt-BR', {day:'2-digit',month:'2-digit'});
    } catch {
      try {
        return new Date(d).toLocaleDateString('pt-BR', {day:'2-digit',month:'2-digit'});
      } catch {
        return String(d || '');
      }
    }
  };

  const co = {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{ labels:{ color:'#94a3b8', font:{size:10} } } },
    scales:{
      x:{ ticks:{color:'#64748b',font:{size:9},maxRotation:45}, grid:{color:'rgba(255,255,255,0.04)'} },
      y:{ ticks:{color:'#94a3b8',font:{size:9}}, grid:{color:'rgba(255,255,255,0.04)'} }
    }
  };

  // Group workouts by base name for comparative chart
  const getBaseWorkoutName = name => {
    if (!name) return 'Treino Avulso';
    return name
      .replace(/\s*[\-—–]\s*Semana\s*\d+/i, '')
      .replace(/\s*[\-—–]\s*Sem\s*\d+/i, '')
      .replace(/\s*Semana\s*\d+/i, '')
      .replace(/\s*Sem\s*\d+/i, '')
      .replace(/\s*[\-—–]\s*$/g, '')
      .trim();
  };

  const workoutsByName = {};
  completed.forEach(s => {
    if (!s.workoutName) return;
    const base = getBaseWorkoutName(s.workoutName);
    if (!workoutsByName[base]) workoutsByName[base] = [];
    workoutsByName[base].push(s);
  });
  const comparableBases = Object.keys(workoutsByName).filter(base => workoutsByName[base].length >= 2);

  // Destroy all existing charts before redrawing (prevents 'Canvas already in use')
  ['portalWellnessChart','portalPseChart','portalVolChart','portalLoadChart','portalKcalChart',
   'portalDensityChart','portalFreqChart','portalRadarChart','portalCompareChart',
   'portalExerciseAnalysisChart','portalMeasuresChart','portalLoadProgressChart'].forEach(destroyPortalChart);

  const drawAll = () => {
    // Wellness
    const wCtx = document.getElementById('portalWellnessChart');
    if (wCtx && bf.length>=2) {
      createPortalChart('portalWellnessChart', wCtx, { type:'line', data:{ labels:bf.map(b=>fmtDate(b.date)), datasets:[
        {label:'Sono', data:bf.map(b=>b.sleep||null), borderColor:'#8b5cf6', backgroundColor:'rgba(139,92,246,0.08)', tension:0.3, fill:true, pointRadius:3},
        {label:'TQR',  data:bf.map(b=>b.tqr||null),   borderColor:'#10b981', backgroundColor:'rgba(16,185,129,0.08)',  tension:0.3, fill:true, pointRadius:3},
        {label:'Estresse', data:bf.map(b=>b.stress||null), borderColor:'#f59e0b', borderDash:[5,3], tension:0.3, fill:false, pointRadius:3},
        {label:'Dor', data:bf.map(b=>b.pain||null), borderColor:'#ef4444', borderDash:[2,2], tension:0.3, fill:false, pointRadius:3},
        {label:'Motivação', data:bf.map(b=>b.motivation||null), borderColor:'#3b82f6', tension:0.3, fill:false, pointRadius:3},
        {label:'Alimentação', data:bf.map(b=>b.food||null), borderColor:'#f97316', tension:0.3, fill:false, pointRadius:3},
      ]}, options:{...co, scales:{...co.scales, y:{...co.scales.y,min:0,max:10}}} });
    }

    // PSE per session
    const pseCtx = document.getElementById('portalPseChart');
    if (pseCtx && completed.length>=1) {
      createPortalChart('portalPseChart', pseCtx, { type:'line', data:{ labels:completed.map(s=>fmtDate(s.date)), datasets:[
        {label:'PSE', data:completed.map(s=>s.postBiofeedback?.pse||null), borderColor:'#ef4444', backgroundColor:'rgba(239,68,68,0.15)', fill:true, tension:0.3, pointRadius:4, pointBackgroundColor:'#ef4444'}
      ]}, options:{...co, plugins:{legend:{display:false}}, scales:{...co.scales, y:{...co.scales.y,min:0,max:10}}} });
    }

    // Volume
    const volCtx = document.getElementById('portalVolChart');
    if (volCtx && completed.length>=1) {
      const recent=completed.slice(-12);
      createPortalChart('portalVolChart', volCtx, { type:'bar', data:{ labels:recent.map(s=>fmtDate(s.date)), datasets:[
        {label:'Volume (kg)', data:recent.map(s=>Math.round((s.setLog||[]).reduce((t,x)=>t+(parseFloat(x.load)||0)*(parseFloat(x.reps)||0),0))),
          backgroundColor:'rgba(99,102,241,0.6)', borderColor:'#6366f1', borderWidth:1, borderRadius:4}
      ]}, options:{...co, plugins:{legend:{display:false}}} });
    }

    // Weekly load (PSE × min)
    const loadCtx = document.getElementById('portalLoadChart');
    if (loadCtx && completed.length>=1) {
      const wc={};
      completed.forEach(s=>{
        const dateStr = typeof s.date === 'string' ? s.date : '';
        if (!dateStr) return;
        const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T12:00');
        const mon=new Date(d); mon.setDate(d.getDate()-d.getDay()+1);
        const key=mon.toISOString().split('T')[0];
        const pse = (s.postBiofeedback?.pse || 5);
        const dur = (s.durationMin || 0);
        wc[key]=(wc[key]||0)+pse*dur;
      });
      const wKeys=Object.keys(wc).sort().slice(-8);
      createPortalChart('portalLoadChart', loadCtx, { type:'bar', data:{ labels:wKeys.map(k=>fmtDate(k)), datasets:[
        {label:'Carga', data:wKeys.map(k=>wc[k]||0), backgroundColor:'rgba(16,185,129,0.5)', borderColor:'#10b981', borderWidth:1, borderRadius:4}
      ]}, options:{...co, plugins:{legend:{display:false}}} });
    }

    // Kcal
    const peso = compAss[compAss.length-1]?.peso || student?.weight || 70;
    const kcalCtx = document.getElementById('portalKcalChart');
    if (kcalCtx && completed.length>=1) {
      const recent=completed.slice(-12);
      createPortalChart('portalKcalChart', kcalCtx, { type:'bar', data:{ labels:recent.map(s=>fmtDate(s.date)), datasets:[
        {label:'Kcal', data:recent.map(s=>s.durationMin?Math.round(Calc.caloriasAtividade(peso,s.durationMin,'musculacao')):null),
          backgroundColor:'rgba(249,115,22,0.6)', borderColor:'#f97316', borderWidth:1, borderRadius:4}
      ]}, options:{...co, plugins:{legend:{display:false}}} });
    }

    // Density (kg/min)
    const denCtx = document.getElementById('portalDensityChart');
    if (denCtx && completed.length>=1) {
      const recent=completed.slice(-12);
      createPortalChart('portalDensityChart', denCtx, { type:'line', data:{ labels:recent.map(s=>fmtDate(s.date)), datasets:[
        {label:'kg/min', data:recent.map(s=>{
          const vol=(s.setLog||[]).reduce((t,x)=>t+(parseFloat(x.load)||0)*(parseFloat(x.reps)||0),0);
          return s.durationMin>0?parseFloat((vol/s.durationMin).toFixed(1)):null;
        }), borderColor:'#06b6d4', backgroundColor:'rgba(6,182,212,0.1)', fill:true, tension:0.3, pointRadius:3}
      ]}, options:{...co, plugins:{legend:{display:false}}} });
    }

    // Weekly frequency
    const freqCtx = document.getElementById('portalFreqChart');
    if (freqCtx && completed.length>=1) {
      const fc={};
      completed.forEach(s=>{
        const dateStr = typeof s.date === 'string' ? s.date : '';
        if (!dateStr) return;
        const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T12:00');
        const mon=new Date(d); mon.setDate(d.getDate()-d.getDay()+1);
        const key=mon.toISOString().split('T')[0];
        fc[key]=(fc[key]||0)+1;
      });
      const fKeys=Object.keys(fc).sort().slice(-8);
      createPortalChart('portalFreqChart', freqCtx, { type:'bar', data:{ labels:fKeys.map(k=>fmtDate(k)), datasets:[
        {label:'Sessoes', data:fKeys.map(k=>fc[k]), backgroundColor:'rgba(6,182,212,0.5)', borderColor:'#06b6d4', borderWidth:1, borderRadius:4}
      ]}, options:{...co, plugins:{legend:{display:false}}, scales:{...co.scales, y:{...co.scales.y,min:0,ticks:{stepSize:1,color:'#94a3b8',font:{size:9}}}}} });
    }

    // Radar de Wellness
    const radCtx = document.getElementById('portalRadarChart');
    if (radCtx && bf.length>=1) {
      const r5=bf.slice(-5);
      const avg=arr=>arr.length?parseFloat((arr.reduce((t,v)=>t+v,0)/arr.length).toFixed(1)):0;
      createPortalChart('portalRadarChart', radCtx, { type:'radar', data:{ labels:['Sono','TQR','Motivacao','Alimentacao','Anti-Estresse'],
        datasets:[{ label:'Wellness', data:[
          avg(r5.map(b=>b.sleep||0)), avg(r5.map(b=>b.tqr||0)),
          avg(r5.map(b=>b.motivation||0)), avg(r5.map(b=>(b.food||0)*2)),
          avg(r5.map(b=>10-(b.stress||5))),
        ], backgroundColor:'rgba(16,185,129,0.15)', borderColor:'#10b981', pointBackgroundColor:'#10b981' }]
      }, options:{ responsive:true, maintainAspectRatio:false,
        scales:{r:{min:0,max:10,ticks:{stepSize:2,color:'#64748b',font:{size:9},backdropColor:'transparent'},grid:{color:'rgba(255,255,255,0.08)'},angleLines:{color:'rgba(255,255,255,0.08)'},pointLabels:{color:'#94a3b8',font:{size:10}}}},
        plugins:{legend:{display:false}}
      }});
    }

    // Load Progression Chart (top 3 exercises)
    const lpCtx = document.getElementById('portalLoadProgressChart');
    if (lpCtx && topEx.length >= 1) {
      const colors = ['#10b981','#06b6d4','#f59e0b'];
      const top3 = topEx.slice(0, 3);
      const allDates = [...new Set(top3.flatMap(ex => ex.sets.map(s => s.date)))].sort();
      const fmtD = d => {
        try {
          const dStr = typeof d === 'string' ? d : new Date(d).toISOString();
          return new Date(dStr.includes('T') ? dStr : dStr + 'T12:00').toLocaleDateString('pt-BR', {day:'2-digit',month:'2-digit'});
        } catch {
          return d || '';
        }
      };
      createPortalChart('portalLoadProgressChart', lpCtx, {
        type: 'line',
        data: {
          labels: allDates.map(fmtD),
          datasets: top3.map((ex, i) => ({
            label: ex.name,
            data: allDates.map(d => {
              const pts = ex.sets.filter(s => s.date === d);
              return pts.length ? Math.max(...pts.map(s => s.load)) : null;
            }),
            borderColor: colors[i], backgroundColor: colors[i]+'20',
            tension: 0.3, pointRadius: 4, borderWidth: 2, fill: false, spanGaps: true,
          }))
        },
        options: { ...co,
          scales: {
            x: { ticks:{color:'#94a3b8',font:{size:9}}, grid:{display:false} },
            y: { ticks:{color:'#64748b',font:{size:9}, callback: v=>v+'kg'}, grid:{color:'rgba(255,255,255,0.04)'} }
          },
          plugins: { legend:{ labels:{color:'#94a3b8',font:{size:10},boxWidth:12} } }
        }
      });
    }

    // Identical Sessions comparison
    const compSel = document.getElementById('portalCompareWorkoutSel');
    const compCtx = document.getElementById('portalCompareChart');

    const drawCompareChart = () => {
      if (!compCtx || !compSel) return;
      const base = compSel.value;
      const sessList = (workoutsByName[base] || []).sort((a,b) => new Date(a.date) - new Date(b.date));
      
      const labels = sessList.map(s => {
        const dStr = fmtDate(s.date);
        const wkMatch = s.workoutName?.match(/Sem\s*(\d+)/i);
        return wkMatch ? `Sem ${wkMatch[1]} (${dStr})` : dStr;
      });

      createPortalChart('portalCompareChart', compCtx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Volume Total (kg)',
              data: sessList.map(s => (s.setLog||[]).reduce((t,x)=>t+(parseFloat(x.load)||0)*(parseFloat(x.reps)||0),0)),
              borderColor: '#6366f1',
              backgroundColor: 'rgba(99,102,241,0.05)',
              tension: 0.3,
              yAxisID: 'y',
              fill: true,
              pointRadius: 4
            },
            {
              label: 'PSE (Borg)',
              data: sessList.map(s => s.postBiofeedback?.pse || null),
              borderColor: '#ef4444',
              tension: 0.3,
              yAxisID: 'y1',
              borderDash: [5, 3],
              pointRadius: 4
            }
          ]
        },
        options: {
          ...co,
          scales: {
            x: co.scales.x,
            y: {
              position: 'left',
              title: { display: true, text: 'Volume (kg)', color: '#94a3b8', font: {size: 9} },
              ticks: { color: '#6366f1', font: {size: 9} },
              grid: { color: 'rgba(255,255,255,0.04)' }
            },
            y1: {
              position: 'right',
              title: { display: true, text: 'PSE', color: '#94a3b8', font: {size: 9} },
              ticks: { color: '#ef4444', font: {size: 9}, min: 0, max: 10 },
              grid: { display: false }
            }
          }
        }
      });
    };
    // Multivariable Exercise Analysis Chart elements
    const exAnalysisSel = document.getElementById('portalExerciseAnalysisSel');
    const exAnalysisCtx = document.getElementById('portalExerciseAnalysisChart');

    const updateExerciseAnalysisSelector = () => {
      if (!exAnalysisSel || !compSel) return;
      const base = compSel.value;
      const sessList = workoutsByName[base] || [];

      // Find exercises that were performed in this workout
      const exSet = new Set();
      sessList.forEach(s => {
        (s.setLog || []).forEach(x => {
          if (x.exerciseName) exSet.add(x.exerciseName);
        });
      });
      const filteredEx = Array.from(exSet).sort();
      const currentSel = exAnalysisSel.value;

      if (filteredEx.length > 0) {
        exAnalysisSel.innerHTML = filteredEx.map(ex => `<option value="${ex}" ${ex === currentSel ? 'selected' : ''}>${ex}</option>`).join('');
        if (!filteredEx.includes(currentSel)) {
          exAnalysisSel.selectedIndex = 0;
        }
        exAnalysisSel.disabled = false;
        if (exAnalysisSel.parentElement) exAnalysisSel.parentElement.style.opacity = '1';
      } else {
        exAnalysisSel.innerHTML = '<option value="">Sem exercícios registrados</option>';
        exAnalysisSel.disabled = true;
        if (exAnalysisSel.parentElement) exAnalysisSel.parentElement.style.opacity = '0.6';
      }
    };

    const drawExAnalysisChart = () => {
      if (!exAnalysisCtx || !exAnalysisSel) return;
      const exerciseName = exAnalysisSel.value;
      const baseWorkout = compSel?.value || '';

      if (!exerciseName) {
        destroyPortalChart('portalExerciseAnalysisChart');
        return;
      }

      // Group sets of this exercise chronologically
      const history = [];
      completed.forEach(s => {
        // Only include if session belongs to the selected base workout!
        if (baseWorkout) {
          const sBase = getBaseWorkoutName(s.workoutName);
          if (sBase !== baseWorkout) return;
        }

        const matchingSets = (s.setLog || []).filter(x => x.exerciseName === exerciseName);
        if (matchingSets.length > 0) {
          const avgLoad = matchingSets.reduce((t, x) => t + (parseFloat(x.load) || 0), 0) / matchingSets.length;
          const sessionPse = s.postBiofeedback?.pse;
          const setPses = matchingSets.filter(x => x.pse != null).map(x => parseFloat(x.pse));
          const avgPse = setPses.length > 0 ? (setPses.reduce((t, v) => t + v, 0) / setPses.length) : (sessionPse || null);
          const rirs = matchingSets.filter(x => x.rir != null && x.rir !== '').map(x => parseFloat(x.rir));
          const avgRir = rirs.length > 0 ? (rirs.reduce((t, v) => t + v, 0) / rirs.length) : null;
          history.push({ date: s.date, load: avgLoad, pse: avgPse, rir: avgRir });
        }
      });

      history.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      if (history.length === 0) {
        destroyPortalChart('portalExerciseAnalysisChart');
        return;
      }

      const labels = history.map(h => fmtDate(h.date));

      createPortalChart('portalExerciseAnalysisChart', exAnalysisCtx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Carga Média (kg)',
              data: history.map(h => h.load),
              borderColor: '#6366f1',
              backgroundColor: 'rgba(99,102,241,0.05)',
              tension: 0.3,
              yAxisID: 'y',
              fill: true,
              pointRadius: 4,
              borderWidth: 2
            },
            {
              label: 'PSE Média',
              data: history.map(h => h.pse),
              borderColor: '#ef4444',
              tension: 0.3,
              yAxisID: 'y1',
              borderDash: [5, 3],
              pointRadius: 4,
              borderWidth: 1.5
            },
            {
              label: 'RIR Média',
              data: history.map(h => h.rir),
              borderColor: '#10b981',
              tension: 0.3,
              yAxisID: 'y1',
              pointRadius: 4,
              borderWidth: 1.5
            }
          ]
        },
        options: {
          ...co,
          scales: {
            x: co.scales.x,
            y: {
              position: 'left',
              title: { display: true, text: 'Carga (kg)', color: '#94a3b8', font: {size: 9} },
              ticks: { color: '#6366f1', font: {size: 9} },
              grid: { color: 'rgba(255,255,255,0.04)' }
            },
            y1: {
              position: 'right',
              title: { display: true, text: 'PSE / RIR', color: '#94a3b8', font: {size: 9} },
              ticks: { color: '#94a3b8', font: {size: 9}, min: 0, max: 10 },
              grid: { display: false }
            }
          }
        }
      });
    };

    const onWorkoutChange = () => {
      drawCompareChart();
      updateExerciseAnalysisSelector();
      drawExAnalysisChart();
    };

    if (compSel) {
      compSel.removeEventListener('change', onWorkoutChange);
      compSel.addEventListener('change', onWorkoutChange);
    }

    if (exAnalysisSel) {
      exAnalysisSel.removeEventListener('change', drawExAnalysisChart);
      exAnalysisSel.addEventListener('change', drawExAnalysisChart);
    }

    // Initial draw
    drawCompareChart();
    updateExerciseAnalysisSelector();
    drawExAnalysisChart();

    // Body composition
    const measCtx = document.getElementById('portalMeasuresChart');
    if (measCtx && compAss.length >= 2) {
      const ds = [];
      if (compAss.some(a => a.peso))
        ds.push({ label: 'Peso (kg)', data: compAss.map(a => a.peso || null), borderColor: '#10b981', fill: false, tension: 0.3, yAxisID: 'y', pointRadius: 3 });
      if (compAss.some(a => a.percentualGordura)) {
        ds.push({ label: '% Gordura', data: compAss.map(a => a.percentualGordura || null), borderColor: '#f59e0b', fill: false, tension: 0.3, yAxisID: 'y1', borderDash: [5,3], pointRadius: 3 });
        ds.push({ label: '% Massa Magra', data: compAss.map(a => a.percentualGordura ? parseFloat((100 - a.percentualGordura).toFixed(1)) : null), borderColor: '#06b6d4', fill: false, tension: 0.3, yAxisID: 'y1', borderDash: [2,2], pointRadius: 3 });
      }
      if (ds.length) createPortalChart('portalMeasuresChart', measCtx, {
        type: 'line',
        data: { labels: compAss.map(a => fmtDate(a.date)), datasets: ds },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#94a3b8', font: { size: 10 } } } },
          scales: {
            y:  { position: 'left',  title: { display: true, text: 'kg', color: '#10b981', font: { size: 9 } }, ticks: { color: '#10b981', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
            y1: { position: 'right', title: { display: true, text: '%', color: '#94a3b8', font: { size: 9 } }, ticks: { color: '#94a3b8', font: { size: 9 }, callback: v => v + '%' }, grid: { display: false }, min: 0, max: 100 },
            x:  { ticks: { color: '#64748b', font: { size: 9 } }, grid: { display: false } }
          }
        }
      });
    }
  };

  // Bind change on macro filter to reload section
  document.getElementById('portalReportMacroFilter')?.addEventListener('change', async (e) => {
    portalState.selectedReportMacroId = e.target.value;
    await loadSection('relatorios');
  });

  if (window.Chart) {
    drawAll();
  } else {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    s.onload = drawAll;
    document.head.appendChild(s);
  }
}

// ── PRE-DEFINED RATING OPTIONS FOR CHECK-IN AND CHECKOUT ──────
const SONO_OPTIONS = [
  { value: '2', display: '1', label: '1 - Péssimo', desc: 'Insônia / Noite em claro', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  { value: '4', display: '2', label: '2 - Ruim', desc: 'Acordei várias vezes / Agitado', color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
  { value: '6', display: '3', label: '3 - Regular', desc: 'Dormi o suficiente, mas acordei cansado', color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
  { value: '8', display: '4', label: '4 - Bom', desc: 'Sono contínuo e revigorante', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { value: '10', display: '5', label: '5 - Excelente', desc: 'Sono profundo e muito reparador', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' }
];

const TQR_OPTIONS = [
  { value: '0', label: '0 - Não recuperado', desc: 'Sensação de fadiga extrema nas articulações/músculos', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  { value: '1', label: '1 - Muito mal recuperado', desc: 'Músculos extremamente doloridos', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  { value: '2', label: '2 - Mal recuperado', desc: 'Dores musculares e indisposição física', color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
  { value: '3', label: '3 - Pouco recuperado', desc: 'Cansaço muscular residual perceptível', color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
  { value: '4', label: '4 - Abaixo da média', desc: 'Ainda me sinto um pouco pesado', color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
  { value: '5', label: '5 - Recuperação parcial', desc: 'Pronto para treinar, mas sem carga máxima', color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
  { value: '6', label: '6 - Razoavelmente recuperado', desc: 'Bom estado de prontidão física', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { value: '7', label: '7 - Bem recuperado', desc: 'Sensação de corpo leve e sem dores', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { value: '8', label: '8 - Muito bem recuperado', desc: 'Energia alta e músculos totalmente prontos', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { value: '9', label: '9 - Excelente recuperação', desc: 'Disposição física e mental no topo', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  { value: '10', label: '10 - Totalmente recuperado', desc: 'Estado físico ideal, sem nenhuma fadiga', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' }
];

const ALIMENTACAO_OPTIONS = [
  { value: '5', label: '5 - Excelente', desc: 'Bati todas as metas nutricionais e hidratação', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { value: '4', label: '4 - Boa', desc: 'Alimentação majoritariamente saudável / poucos furos', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { value: '3', label: '3 - Regular', desc: 'Alimentação na média / algumas escapadas ou furos', color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
  { value: '2', label: '2 - Ruim', desc: 'Pulei refeições ou comi alimentos pouco nutritivos', color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
  { value: '1', label: '1 - Péssima', desc: 'Fast food excessivo ou quase sem comer nada', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' }
];

const ESTRESSE_OPTIONS = [
  { value: '1', label: '1 - Sem Estresse', desc: 'Mente totalmente calma, relaxamento profundo', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { value: '2', label: '2 - Muito Relaxado', desc: 'Mente tranquila, sem estresse perceptível', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { value: '3', label: '3 - Relaxado', desc: 'Pequenas preocupações normais, mas bem tranquilo', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { value: '4', label: '4 - Tranquilo', desc: 'Pouco estresse na rotina diária', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { value: '5', label: '5 - Sob Controle', desc: 'Estresse mínimo, rotina equilibrada', color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
  { value: '6', label: '6 - Moderado', desc: 'Estresse sob controle, mas mente ativa e cansada', color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
  { value: '7', label: '7 - Um Pouco Estressado', desc: 'Cansaço acumulando, momentos de desgaste', color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
  { value: '8', label: '8 - Estressado', desc: 'Rotina de trabalho/estudos pesada e desgastante', color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
  { value: '9', label: '9 - Muito Estressado', desc: 'Alto estresse, cansaço constante e mente cheia', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  { value: '10', label: '10 - Extremamente Estressado', desc: 'Mente no limite, exaustão mental e ansiedade', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' }
];

const DOR_OPTIONS = [
  { value: '1', display: '1', label: '1 - Nenhuma Dor', desc: 'Músculos e articulações 100% livres de dores', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { value: '3', display: '2', label: '2 - Leve', desc: 'Desconforto muscular leve residual pós-treino', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { value: '5', display: '3', label: '3 - Moderada', desc: 'Dor suportável, mas incomoda em movimentos', color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
  { value: '7', display: '4', label: '4 - Forte', desc: 'Dificulta a execução de movimentos específicos', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  { value: '10', display: '5', label: '5 - Intensa / Risco de lesão', desc: 'Dor severa, risco de lesão ou incapacidade física', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' }
];

const DOR_OPTIONS_0 = [
  { value: '0', display: '0', label: '0 - Sem Dor', desc: 'Articulações e tendões 100% confortáveis', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  ...DOR_OPTIONS
];

const MOTIVACAO_OPTIONS = [
  { value: '2', display: '1', label: '1 - Muito Baixa', desc: 'Sem nenhuma vontade de treinar hoje', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  { value: '4', display: '2', label: '2 - Baixa', desc: 'Desanimado, vou treinar por pura obrigação', color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
  { value: '6', display: '3', label: '3 - Moderada', desc: 'Foco mediano, treino mantido por disciplina', color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
  { value: '8', display: '4', label: '4 - Alta', desc: 'Focado, animado e com boa energia mental', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { value: '10', display: '5', label: '5 - Muito Alta', desc: 'Energia máxima, sedento por treinar pesado', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' }
];

function renderInlineCardSelector(name, options, currentValue, onSelectJS) {
  return `
    <input type="hidden" name="${name}" id="portal_${name}" value="${currentValue}" />
    <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 6px; max-height: 200px; overflow-y: auto; padding-right: 4px;" id="inline_scale_${name}">
      ${options.map(opt => {
        const isActive = String(currentValue) === String(opt.value);
        return `
          <div class="portal-sel-option-row ${isActive ? 'active' : ''}" 
               style="--opt-color: ${opt.color}; --opt-bg: ${opt.bg};"
               data-val="${opt.value}"
               onclick="
                 document.getElementById('portal_${name}').value = '${opt.value}';
                 document.querySelectorAll('#inline_scale_${name} .portal-sel-option-row').forEach(el => el.classList.remove('active'));
                 this.classList.add('active');
                 ${onSelectJS ? `${onSelectJS}('${opt.value}');` : ''}
               ">
            <div class="portal-sel-badge-num" style="background: ${opt.bg}; color: ${opt.color}; border: 1px solid ${opt.color}33;">
              ${opt.display || opt.value}
            </div>
            <div style="flex: 1; min-width: 0; text-align: left;">
              <div style="font-size: 0.85rem; font-weight: 700; color: var(--portal-text);">${opt.label}</div>
              <div style="font-size: 0.72rem; color: var(--portal-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;">
                ${opt.desc}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ── CUSTOM SELECTION SYSTEM FOR PSE & RIR ─────────────────────
const PSE_OPTIONS = [
  { value: '1', label: '1 - Extremamente Leve', desc: 'Esforço mínimo, respiração totalmente normal', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { value: '2', label: '2 - Muito Leve', desc: 'Fácil de manter, conversa fluida sem pausas', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { value: '3', label: '3 - Leve', desc: 'Esforço confortável, início de aquecimento corporal', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { value: '4', label: '4 - Moderado', desc: 'Respiração acelerada mas controlada', color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
  { value: '5', label: '5 - Um Pouco Forte', desc: 'Esforço nítido, começa a exigir foco mental', color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
  { value: '6', label: '6 - Forte', desc: 'Frequência cardíaca elevada, fala em frases curtas', color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  { value: '7', label: '7 - Muito Forte', desc: 'Esforço pesado, exige foco total na execução', color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  { value: '8', label: '8 - Muito Forte +', desc: 'Sensação de queimação muscular intensa', color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  { value: '9', label: '9 - Quase Máximo', desc: 'Extrema dificuldade, limite antes da falha', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  { value: '10', label: '10 - Máximo (Falha)', desc: 'Esforço total, impossível realizar mais uma repetição', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' }
];

const RIR_OPTIONS = [
  { value: '0', label: '0 RIR (Falha Muscular)', desc: 'Nenhuma repetição extra possível com técnica perfeita', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  { value: '1', label: '1 RIR', desc: 'Conseguiria fazer apenas mais 1 repetição máxima', color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  { value: '2', label: '2 RIR', desc: 'Conseguiria fazer mais 2 repetições máximas', color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  { value: '3', label: '3 RIR', desc: 'Velocidade da barra reduzida, mas com controle', color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
  { value: '4', label: '4 RIR', desc: 'Esforço moderado, velocidade de barra preservada', color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
  { value: '5', label: '5 RIR', desc: 'Reserva confortável, aquecimento pesado ou técnico', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { value: '6', label: '6 RIR', desc: 'Carga leve, foco em velocidade/técnica', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { value: '7', label: '7 RIR', desc: 'Carga muito leve', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { value: '8', label: '8 RIR', desc: 'Esforço insignificante', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { value: '9', label: '9 RIR', desc: 'Praticamente sem carga', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { value: '10', label: '10+ RIR', desc: 'Esforço irrelevante, carga de recuperação', color: '#10b981', bg: 'rgba(16,185,129,0.1)' }
];

function openCustomSelector(title, options, currentValue, onSelect) {
  document.getElementById('portalCustomSelector')?.remove();

  const container = document.querySelector('.portal-root') || document.body;

  const overlay = document.createElement('div');
  overlay.id = 'portalCustomSelector';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 10000;
    display: flex; flex-direction: column; justify-content: flex-end;
    background: rgba(0,0,0,0.6); backdrop-filter: blur(8px);
    animation: portalFadeIn 0.2s ease-out;
  `;

  overlay.innerHTML = `
    <style>
      @keyframes portalSlideUp {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
      }
      @keyframes portalFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      #portalCustomSheet {
        animation: portalSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        background: var(--portal-surface, #1e293b);
        border-radius: 24px 24px 0 0;
        box-shadow: 0 -10px 40px rgba(0,0,0,0.5);
        padding: 16px 16px env(safe-area-inset-bottom, 24px);
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        width: 100%;
        box-sizing: border-box;
      }
      .portal-sel-option-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border-radius: 12px;
        background: rgba(255,255,255,0.02);
        border: 1px solid rgba(255,255,255,0.05);
        cursor: pointer;
        transition: all 0.2s ease;
        margin-bottom: 8px;
        text-align: left;
        width: 100%;
        color: var(--portal-text, #f1f5f9);
        box-sizing: border-box;
      }
      .portal-root[data-theme="light"] .portal-sel-option-row {
        background: rgba(0,0,0,0.02);
        border-color: rgba(0,0,0,0.05);
      }
      .portal-sel-option-row:hover {
        background: rgba(255,255,255,0.06);
        transform: translateY(-1px);
      }
      .portal-root[data-theme="light"] .portal-sel-option-row:hover {
        background: rgba(0,0,0,0.04);
      }
      .portal-sel-option-row.active {
        border-color: var(--portal-primary, #6366f1);
        background: rgba(99,102,241,0.08);
      }
      .portal-sel-badge-num {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 1.1rem;
        flex-shrink: 0;
      }
    </style>
    <div id="portalCustomSheet">
      <div style="display: flex; justify-content: center; margin-bottom: 12px;">
        <div style="width: 36px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.15);"></div>
      </div>
      
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
        <span style="font-size: 1.1rem; font-weight: 800; color: var(--portal-text, #f1f5f9);">${title}</span>
        <button id="closePortalSelBtn" style="background: rgba(255,255,255,0.08); border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--portal-text, #fff);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div style="overflow-y: auto; flex: 1; padding-right: 4px;">
        ${options.map(opt => {
          const isActive = String(currentValue) === String(opt.value);
          return `
            <div class="portal-sel-option-row ${isActive ? 'active' : ''}" data-val="${opt.value}">
              <div class="portal-sel-badge-num" style="background: ${opt.bg}; color: ${opt.color}; border: 1px solid ${opt.color}33">
                ${opt.value}
              </div>
              <div style="flex: 1; min-width: 0;">
                <div style="font-size: 0.88rem; font-weight: 700; color: var(--portal-text);">${opt.label}</div>
                <div style="font-size: 0.75rem; color: var(--portal-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;">
                  ${opt.desc}
                </div>
              </div>
              ${isActive ? `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--portal-primary)" stroke-width="3" style="flex-shrink: 0;">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  container.appendChild(overlay);

  const closeSheet = () => {
    overlay.style.animation = 'portalFadeIn 0.2s ease-in reverse';
    const sheet = document.getElementById('portalCustomSheet');
    if (sheet) sheet.style.animation = 'portalSlideUp 0.2s cubic-bezier(0.3, 0, 1, 1) reverse';
    setTimeout(() => overlay.remove(), 180);
  };

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeSheet();
  });
  document.getElementById('closePortalSelBtn')?.addEventListener('click', closeSheet);

  overlay.querySelectorAll('.portal-sel-option-row').forEach(row => {
    row.addEventListener('click', () => {
      const val = row.dataset.val;
      onSelect(val);
      closeSheet();
    });
  });
}

function updatePseButton(btn, val) {
  if (!btn) return;
  if (!val) {
    btn.textContent = 'PSE';
    btn.style.background = 'var(--portal-surface, #1e293b)';
    btn.style.color = 'var(--portal-text-muted, #94a3b8)';
    btn.style.borderColor = 'var(--portal-border, #334155)';
    return;
  }
  
  btn.textContent = val + ' PSE';
  const numericVal = parseInt(val);
  let bg, color;
  
  if (numericVal >= 9) {
    bg = 'rgba(239,68,68,0.15)'; color = '#ef4444';
  } else if (numericVal >= 6) {
    bg = 'rgba(251,146,60,0.15)'; color = '#fb923c';
  } else if (numericVal >= 4) {
    bg = 'rgba(245,158,11,0.15)'; color = '#f59e0b';
  } else {
    bg = 'rgba(16,185,129,0.15)'; color = '#10b981';
  }
  
  btn.style.background = bg;
  btn.style.color = color;
  btn.style.borderColor = color;
}

function updateRirButton(btn, val) {
  if (!btn) return;
  if (val === '' || val == null) {
    btn.textContent = 'RIR';
    btn.style.background = 'var(--portal-surface, #1e293b)';
    btn.style.color = 'var(--portal-text-muted, #94a3b8)';
    btn.style.borderColor = 'var(--portal-border, #334155)';
    return;
  }
  
  btn.textContent = val + ' RIR';
  const numericVal = parseInt(val);
  let bg, color;
  
  if (numericVal === 0) {
    bg = 'rgba(239,68,68,0.15)'; color = '#ef4444';
  } else if (numericVal <= 2) {
    bg = 'rgba(251,146,60,0.15)'; color = '#fb923c';
  } else if (numericVal <= 4) {
    bg = 'rgba(245,158,11,0.15)'; color = '#f59e0b';
  } else {
    bg = 'rgba(16,185,129,0.15)'; color = '#10b981';
  }
  
  btn.style.background = bg;
  btn.style.color = color;
  btn.style.borderColor = color;
}

// ── PORTAL INTEGRATED PREMIUM CHECKOUT MODAL ──────────────────
window.showPortalCheckoutById = async function(id) {
  try {
    const session = await db.get('sessions', id);
    if (!session) {
      console.error('Sessão não encontrada para checkout: ' + id);
      return;
    }
    showPortalCheckoutModal(session);
  } catch (e) {
    console.error('Erro ao buscar sessão no db:', e);
  }
};

function showPortalCheckoutModal(session) {
  document.getElementById('portalCheckoutModal')?.remove();

  const container = document.querySelector('.portal-root') || document.body;

  const overlay = document.createElement('div');
  overlay.id = 'portalCheckoutModal';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 10000;
    display: flex; flex-direction: column; justify-content: flex-end;
    background: rgba(0,0,0,0.6); backdrop-filter: blur(8px);
    animation: portalFadeIn 0.2s ease-out;
  `;

  const PAIN_CHIPS = [
    { id: 'joelho_e', label: 'Joelho Esq.' },
    { id: 'joelho_d', label: 'Joelho Dir.' },
    { id: 'ombro_e', label: 'Ombro Esq.' },
    { id: 'ombro_d', label: 'Ombro Dir.' },
    { id: 'lombar', label: 'Coluna Lombar' },
    { id: 'cervical', label: 'Coluna Cervical' },
    { id: 'quadril', label: 'Quadril' },
    { id: 'tornozelo', label: 'Tornozelo/Pé' },
    { id: 'cotovelo', label: 'Cotovelo/Punho' }
  ];

  const currentPse = session.postBiofeedback?.pse || 5;
  const currentFeeling = session.postBiofeedback?.feeling || 3;
  const currentPain = session.postBiofeedback?.pain || 0;
  const currentNotes = session.postBiofeedback?.notes || '';
  const currentPainRegions = session.postBiofeedback?.painRegions || [];

  overlay.innerHTML = `
    <style>
      @keyframes portalSlideUp {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
      }
      @keyframes portalFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      #portalCheckoutSheet {
        animation: portalSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        background: var(--portal-surface, #1e293b);
        border-radius: 24px 24px 0 0;
        box-shadow: 0 -10px 40px rgba(0,0,0,0.5);
        padding: 16px 16px env(safe-area-inset-bottom, 24px);
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        width: 100%;
        max-width: 500px;
        margin: 0 auto;
        box-sizing: border-box;
        border-top: 1px solid rgba(255,255,255,0.08);
      }
      .portal-checkout-label {
        font-size: 0.85rem;
        font-weight: 700;
        color: var(--portal-text, #f1f5f9);
        margin-bottom: 6px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .portal-checkout-field {
        margin-bottom: 16px;
      }
      .portal-checkout-desc {
        font-size: 0.72rem;
        color: var(--portal-text-muted, #94a3b8);
        display: block;
        margin-top: 2px;
      }
      .portal-feeling-row {
        display: flex;
        justify-content: space-between;
        gap: 6px;
        margin-top: 6px;
      }
      .portal-feeling-emoji-btn {
        flex: 1;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 12px;
        padding: 10px 2px;
        font-size: 1.25rem;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        transition: all 0.2s ease;
        color: var(--portal-text-muted, #94a3b8);
      }
      .portal-feeling-emoji-lbl {
        font-size: 0.65rem;
        font-weight: 600;
      }
      .portal-feeling-emoji-btn:hover {
        background: rgba(255,255,255,0.06);
        transform: translateY(-1px);
      }
      .portal-feeling-emoji-btn.active {
        border-color: var(--portal-primary, #6366f1);
        background: rgba(99,102,241,0.12);
        color: var(--portal-primary, #6366f1);
        transform: scale(1.05);
      }
      .portal-pain-chip-chk {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 12px;
        border: 1px solid rgba(255,255,255,0.06);
        background: rgba(255,255,255,0.02);
        border-radius: 20px;
        cursor: pointer;
        font-size: 0.75rem;
        transition: all 0.15s ease;
        color: var(--portal-text-muted, #94a3b8);
      }
      .portal-pain-chip-chk:hover {
        background: rgba(255,255,255,0.05);
      }
      .portal-pain-chip-chk.active {
        background: rgba(239,68,68,0.12);
        border-color: #ef4444;
        color: #fca5a5;
      }
      .portal-checkout-submit {
        background: linear-gradient(135deg, var(--portal-primary, #6366f1), var(--portal-accent, #06b6d4));
        border: none;
        border-radius: 12px;
        color: #ffffff;
        font-weight: 700;
        font-size: 0.95rem;
        padding: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        width: 100%;
        margin-top: 8px;
        box-shadow: 0 4px 15px rgba(99,102,241,0.3);
      }
      .portal-checkout-submit:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(99,102,241,0.4);
      }
    </style>
    <div id="portalCheckoutSheet">
      <div style="display: flex; justify-content: center; margin-bottom: 12px;">
        <div style="width: 36px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.15);"></div>
      </div>

      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
        <div>
          <span style="font-size: 1.1rem; font-weight: 800; color: var(--portal-text, #f1f5f9);">Checkout do Treino</span>
          <div style="font-size: 0.75rem; color: var(--portal-text-muted, #94a3b8); margin-top: 2px;">
            ${session.workoutName || 'Treino'} &middot; ${new Date(session.date).toLocaleDateString('pt-BR')}
          </div>
        </div>
        <button id="closePortalCheckoutBtn" style="background: rgba(255,255,255,0.08); border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--portal-text, #fff);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div style="overflow-y: auto; flex: 1; padding-right: 4px;" id="portalCheckoutForm">
        <!-- 1. PSE INLINE CARDS -->
        <div class="portal-checkout-field">
          <label class="portal-checkout-label">🥵 Intensidade do Esforço Percebido (PSE)</label>
          ${renderInlineCardSelector('pse', PSE_OPTIONS, currentPse)}
        </div>

        <!-- 2. FEELING/SATISFACTION -->
        <div class="portal-checkout-field">
          <label class="portal-checkout-label">😊 Sensação pós-treino (Recuperação/Humor)</label>
          <div class="portal-feeling-row">
            <button class="portal-feeling-emoji-btn ${currentFeeling===1?'active':''}" data-val="1">
              <span>😩</span><span class="portal-feeling-emoji-lbl">Esgotado</span>
            </button>
            <button class="portal-feeling-emoji-btn ${currentFeeling===2?'active':''}" data-val="2">
              <span>🥱</span><span class="portal-feeling-emoji-lbl">Cansado</span>
            </button>
            <button class="portal-feeling-emoji-btn ${currentFeeling===3?'active':''}" data-val="3">
              <span>🙂</span><span class="portal-feeling-emoji-lbl">Ok</span>
            </button>
            <button class="portal-feeling-emoji-btn ${currentFeeling===4?'active':''}" data-val="4">
              <span>😁</span><span class="portal-feeling-emoji-lbl">Bem</span>
            </button>
            <button class="portal-feeling-emoji-btn ${currentFeeling===5?'active':''}" data-val="5">
              <span></span><span class="portal-feeling-emoji-lbl">Excelente</span>
            </button>
          </div>
        </div>

        <!-- 3. NOTES -->
        <div class="portal-checkout-field">
          <label class="portal-checkout-label"> Observações do Treino</label>
          <textarea id="chkModalNotes" class="portal-textarea" rows="2" placeholder="Ex: RIR em agachamento foi menor, me senti muito forte hoje...">${currentNotes}</textarea>
        </div>

        <button id="chkModalSubmitBtn" class="portal-checkout-submit">Salvar Checkout ✅</button>
      </div>
    </div>
  `;

  container.appendChild(overlay);

  // Feeling buttons
  let selectedFeeling = currentFeeling;
  overlay.querySelectorAll('.portal-feeling-emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.portal-feeling-emoji-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedFeeling = parseInt(btn.dataset.val);
    });
  });

  const closeSheet = () => {
    overlay.style.animation = 'portalFadeIn 0.2s ease-in reverse';
    const sheet = document.getElementById('portalCheckoutSheet');
    if (sheet) sheet.style.animation = 'portalSlideUp 0.2s cubic-bezier(0.3, 0, 1, 1) reverse';
    setTimeout(() => overlay.remove(), 180);
  };

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeSheet();
  });
  document.getElementById('closePortalCheckoutBtn').addEventListener('click', closeSheet);

  // Submit Handler
  document.getElementById('chkModalSubmitBtn').addEventListener('click', async () => {
    const pse = parseInt(document.getElementById('portal_pse')?.value) || 5;
    const notes = document.getElementById('chkModalNotes').value || '';

    const postBiofeedback = {
      pse,
      feeling: selectedFeeling,
      satisfaction: selectedFeeling * 2, // Map 1-5 feeling to 2-10 satisfaction
      notes,
      date: Calc.nowISO(),
      submittedAt: Calc.nowISO(),
      submittedByStudent: true
    };

    const submitBtn = document.getElementById('chkModalSubmitBtn');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Salvando...'; }

    let saved = false;
    try {
      session.postBiofeedback = postBiofeedback;

      // Retry up to 3 times
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await db.put('sessions', session);
          saved = true;
          break;
        } catch (err) {
          console.error(`Checkout tentativa ${attempt}:`, err);
          if (attempt < 3) await new Promise(r => setTimeout(r, 600 * attempt));
        }
      }

      if (!saved) {
        // Backup no localStorage
        try { localStorage.setItem(`pp_checkout_backup_${session.id}`, JSON.stringify({ session, postBiofeedback })); } catch(_) {}
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = '! Erro — Tentar novamente';
          submitBtn.style.background = '#ef4444';
        }
        return;
      }

      // Sincronizar com tabela biofeedback
      try {
        const sessDateStr = (session.date || Calc.nowISO()).slice(0, 10);
        const bfId = `bf_${session.studentId}_${sessDateStr}`;
        let preBf = {};
        try { preBf = await db.get('biofeedback', bfId) || {}; } catch(_) {}
        
        const durMin = Math.round((session.totalDuration || 0) / 60) || 45;
        const trainingLoad = Calc.cargaTreino ? Calc.cargaTreino(pse, durMin) : (pse * durMin);
        
        const newBfData = {
          ...preBf,
          id: bfId,
          studentId: session.studentId,
          trainerId: session.trainerId || portalState.trainerId,
          trainer_id: session.trainerId || portalState.trainerId,
          date: session.date || preBf.date || Calc.nowISO(),
          sleep: preBf.sleep || session.preBiofeedback?.sleep || 7,
          tqr: preBf.tqr || preBf.energy || (session.preBiofeedback?.tqr ?? session.preBiofeedback?.energy) || 5,
          energy: preBf.energy || preBf.tqr || (session.preBiofeedback?.tqr ?? session.preBiofeedback?.energy) || 5,
          stress: preBf.stress || session.preBiofeedback?.stress || 5,
          food: preBf.food || session.preBiofeedback?.food || 5,
          motivation: preBf.motivation || session.preBiofeedback?.motivation || 7,
          menstrualCycle: preBf.menstrualCycle || session.preBiofeedback?.menstrualCycle || '',
          pain: preBf.pain || session.preBiofeedback?.pain || 1,
          painRegions: preBf.painRegions || session.preBiofeedback?.painRegions || [],
          painDescription: preBf.painDescription || session.preBiofeedback?.painDescription || '',
          pse, feeling: selectedFeeling, satisfaction: selectedFeeling * 2,
          duration: durMin, trainingLoad,
          notes: notes || preBf.notes || '',
          sessionId: session.id, formType: 'complete',
          submittedAt: Calc.nowISO(), submittedByStudent: true
        };
        await db.put('biofeedback', newBfData);
      } catch (bfErr) {
        console.error('Erro ao sincronizar biofeedback:', bfErr);
        // Não bloquear o fluxo — o checkout da sessão já foi salvo
      }
    } catch (e) {
      console.error('Erro inesperado no checkout:', e);
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '! Erro — Tentar novamente'; submitBtn.style.background = '#ef4444'; }
      return;
    }

    // Show success screen in the sheet
    const sheet = document.getElementById('portalCheckoutSheet');
    sheet.innerHTML = `
      <div class="portal-success" style="padding:40px 20px; text-align:center;">
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="var(--portal-success, #10b981)" stroke-width="2" style="margin:0 auto 16px auto; display:block;">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <div style="font-size:1.2rem; font-weight:800; color:var(--portal-text, #f1f5f9); margin-bottom:8px;">Checkout concluído!</div>
        <p style="font-size:0.85rem; color:var(--portal-text-muted, #94a3b8); margin-bottom:0;">Obrigado por registrar seu esforço pós-treino.</p>
      </div>
    `;

    // Refresh view
    setTimeout(async () => {
      closeSheet();
      await loadSection(portalState.section || 'home');
    }, 1500);
  });
}

function renderStudentTutorial() {
  return `
    <div class="portal-section">
      <h2 class="portal-section-title">Como usar o Portal</h2>
      
      <div class="glass-card" style="margin-bottom:12px">
        <div class="portal-card-label" style="display:flex;align-items:center;gap:8px">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Check-in (Biofeedback)
        </div>
        <p style="font-size:0.85rem;color:var(--portal-text-secondary);line-height:1.6;margin-top:8px">
          Sempre que for treinar, acesse a aba <strong>Check-in</strong> antes de começar. 
          Lá você avalia seu sono, estresse, e se tem alguma dor. 
          Seu treinador verá isso em tempo real e pode adaptar o treino se você não estiver 100%!
        </p>
      </div>

      <div class="glass-card" style="margin-bottom:12px">
        <div class="portal-card-label" style="display:flex;align-items:center;gap:8px">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
          Treinar e Checkout
        </div>
        <p style="font-size:0.85rem;color:var(--portal-text-secondary);line-height:1.6;margin-top:8px">
          Na aba <strong>Treinar</strong>, escolha o treino do dia. Você verá a lista de exercícios.<br><br>
          1. Concluiu uma série? Você pode marcá-la (opcional, ajuda você a se guiar).<br>
          2. Terminou o treino todo? Clique em <strong>Concluir Treino (Checkout)</strong>.<br>
          3. Informe o quão pesado foi (PSE 1-10) para atualizar seus gráficos e o do seu treinador.
        </p>
      </div>

      <div class="glass-card" style="margin-bottom:12px">
        <div class="portal-card-label" style="display:flex;align-items:center;gap:8px">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          Gráficos e Evolução
        </div>
        <p style="font-size:0.85rem;color:var(--portal-text-secondary);line-height:1.6;margin-top:8px">
          A aba <strong>Relatórios</strong> cruza os dados do seu Check-in com os seus Treinos concluídos. 
          Acompanhe sua Evolução do Bem-Estar, Volume de Treino levantado, e a estimativa de Calorias gastas!
        </p>
      </div>

      <div class="glass-card" style="margin-bottom:12px">
        <div class="portal-card-label" style="display:flex;align-items:center;gap:8px">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
          Instalar como Aplicativo (PWA)
        </div>
        <p style="font-size:0.85rem;color:var(--portal-text-secondary);line-height:1.6;margin-top:8px">
          Você não precisa acessar sempre pelo link do WhatsApp. Adicione este portal à tela inicial do seu celular! 
          Basta clicar em <strong>Compartilhar &gt; Adicionar à Tela Inicial</strong> (no Safari/iPhone) ou usar o botão "App" no topo da tela (se disponível no Android).
        </p>
      </div>
    </div>
  `;
}

function initStudentTutorial() {
  // No specific interactivity needed yet
}

// ── EMAIL LOGIN SCREEN ────────────────────────────────────────
function renderEmailLoginScreen() {
  return `
    <div class="portal-root" data-theme="dark">
      <div class="portal-container" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;padding:20px;text-align:center;">
        <div class="portal-brand" style="margin-bottom:30px;font-size:1.8rem;font-weight:800;">
          <span style="color:var(--portal-text)">Personal</span><span style="color:var(--portal-primary)">PRO</span>
        </div>
        <div class="portal-card" style="width:100%;max-width:360px;padding:32px 24px;border-radius:16px;box-shadow: 0 8px 32px 0 rgba(0,0,0,0.37);border: 1px solid rgba(255,255,255,0.08);background: rgba(15,20,32,0.65);backdrop-filter: blur(12px);-webkit-backdrop-filter: blur(12px);">
          <div style="font-size:3rem;margin-bottom:16px;">🔑</div>
          <h2 style="margin-bottom:12px;font-size:1.25rem;font-weight:700;color:var(--portal-text);">Acesso Restrito</h2>
          <p style="color:var(--portal-text-muted);font-size:0.9rem;line-height:1.6;margin-bottom:0;">
            Para acessar o seu portal, por favor utilize o <strong>link de acesso direto</strong> enviado pelo seu treinador no WhatsApp.<br><br>
            O link contém sua chave pessoal e permite acessar seus treinos, histórico e relatórios com segurança.
          </p>
        </div>
      </div>
    </div>
  `;
}

function initEmailLoginScreen() {
  // Bypassed: Student login is direct link only.
}

function getYouTubeEmbedUrl(url) {
  if (!url) return '';
  url = url.trim();
  let videoId = '';
  try {
    if (url.includes('youtu.be/')) {
      const parts = url.split('youtu.be/');
      if (parts[1]) {
        videoId = parts[1].split(/[?#]/)[0];
      }
    } else if (url.includes('/shorts/')) {
      const parts = url.split('/shorts/');
      if (parts[1]) {
        videoId = parts[1].split(/[?#]/)[0];
      }
    } else if (url.includes('watch?v=')) {
      const parts = url.split('watch?v=');
      if (parts[1]) {
        videoId = parts[1].split('&')[0].split(/[?#]/)[0];
      }
    } else if (url.includes('/embed/')) {
      return url;
    } else {
      const match = url.match(/[?&]v=([^&#]+)/);
      if (match) {
        videoId = match[1];
      }
    }
  } catch (e) {
    console.error('Error parsing YouTube URL:', e);
  }
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }
  return url;
}

function getYouTubeThumbnailUrl(url) {
  if (!url) return '';
  url = url.trim();
  let videoId = '';
  try {
    if (url.includes('youtu.be/')) {
      const parts = url.split('youtu.be/');
      if (parts[1]) {
        videoId = parts[1].split(/[?#]/)[0];
      }
    } else if (url.includes('/shorts/')) {
      const parts = url.split('/shorts/');
      if (parts[1]) {
        videoId = parts[1].split(/[?#]/)[0];
      }
    } else if (url.includes('watch?v=')) {
      const parts = url.split('watch?v=');
      if (parts[1]) {
        videoId = parts[1].split('&')[0].split(/[?#]/)[0];
      }
    } else if (url.includes('/embed/')) {
      const parts = url.split('/embed/');
      if (parts[1]) {
        videoId = parts[1].split(/[?#]/)[0];
      }
    } else {
      const match = url.match(/[?&]v=([^&#]+)/);
      if (match) {
        videoId = match[1];
      }
    }
  } catch (e) {
    console.error('Error parsing YouTube URL for thumbnail:', e);
  }
  if (videoId) {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }
  return '';
}
