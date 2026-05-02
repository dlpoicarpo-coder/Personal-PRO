// ========================================
// PERSONAL PRO — WhatsApp Integration
// ========================================

/**
 * Generates a wa.me link with pre-filled message
 * @param {string} phone - Phone number (will be cleaned)
 * @param {string} message - Message text
 * @returns {string} WhatsApp URL
 */
export function waLink(phone, message) {
  const clean = phone.replace(/\D/g, '');
  // Add Brazil code if not present
  const num = clean.length <= 11 ? '55' + clean : clean;
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

/**
 * Opens WhatsApp with pre-filled message
 */
export function sendWhatsApp(phone, message) {
  const url = waLink(phone, message);
  window.open(url, '_blank');
}

/**
 * Generate training reminder message
 */
export function reminderMsg(studentName, workoutName, date, time, formLink = '') {
  let msg = `🏋️ *Personal PRO*\n\n`;
  msg += `Olá ${studentName}! 👋\n\n`;
  msg += `📅 Lembrete de treino:\n`;
  msg += `• *${workoutName}*\n`;
  msg += `• ${date} às ${time}\n\n`;
  if (formLink) {
    msg += `📝 Preencha o pré-treino antes da sessão:\n${formLink}\n\n`;
  }
  msg += `Bom treino! 💪`;
  return msg;
}

/**
 * Generate pre-workout form message
 */
export function preFormMsg(studentName, formLink) {
  return `🏋️ *Personal PRO*\n\nOlá ${studentName}! 👋\n\n📝 Por favor preencha o formulário pré-treino (leva 30 segundos):\n${formLink}\n\nIsso nos ajuda a ajustar o treino de hoje. Obrigado! 🙏`;
}

/**
 * Generate post-workout form message
 */
export function postFormMsg(studentName, formLink) {
  return `🏋️ *Personal PRO*\n\nParabéns pelo treino, ${studentName}! 🎉\n\n📝 Por favor avalie como foi o treino (PSE):\n${formLink}\n\nSeus dados ajudam no seu progresso! 📊💪`;
}

/**
 * Generate payment reminder message
 */
export function paymentMsg(studentName, amount, dueDate) {
  return `🏋️ *Personal PRO*\n\nOlá ${studentName}! 👋\n\n💰 Lembrete de pagamento:\n• Valor: R$ ${amount.toFixed(2)}\n• Vencimento: ${dueDate}\n\nQualquer dúvida estou à disposição. 🙏`;
}
