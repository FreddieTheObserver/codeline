"use client";

// Tiny chiptune effects made with the Web Audio API, so there are no sound files to license.
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, length: number, type: OscillatorType = "square", gain = 0.06) {
  const a = audio();
  if (!a) return;
  const osc = a.createOscillator();
  const vol = a.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  vol.gain.setValueAtTime(gain, a.currentTime + start);
  vol.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + length);
  osc.connect(vol).connect(a.destination);
  osc.start(a.currentTime + start);
  osc.stop(a.currentTime + start + length + 0.02);
}

export const sfx = {
  sprout() {
    tone(660, 0, 0.09);
    tone(990, 0.08, 0.14);
  },
  wilt() {
    tone(220, 0, 0.12, "triangle", 0.09);
    tone(165, 0.1, 0.18, "triangle", 0.09);
  },
  harvest() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.09, 0.16));
  },
  tap() {
    tone(880, 0, 0.04, "square", 0.03);
  },
  roundStart() {
    [392, 523, 659].forEach((f, i) => tone(f, i * 0.12, 0.2, "triangle", 0.08));
  },
  roundEnd() {
    [659, 523, 392, 523].forEach((f, i) => tone(f, i * 0.12, 0.22, "triangle", 0.08));
  },
};
