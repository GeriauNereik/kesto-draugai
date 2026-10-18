// Kęstas: „Sudėk ir atimk“ – sudėtis ir atimtis su rąsteliais.
// Sudedant atrieda antra rąstelių grupė (kita spalva), atimant dalis rąstelių „nuplaukia“ (išblunka).
import { h, onTap, shuffle, pulse, wait } from '../ui/dom.js';
import { gameShell } from '../ui/game-shell.js';
import { createRound, intro } from './common.js';
import { buildChoices } from './counting.js';
import { ROUND_LENGTH, MATH_LIVES, MATH_TIME } from '../config/games.js';
import { timerBar } from '../ui/timer.js';
import { addHearts } from '../ui/hearts.js';
import { say, preload } from '../audio.js';
import { logSvg } from './log-svg.js';
import { sfx } from '../sfx.js';
import { stagger } from '../ui/fx.js';

const MINUS = '−';
const AWAY_DELAY = 900; // ms: kiek rąsteliai pastovi, kol dalis jų nuplaukia

/** Visos galimos užduotys iki max (atsakymas visada 1..max, kad būtų įrašas numbers/). */
export function allTasks(max) {
  const add = [];
  const sub = [];
  for (let a = 1; a <= max; a++) {
    for (let b = 1; a + b <= max; b++) add.push({ op: '+', a, b, answer: a + b });
    for (let b = 1; a - b >= 1; b++) sub.push({ op: MINUS, a, b, answer: a - b });
  }
  return { add, sub };
}

/** n užduočių: pusė sudėties, pusė atimties, nesikartoja, gretimų atsakymai skiriasi. */
export function buildTasks(max, n = ROUND_LENGTH) {
  const { add, sub } = allTasks(max);
  const half = Math.ceil(n / 2);
  let out = [];
  for (let attempt = 0; attempt < 30; attempt++) {
    const left = shuffle([...shuffle(add).slice(0, half), ...shuffle(sub).slice(0, n - half)]);
    // Dėliojam po vieną: kitos užduoties atsakymas skiriasi nuo ankstesnės (jei tik įmanoma).
    out = [];
    while (left.length) {
      const prev = out[out.length - 1];
      const k = Math.max(0, left.findIndex((t) => t.answer !== prev?.answer));
      out.push(left.splice(k, 1)[0]);
    }
    if (out.every((t, i) => i === 0 || t.answer !== out[i - 1].answer)) break;
  }
  return out;
}

