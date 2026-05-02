// ========================================
// PERSONAL PRO — Timer & Stopwatch Component
// ========================================

export class Timer {
  constructor(options = {}) {
    this.mode = options.mode || 'stopwatch'; // 'stopwatch' | 'countdown'
    this.duration = options.duration || 60; // seconds for countdown
    this.onTick = options.onTick || null;
    this.onComplete = options.onComplete || null;
    this.onStart = options.onStart || null;
    this.soundEnabled = options.soundEnabled !== false;
    this.elapsed = 0;
    this.remaining = this.duration;
    this.running = false;
    this._interval = null;
    this._audioCtx = null;
  }

  start() {
    if (this.running) return;
    this.running = true;
    if (this.onStart) this.onStart();
    const startTime = Date.now() - (this.elapsed * 1000);

    this._interval = setInterval(() => {
      this.elapsed = Math.floor((Date.now() - startTime) / 1000);

      if (this.mode === 'countdown') {
        this.remaining = Math.max(0, this.duration - this.elapsed);
        if (this.onTick) this.onTick(this.remaining, this.elapsed);

        if (this.remaining <= 0) {
          this.stop();
          if (this.soundEnabled) this._beep();
          if (this.onComplete) this.onComplete();
        } else if (this.remaining <= 3 && this.soundEnabled) {
          this._tick();
        }
      } else {
        if (this.onTick) this.onTick(this.elapsed);
      }
    }, 100);
  }

  stop() {
    this.running = false;
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }

  reset() {
    this.stop();
    this.elapsed = 0;
    this.remaining = this.duration;
  }

  setDuration(seconds) {
    this.duration = seconds;
    this.remaining = seconds;
  }

  getElapsed() { return this.elapsed; }
  getRemaining() { return this.remaining; }

  _getAudioCtx() {
    if (!this._audioCtx) {
      this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this._audioCtx;
  }

  _beep() {
    try {
      const ctx = this._getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
      // Double beep
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 1100;
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.3, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.4);
      }, 300);
    } catch (e) { /* audio not supported */ }
  }

  _tick() {
    try {
      const ctx = this._getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 660;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) { }
  }
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatTimeHMS(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}
