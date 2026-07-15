const fs = require('fs');
const file = 'js/pages/student-portal.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove all emojis globally
// Matches common emojis including \u2600-\u27BF, \u1F300-\u1F9FF, \u1FA70-\u1FAFF
content = content.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2B50}]/gu, '');
// Fallback manual checks for exact ones user mentioned
content = content.replace(/⏩/g, '');
content = content.replace(/👋/g, '');
content = content.replace(/⏸/g, '');
content = content.replace(/🙏/g, '');

// 2. Remove `workSeconds += 30;`
content = content.replace(/workSeconds\s*\+=\s*30\s*;/g, '');

// 3. Fix updateTimerDisplays to ignore totalElapsed and just use work+rest
const oldUpdateTimers = `function updateTimerDisplays(totalElapsed) {
    const fmt = s => \`\${String(Math.floor(s/60)).padStart(2,'0')}:\${String(s%60).padStart(2,'0')}\`;
    const el = document.getElementById('liveTotal');
    const ew = document.getElementById('liveWork');
    const er = document.getElementById('liveRest');
    if (el) el.textContent = fmt(totalElapsed);
    if (ew) ew.textContent = fmt(workSeconds);
    if (er) er.textContent = fmt(restSeconds);
  }`;
const newUpdateTimers = `function updateTimerDisplays() {
    const fmt = s => \`\${String(Math.floor(s/60)).padStart(2,'0')}:\${String(s%60).padStart(2,'0')}\`;
    const el = document.getElementById('liveTotal');
    const ew = document.getElementById('liveWork');
    const er = document.getElementById('liveRest');
    if (el) el.textContent = fmt(workSeconds + restSeconds);
    if (ew) ew.textContent = fmt(workSeconds);
    if (er) er.textContent = fmt(restSeconds);
  }`;
content = content.replace(oldUpdateTimers, newUpdateTimers);

// Replace calls to updateTimerDisplays(totalElapsed) with updateTimerDisplays()
content = content.replace(/updateTimerDisplays\(totalElapsed\)/g, 'updateTimerDisplays()');


// 4. Implement startSoloTimer and startAutoSave to be single source of truth
// We will inject them right before `function startMainTimer()`
const timerFunctions = `
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
            sendLocalNotification("Descanso Concluido!", "Hora de comecar a proxima serie!");
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

content = content.replace('function startMainTimer() {', timerFunctions + '\n  function startMainTimer() {');

// 5. Replace block 1 (resume logic) around line 2047
const oldBlock1 = `    lastTickTime = Date.now();
    soloTimerInterval = setInterval(() => {
      const now = Date.now();
      const actualElapsed = Math.floor((now - lastTickTime) / 1000);
      lastTickTime = now;

      if (actualElapsed > 1) {
        const tickGap = catchUpTimers(actualElapsed);
        if (tickGap > 0 && soloStartTime) {
          soloStartTime = new Date(soloStartTime.getTime() + tickGap * 1000);
        }
      } else {
        if (isResting) {
          restSeconds++;
        } else {
          workSeconds++;
        }
      }

      const totalElapsed = Math.floor((now - soloStartTime) / 1000);
      updateTimerDisplays(totalElapsed);
    }, 1000);

    autoSaveInterval = setInterval(autoSaveSoloSession, 20000);`;

const newBlock1 = `    startSoloTimer();
    startAutoSave();`;

content = content.replace(oldBlock1, newBlock1);

// 6. Replace block 2 in startMainTimer() (around line 3028)
const oldBlock2 = `    lastTickTime = Date.now();
    soloTimerInterval = setInterval(() => {
      const now = Date.now();
      const actualElapsed = Math.floor((now - lastTickTime) / 1000);
      lastTickTime = now;

      if (actualElapsed > 1) {
        const tickGap = catchUpTimers(actualElapsed);
        if (tickGap > 0 && soloStartTime) {
          soloStartTime = new Date(soloStartTime.getTime() + tickGap * 1000);
        }
      } else {
        if (isResting) {
          restSeconds++;
        } else {
          workSeconds++;
        }
      }

      const totalElapsed = Math.floor((now - soloStartTime) / 1000);
      updateTimerDisplays(totalElapsed);
    }, 1000);`;

const newBlock2 = `    startSoloTimer();`;
content = content.replace(oldBlock2, newBlock2);

// And the autoSaveInterval further down in startMainTimer
const oldAutoSave2 = `autoSaveInterval = setInterval(autoSaveSoloSession, 20000);`;
const newAutoSave2 = `startAutoSave();`;
content = content.replace(oldAutoSave2, newAutoSave2);


// 7. Fix startRestTimer to NOT use setInterval
const oldStartRest = `  function startRestTimer(seconds) {
    if (restTimer) clearInterval(restTimer);
    restTotal = seconds;
    restRemaining = seconds;
    isResting = true;
    updateUI();
    const overlay = document.getElementById('restTimerOverlay');
    if (overlay) overlay.style.display = 'flex';
    
    restTimer = setInterval(() => {
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
        sendLocalNotification("Descanso Concludo! ??", "Hora de comear a prxima srie!");
      }
    }, 1000);
  }`;
// Note: We use a regex to replace startRestTimer safely
content = content.replace(/function startRestTimer\(seconds\) \{[\s\S]*?\}, 1000\);\s*\}/, `function startRestTimer(seconds) {
    if (restTimer) clearInterval(restTimer);
    restTotal = seconds;
    restRemaining = seconds;
    isResting = true;
    updateUI();
    const overlay = document.getElementById('restTimerOverlay');
    if (overlay) overlay.style.display = 'flex';
  }`);


// 8. Fix stopRestTimer to just hide overlay
content = content.replace(/function stopRestTimer\(\) \{[\s\S]*?updateTimerDisplays\(\);\s*\}/, `function stopRestTimer() {
    if (restTimer) clearInterval(restTimer);
    const overlay = document.getElementById('restTimerOverlay');
    if (overlay) overlay.style.display = 'none';
    isResting = false;
    activeRestingRowId = null;
    updateTimerDisplays();
  }`);


// 9. Fix catchUpTimers to NOT add `restSeconds += tickGap` and `workSeconds += tickGap`
// Instead, just return the tickGap for startSoloTimer to use if needed, but since we are doing Single Source of Truth
// we can actually just update the workSeconds/restSeconds inside catchUpTimers and return 0, or let catchUpTimers do the math.
// Actually, catchUpTimers does:
/*
      if (isResting) {
        restSeconds += tickGap;
        restRemaining -= tickGap;
        ...
      } else {
        workSeconds += tickGap;
      }
*/
// This is fine as long as the tick that caught it doesn't ALSO increment.
// In startSoloTimer we have:
/*
      if (actualElapsed > 1) {
        const tickGap = catchUpTimers(actualElapsed);
      } else {
*/
// Since we used `else`, it DOES NOT double count! This is correct.
// We just need to remove the `soloStartTime = new Date(...)` in catchUpTimers if it's there.
// But wait, what if `catchUpTimers` still has emojis? We removed emojis globally.


fs.writeFileSync(file, content, 'utf8');
