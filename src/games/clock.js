// Kęstas: „Laikrodis“ – kiek valandų rodo analoginis laikrodis?
// Lygiai: tik valandos → pusvalandžiai → ketvirčiai → kas 5 minutės.
import { h, onTap, shuffle, randInt } from '../ui/dom.js';
import { gameShell } from '../ui/game-shell.js';
import { createRound, intro } from './common.js';
import { ROUND_LENGTH, CLOCK_LEVELS } from '../config/games.js';
import { stagger } from '../ui/fx.js';

export const fmt = ({ h: hh, m }) => `${hh}:${String(m).padStart(2, '0')}`;
const wrapH = (x) => ((((x - 1) % 12) + 12) % 12) + 1;

/** Analoginis laikrodis (SVG): skaičiai 1–12, minučių brūkšneliai, dvi rodyklės. */
export function clockSvg({ h: hh, m }) {
  const R = 100;
  const pt = (deg, r) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [R + r * Math.cos(a), R + r * Math.sin(a)];
  };
  let ticks = '';
  for (let i = 0; i < 60; i++) {
    const big = i % 5 === 0;
    const [x1, y1] = pt(i * 6, big ? 80 : 85);
    const [x2, y2] = pt(i * 6, 91);
    ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#6B4A3A" stroke-width="${big ? 3 : 1.4}" stroke-linecap="round"/>`;
  }
  let nums = '';
  for (let n = 1; n <= 12; n++) {
    const [x, y] = pt(n * 30, 66);
    nums += `<text x="${x.toFixed(1)}" y="${(y + 7).toFixed(1)}" text-anchor="middle" font-size="21" font-weight="700" fill="#5a3825">${n}</text>`;
  }
  const hourDeg = ((hh % 12) + m / 60) * 30;
  const minDeg = m * 6;
  const [hx, hy] = pt(hourDeg, 44);
  const [mx, my] = pt(minDeg, 72);
  return `<svg class="clock-face" viewBox="0 0 200 200" role="img" aria-label="Laikrodis">
  <circle cx="100" cy="100" r="96" fill="#fffaf0" stroke="#C98A00" stroke-width="6"/>
  ${ticks}${nums}
  <line x1="100" y1="100" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}" stroke="#e5533d" stroke-width="8" stroke-linecap="round"/>
  <line x1="100" y1="100" x2="${mx.toFixed(1)}" y2="${my.toFixed(1)}" stroke="#1e86d1" stroke-width="5" stroke-linecap="round"/>
  <circle cx="100" cy="100" r="7" fill="#5a3825"/>
</svg>`;
}

/** n skirtingų laikų pagal žingsnį (60, 30, 15 arba 5 min.). Sudėtingesniuose lygiuose daugiausia ne „apvalių“. */
export function buildTimes(step, n = ROUND_LENGTH) {
  const all = [];
  for (let hh = 1; hh <= 12; hh++) for (let m = 0; m < 60; m += step) all.push({ h: hh, m });
  const round = all.filter((t) => t.m === 0);
  const other = all.filter((t) => t.m !== 0);
  if (step === 60) return shuffle(all).slice(0, n);
  const k = Math.min(other.length, n - 2); // keli „apvalūs“ laikai lieka pakartojimui
  return shuffle([...shuffle(other).slice(0, k), ...shuffle(round).slice(0, n - k)]);
}

/** Pasirinkimai: teisingas + tipinės klaidos (gretima valanda, sukeistos rodyklės, kitos minutės). */
export function clockChoices(t, step, count) {
  const cand = [
    { h: wrapH(t.h + 1), m: t.m },
    { h: wrapH(t.h - 1), m: t.m },
    t.m % 5 === 0 ? { h: wrapH(t.m / 5 || 12), m: (t.h % 12) * 5 } : null, // sukeistos rodyklės
    { h: t.h, m: (t.m + 30) % 60 },
    step < 30 ? { h: t.h, m: (t.m + 15) % 60 } : null,
    step < 15 ? { h: t.h, m: (t.m + 55) % 60 } : null,
  ].filter((c) => c && fmt(c) !== fmt(t) && (step === 60 ? c.m === 0 : c.m % step === 0));
  const uniq = [...new Map(cand.map((c) => [fmt(c), c])).values()];
  const picks = shuffle(uniq).slice(0, count - 1);
  while (picks.length < count - 1) {
    const r = { h: randInt(1, 12), m: step === 60 ? 0 : randInt(0, 60 / step - 1) * step };
    if (fmt(r) !== fmt(t) && !picks.some((p) => fmt(p) === fmt(r))) picks.push(r);
  }
  return shuffle([t, ...picks]);
}

export function clockGame(root, { level, onHome, onFinish }) {
  const { step } = CLOCK_LEVELS[level - 1] || CLOCK_LEVELS[0];
  const count = level === 1 ? 3 : 4;
  const times = buildTimes(step);
  let i = 0;
  let t = null;

  const shell = gameShell(root, { charId: 'kestas', total: ROUND_LENGTH, onHome, onRepeat: () => shell.char.speak('phrases/laikrodis_intro') });
  const round = createRound(shell);

  async function choose(btn, c) {
    if (round.busy || btn.disabled) return;
    if (fmt(c) === fmt(t)) {
      if (!(await round.correct(btn))) return;
      i++;
      shell.setProgress(i);
      if (i >= ROUND_LENGTH) return onFinish({ mistakes: round.mistakes });
      next();
    } else {
      round.wrong(btn);
    }
  }

  function next() {
    t = times[i];
    const opts = h('div', { class: `time-choices n${count}` });
    clockChoices(t, step, count).forEach((c) => {
      const btn = h('button', { type: 'button', class: 'num-btn time-btn', 'aria-label': fmt(c), text: fmt(c) });
      onTap(btn, () => choose(btn, c));
      opts.append(btn);
    });
    shell.board.replaceChildren(h('div', { class: 'clock-game' }, [h('div', { class: 'clock-wrap', html: clockSvg(t) }), stagger(opts, 80, 200)]));
    shell.char.setEmotion('think');
    shell.char.show('Kiek valandų rodo laikrodis?');
    round.busy = false;
  }

  intro(shell, round, 'phrases/laikrodis_intro').then((ok) => ok && next());
  return () => round.destroy();
}
