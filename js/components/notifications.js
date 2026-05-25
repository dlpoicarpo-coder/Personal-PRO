// ========================================
// PERSONAL PRO — Browser Notifications
// ========================================

let permission = 'default';

export async function requestPermission() {
  if (!('Notification' in window)) return false;
  try {
    permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (e) {
    console.warn('Erro ao solicitar permissão de notificação:', e);
    return false;
  }
}

export function sendNotification(title, options = {}) {
  try {
    if (!('Notification' in window)) return null;
    const currentPerm = Notification.permission;
    if (currentPerm !== 'granted') return null;
    const notif = new Notification(title, {
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%2310b981"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-weight="900" font-size="50" fill="white">P</text></svg>',
      badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%2310b981"/></svg>',
      ...options
    });
    if (options.onClick) notif.onclick = options.onClick;
    if (options.autoClose !== false) {
      setTimeout(() => {
        try {
          notif.close();
        } catch (err) {}
      }, options.duration || 5000);
    }
    return notif;
  } catch (e) {
    console.warn('Erro ao enviar notificação:', e);
    return null;
  }
}

// Schedule a notification for a future time
export function scheduleNotification(title, options, triggerTime) {
  const now = Date.now();
  const delay = triggerTime - now;
  if (delay <= 0) return null;
  return setTimeout(() => sendNotification(title, options), delay);
}

// Check on first use (avoid automatic annoying prompts on first load)
export async function initNotifications() {
  if (!('Notification' in window)) return;
  try {
    permission = Notification.permission;
  } catch (e) {
    console.warn('Erro ao inicializar notificações:', e);
  }
}
