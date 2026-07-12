// ========================================
// VETOR â€” WhatsApp Integration
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
  let msg = `ðŸ‹ï¸ *Vetor*\n\n`;
  msg += `OlÃ¡ ${studentName}! ðŸ‘‹\n\n`;
  msg += `ðŸ“… Lembrete de treino:\n`;
  msg += `â€¢ *${workoutName}*\n`;
  msg += `â€¢ ${date} Ã s ${time}\n\n`;
  if (formLink) {
    msg += `ðŸ“ Preencha o prÃ©-treino antes da sessÃ£o:\n${formLink}\n\n`;
  }
  msg += `Bom treino! ðŸ’ª`;
  return msg;
}

/**
 * Generate pre-workout form message
 */
export function preFormMsg(studentName, formLink) {
  return `ðŸ‹ï¸ *Vetor*\n\nOlÃ¡ ${studentName}! ðŸ‘‹\n\nðŸ“ Por favor preencha o formulÃ¡rio prÃ©-treino (leva 30 segundos):\n${formLink}\n\nIsso nos ajuda a ajustar o treino de hoje. Obrigado! ðŸ™`;
}

/**
 * Generate post-workout form message
 */
export function postFormMsg(studentName, formLink) {
  return `ðŸ‹ï¸ *Vetor*\n\nParabÃ©ns pelo treino, ${studentName}! ðŸŽ‰\n\nðŸ“ Por favor avalie como foi o treino (PSE):\n${formLink}\n\nSeus dados ajudam no seu progresso! ðŸ“ŠðŸ’ª`;
}

/**
 * Generate payment reminder message
 */
export function paymentMsg(studentName, amount, dueDate) {
  return `ðŸ‹ï¸ *Vetor*\n\nOlÃ¡ ${studentName}! ðŸ‘‹\n\nðŸ’° Lembrete de pagamento:\nâ€¢ Valor: R$ ${amount.toFixed(2)}\nâ€¢ Vencimento: ${dueDate}\n\nQualquer dÃºvida estou Ã  disposiÃ§Ã£o. ðŸ™`;
}

