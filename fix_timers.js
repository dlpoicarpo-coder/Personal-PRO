const fs = require('fs');
const file = 'js/pages/student-portal.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove all emojis
content = content.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '');
// Specifically "Descanso Concludo! ??" -> "Descanso Concluído!"
// I will just use the global emoji replace which works for UTF-16 surrogates.
content = content.replace(/⏩/g, '').replace(/👋/g, '').replace(/⏸/g, '').replace(/🙏/g, ''); // Just in case

// 2. Remove workSeconds += 30;
content = content.replace(/workSeconds\s*\+=\s*30\s*;/g, '');

// 3. Extract setIntervals for timer
const startSoloTimerStr = `
  function startSoloTimer() {
    if (soloTimerInterval) clearInterval(soloTimerInterval);
    lastTickTime = Date.now();
    soloTimerInterval = setInterval(() => {
      const now = Date.now();
      const actualElapsed = Math.floor((now - lastTickTime) / 1000);
      lastTickTime = now;

      if (actualElapsed > 1) {
        const tickGap = catchUpTimers(actualElapsed);
      } else {
        if (isResting) {
          restSeconds++;
          restRemaining--;
          updateUI();
          if (restRemaining === 5 || restRemaining === 3 || restRemaining === 1) {
            playBeep(800, 0.06, 1);
          }
          if (restRemaining <= 0) {
            isResting = false;
            document.getElementById('restTimerOverlay').style.display = 'none';
            activeRestingRowId = null;
            playBeep(1000, 0.25, 3);
            sendLocalNotification("Descanso Concluído!", "Hora de começar a próxima série!");
          }
        } else {
          workSeconds++;
        }
      }
      updateTimerDisplays();
    }, 1000);
  }

  function startAutoSave() {
    if (autoSaveInterval) clearInterval(autoSaveInterval);
    autoSaveInterval = setInterval(autoSaveSoloSession, 20000);
  }
`;

// Where to inject them? Before initTreinar ends. Or right after let autoSaveInterval.
// Instead of complex AST, let's just replace the body of the intervals.

// 4. In startRestTimer, remove restTimer completely!
// We'll replace startRestTimer logic
const newStartRestTimer = `
  function startRestTimer(seconds) {
    if (restTimer) clearInterval(restTimer);
    restTotal = seconds;
    restRemaining = seconds;
    isResting = true;
    updateUI();
    const overlay = document.getElementById('restTimerOverlay');
    if (overlay) overlay.style.display = 'flex';
  }
`;

// 5. stopRestTimer
const newStopRestTimer = `
  function stopRestTimer() {
    if (restTimer) clearInterval(restTimer);
    const overlay = document.getElementById('restTimerOverlay');
    if (overlay) overlay.style.display = 'none';
    isResting = false;
    activeRestingRowId = null;
    updateTimerDisplays();
  }
`;

content = content.replace(/function startRestTimer[\s\S]*?function stopRestTimer[\s\S]*?\}\n/m, newStartRestTimer + '\n' + newStopRestTimer + '\n');


fs.writeFileSync(file, content, 'utf8');
