// Trumpi garso efektai, sintezuojami Web Audio (jokių failų, veikia offline).
// Švelnūs, žemo garsumo – kad netrukdytų kalbai.
import { audioContext } from './audio.js';

function tone(ctx, { freq, to, start = 0, dur = 0.15, type = 'sine', vol = 0.12 }) {
  const t = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

const SOUNDS = {
  // Lengvas "pop" paspaudus
  tap: (c) => tone(c, { freq: 520, to: 760, dur: 0.08, vol: 0.07 }),
  // Pakylantis dviejų natų skambesys
  correct: (c) => {
    tone(c, { freq: 659, dur: 0.16, type: 'triangle', vol: 0.12 });
    tone(c, { freq: 988, start: 0.1, dur: 0.28, type: 'triangle', vol: 0.12 });
  },
  // Žemas minkštas "bum" (ne bauginantis)
  wrong: (c) => tone(c, { freq: 260, to: 190, dur: 0.22, type: 'sine', vol: 0.1 }),
  // Kortelės apvertimas
  flip: (c) => tone(c, { freq: 340, to: 620, dur: 0.1, type: 'triangle', vol: 0.06 }),
  // Žvaigždutė (aukštesnė kiekvieną kartą: step 0,1,2)
  star: (c, step = 0) => {
    const base = [784, 988, 1175][step % 3];
    tone(c, { freq: base, dur: 0.3, type: 'sine', vol: 0.12 });
    tone(c, { freq: base * 2, start: 0.02, dur: 0.2, type: 'sine', vol: 0.04 });
  },
  // Rąstelio "tuk"
  knock: (c, step = 0) => tone(c, { freq: 300 + step * 40, to: 180 + step * 30, dur: 0.09, type: 'triangle', vol: 0.12 }),
  // Šventinė trijų natų melodija
  fanfare: (c) => {
    [523, 659, 784, 1047].forEach((f, i) => tone(c, { freq: f, start: i * 0.11, dur: 0.3, type: 'triangle', vol: 0.1 }));
  },
  whoosh: (c) => tone(c, { freq: 200, to: 900, dur: 0.18, type: 'sine', vol: 0.05 }),
  // Bėgimas: šuolis (trumpas kylantis „boing“)
  jump: (c) => {
    tone(c, { freq: 330, to: 880, dur: 0.14, type: 'square', vol: 0.035 });
    tone(c, { freq: 660, to: 1320, dur: 0.1, type: 'sine', vol: 0.05 });
  },
  // Bėgimas: atsitrenkė (krentantis „bum“ ir žemas dūžis)
  crash: (c) => {
    tone(c, { freq: 520, to: 110, dur: 0.45, type: 'sawtooth', vol: 0.05 });
    tone(c, { freq: 140, to: 60, start: 0.05, dur: 0.35, type: 'sine', vol: 0.16 });
  },
  // Bėgimas: kas 100 taškų
  milestone: (c) => {
    tone(c, { freq: 1047, dur: 0.09, type: 'square', vol: 0.03 });
    tone(c, { freq: 1568, start: 0.09, dur: 0.14, type: 'square', vol: 0.03 });
  },
};

export function sfx(name, arg) {
  const ctx = audioContext();
  if (!ctx || ctx.state !== 'running') return;
  try {
    SOUNDS[name]?.(ctx, arg);
  } catch {
    /* efektai neprivalomi */
  }
}