export function mathGame(root, { level, onHome, onFinish }) {
  const max = level === 1 ? 5 : 10;
  const tasks = buildTasks(max);
  let i = 0;
  let task = null;
  let tapped = 0;
  let lastPos = null;
  let eqAnswer = null;
  let awayTimer = null;
  let tapReady = true; // atimant rąstelius skaičiuoti galima tik jiems nuplaukus
  let lives = MATH_LIVES;
  let choiceBtns = [];
  const seconds = MATH_TIME[level - 1] || MATH_TIME[0];

  preload(Array.from({ length: 10 }, (_, k) => `numbers/${k + 1}`));

  // Veiksmas neįgarsinamas (tėvų prašymu) – lygybė tik rodoma; garsiakalbis pakartoja paaiškinimą.
  const prompt = () => {
    if (!task) return shell.char.speak('phrases/kestas_math_intro');
    shell.char.setEmotion('think');
    shell.char.show(`Kiek bus ${task.a} ${task.op} ${task.b}?`);
  };
  const repeat = () => shell.char.speak('phrases/kestas_math_intro');

  const shell = gameShell(root, { charId: 'kestas', total: ROUND_LENGTH, onHome, onRepeat: repeat });
  const round = createRound(shell);
  // Gyvybės kampe ir laiko juosta: klaida ar nespėtas atsakymas – minus gyvybė.
  const hs = addHearts(shell, MATH_LIVES);
  const timer = timerBar();
  timer.el.hidden = true;
  shell.screen.querySelector('.topbar').after(timer.el);

  async function choose(btn, n) {
    if (round.busy || btn.disabled) return;
    if (n === task.answer) {
      timer.stop();
      eqAnswer.textContent = n;
      eqAnswer.classList.add('solved');
      countAloud();
      if (!(await round.correct(btn))) return;
      i++;
      shell.setProgress(i);
      if (i >= ROUND_LENGTH) return onFinish({ stars: lives });
      next();
    } else {
      lose(btn);
    }
  }

  /** Klaida (btn) arba baigėsi laikas (btn = null): minus gyvybė, parodomas atsakymas, kita užduotis. */
  async function lose(btn) {
    if (round.busy || !round.alive) return;
    round.busy = true;
    timer.stop();
    lives--;
    hs.set(lives, { shake: true });
    sfx('wrong');
    if (btn) {
      btn.classList.add('dimmed');
      pulse(btn, 'shake');
    }
    choiceBtns.forEach((b) => b !== btn && (b.disabled = true));
    eqAnswer.textContent = task.answer;
    eqAnswer.classList.add('missed');
    shell.char.setEmotion('encourage');
    shell.char.show(btn ? `Oi! Teisingai – ${task.answer}.` : `Laikas baigėsi! Buvo ${task.answer}.`);
    await wait(1600);
    if (!round.alive) return;
    if (lives <= 0) return onFinish({ failed: true });
    tasks[i] = replacement(task); // ta pati vieta progrese – nauja užduotis
    next();
  }

  /** Kita atsitiktinė to paties lygio užduotis (ne ta pati ir su kitu atsakymu). */
  function replacement(old) {
    const { add, sub } = allTasks(max);
    const pool = shuffle([...add, ...sub]).filter((t) => t.answer !== old.answer);
    return pool[0] || old;
  }

  const liveLogs = () => [...shell.board.querySelectorAll('.log:not(.log-away)')];

  /** Paliestas rąstelis gauna numerį ir ištariamas skaičius (kaip skaičiavimo žaidime). */
  function tapLog(log) {
    if (round.busy || !tapReady || log.classList.contains('counted') || log.classList.contains('log-away')) return;
    tapped++;
    log.classList.add('counted');
    log.querySelector('.log-num').textContent = tapped;
    pulse(log, 'bounce');
    sfx('knock', tapped);
    shell.char.talk(say(`numbers/${tapped}`));
  }

  /** Teisingai atsakius likę rąsteliai sunumeruojami iš eilės. */
  function countAloud() {
    const logs = liveLogs();
    const step = Math.min(110, 900 / logs.length);
    logs.forEach((log, k) => {
      setTimeout(() => {
        if (!round.alive) return;
        log.classList.add('counted');
        log.querySelector('.log-num').textContent = k + 1;
        pulse(log, 'bounce');
      }, k * step);
    });
  }

  function makeLog(extra) {
    const log = h('button', { type: 'button', class: `log ${extra}`, 'aria-label': 'Rąstelis', html: logSvg() }, h('span', { class: 'log-num' }));
    onTap(log, () => tapLog(log));
    return log;
  }

  function next() {
    task = tasks[i];
    tapped = 0;
    clearTimeout(awayTimer);
    const total = task.op === '+' ? task.answer : task.a;
    // Sudėtis: pirmi a – įprasti, paskutiniai b – „atriedantys“. Atimtis: paskutiniai b vėliau nuplaukia.
    const logEls = Array.from({ length: total }, (_, k) => makeLog(task.op === '+' && k >= task.a ? 'log-add' : ''));
    const logs = h('div', { class: 'logs' });
    for (let r = 0; r < Math.ceil(total / 5); r++) {
      logs.append(stagger(h('div', { class: 'log-row' }, logEls.slice(r * 5, r * 5 + 5)), 80, r * 400, 'roll'));
    }

    eqAnswer = h('span', { class: 'eq-answer', text: '?' });
    const eq = h('div', { class: 'equation', 'aria-label': `${task.a} ${task.op === '+' ? 'plius' : 'minus'} ${task.b}` }, [
      h('span', { class: 'eq-a', text: task.a }),
      h('span', { class: 'eq-op', text: task.op }),
      h('span', { class: `eq-b ${task.op === '+' ? 'add' : 'sub'}`, text: task.b }),
      h('span', { class: 'eq-op', text: '=' }),
      eqAnswer,
    ]);

    const nums = h('div', { class: 'num-choices' });
    const choices = buildChoices(task.answer, max, lastPos);
    lastPos = choices.indexOf(task.answer);
    choiceBtns = choices.map((n) => {
      const btn = h('button', { type: 'button', class: 'num-btn', 'aria-label': `Skaičius ${n}`, text: n });
      onTap(btn, () => choose(btn, n));
      nums.append(btn);
      return btn;
    });

    shell.board.replaceChildren(h('div', { class: 'counting math' }, [eq, logs, stagger(nums, 90, 300)]));
    round.busy = false;

    tapReady = task.op !== MINUS;
    if (task.op === MINUS) {
      const away = logEls.slice(task.a - task.b);
      awayTimer = setTimeout(() => {
        if (!round.alive) return;
        away.forEach((log, k) => setTimeout(() => round.alive && log.classList.add('log-away'), k * 120));
        sfx('whoosh');
        awayTimer = setTimeout(() => {
          tapReady = true;
          if (round.alive && !round.busy) timer.start(seconds, () => lose(null)); // laikas – tik rąsteliams nuplaukus
        }, away.length * 120 + 300);
      }, AWAY_DELAY);
    } else {
      timer.start(seconds, () => lose(null));
    }
    prompt();
  }

  // Pirma paaiškinimas, pauzė, tada pirmoji užduotis.
  intro(shell, round, 'phrases/kestas_math_intro').then((ok) => ok && next());
  return () => {
    clearTimeout(awayTimer);
    timer.destroy();
    round.destroy();
  };
}
