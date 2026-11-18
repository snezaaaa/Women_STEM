// Tiny synthesized sound effects (Web Audio) – no audio files, no copyrighted music.
let ctx = null;
let muted = false;

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, dur, { type = 'sine', vol = 0.18, slide = 0 } = {}) {
  const a = ac();
  if (!a || muted) return;
  const t0 = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

export const sfx = {
  unlock() { ac(); },
  setMuted(m) { muted = m; },
  isMuted() { return muted; },
  click() { tone(660, 0, 0.08, { type: 'triangle', vol: 0.08 }); },
  open() { tone(520, 0, 0.12, { type: 'triangle', vol: 0.1 }); tone(780, 0.06, 0.14, { type: 'triangle', vol: 0.08 }); },
  wrong() { tone(220, 0, 0.22, { type: 'sine', vol: 0.15, slide: 0.7 }); },
  correct() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.3, { type: 'triangle', vol: 0.14 })); },
  letter() { tone(1320, 0, 0.18, { type: 'sine', vol: 0.1 }); tone(1760, 0.08, 0.25, { type: 'sine', vol: 0.08 }); },
  door() { tone(110, 0, 1.2, { type: 'sawtooth', vol: 0.05, slide: 1.8 }); [392, 523, 659].forEach((f, i) => tone(f, 0.2 + i * 0.12, 0.5, { type: 'triangle', vol: 0.1 })); },
  finale() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.16, 0.6, { type: 'triangle', vol: 0.12 })); },
};
