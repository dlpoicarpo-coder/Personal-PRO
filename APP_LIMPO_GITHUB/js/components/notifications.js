// ========================================
// PERSONAL PRO — Browser Notifications
// ========================================

let permission = 'default';

export async function requestPermission() {
  if (!('Notification' in window)) return false;
  permission = await Notification.requestPermission();
  return permission === 'granted';
}

export function sendNotification(title, options = {}) {
  if (permission !== 'granted') return null;
  try {
    const notif = new Notification(title, {
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%2310b981"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-weight="900" font-size="50" fill="white">P</text></svg>',
      badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%2310b981"/></svg>',
      ...options
    });
    if (options.onClick) notif.onclick = options.onClick;
    if (options.autoClose !== false) {
      setTimeout(() => notif.close(), options.duration || 5000);
    }
    return notif;
  } catch (e) { return null; }
}

// Schedule a notification for a future time
export function scheduleNotification(title, options, triggerTime) {
  const now = Date.now();
  const delay = triggerTime - now;
  if (delay <= 0) return null;
  return setTimeout(() => sendNotification(title, options), delay);
}

// Check and request on first use
export async function initNotifications() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    permission = 'granted';
  } else if (Notification.permission !== 'denied') {
    await requestPermission();
  }
}
