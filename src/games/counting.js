// Kęstas: „Suskaičiuok rąstelius“.
import { h, onTap, shuffle, randInt, pulse } from '../ui/dom.js';
import { gameShell } from '../ui/game-shell.js';
import { createRound, intro } from './common.js';
import { ROUND_LENGTH } from '../config/games.js';
import { say, preload } from '../audio.js';
import { logSvg } from './log-svg.js';
import { PHRASES } from '../config/phrases.js';
import { sfx } from '../sfx.js';
import { stagger } from '../ui/fx.js';

/** Užduočių skaičiai: kaimyniniai nesikartoja, visa seka įvairi. */
export function buildCounts(max, n = ROUND_LENGTH) {
  const out = [];
  let pool = [];
  while (out.length < n) {
    if (!pool.length) pool = shuffle(Array.from({ length: max }, (_, k) => k + 1));
    const v = pool.pop();
    if (v === out[out.length - 1] && max > 1) {
      pool.unshift(v);
      continue;
    }
    out.push(v);
  }
  return out;
}

/**
 * 3 skaičių pasirinkimai, vienas teisingas. Trukdžiai – iki 3 nuo atsakymo, bet atsitiktinai,
 * kad teisingas atsakymas nebūtų visada toje pačioje vietoje (vaikas neturi spėti pagal vietą).
 */
export function buildChoices(answer, max, prev = null) {
  const hi = Math.max(max, 3);
  const pool = [];
  for (let v = Math.max(1, answer - 3); v <= Math.min(hi, answer + 3); v++) if (v !== answer) pool.push(v);
  let best = null;
  // Keli bandymai: renkamės variantą, kuriame atsakymo vieta skiriasi nuo ankstesnės užduoties.
  for (let k = 0; k < 6; k++) {
    const pick = [answer, ...shuffle(pool).slice(0, 2)].sort((a, b) => a - b);
    best = pick;
    if (prev == null || pick.indexOf(answer) !== prev) break;
  }
  return best;
}

export function countingGame(root, { level, onHome, onFinish }) {
  const max = level === 1 ? 5 : 10;
  const counts = buildCounts(max);
  let i = 0;
  let answer = 0;
  let tapped = 0;
  let lastPos = null; // kurioje vietoje buvo teisingas atsakymas praeitą kartą

  preload(Array.from({ length: 10 }, (_, k) => `numbers/${k + 1}`));

  const prompt = () => {
    shell.char.setEmotion('think');
    shell.char.speak('phrases/kestas_intro');
  };
  const shell = gameShell(root, { charId: 'kestas', total: ROUND_LENGTH, onHome, onRepeat: prompt });
  const round = createRound(shell);

  async function choose(btn, n) {
    if (round.busy || btn.disabled) return;
    if (n === answer) {
      countAloud();
      if (!(await round.correct(btn))) return;
      i++;
      shell.setProgress(i);
      if (i >= ROUND_LENGTH) return onFinish({ mistakes: round.mistakes });
      next();
    } else {
      round.wrong(btn);
    }
  }

  function tapLog(log) {
    if (round.busy || log.classList.contains('counted')) return;
    tapped++;
    log.classList.add('counted');
    log.querySelector('.log-num').textContent = tapped;
    pulse(log, 'bounce');
    sfx('knock', tapped);
    shell.char.talk(say(`numbers/${tapped}`));
  }

  /** Teisingai atsakius rąsteliai pašoka iš eilės su numeriais – vaikas pamato, kaip skaičiuojama. */
  function countAloud() {
    const logs = [...shell.board.querySelectorAll('.log')];
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

  function next() {
    answer = counts[i];
    tapped = 0;
    const logs = h('div', { class: 'logs' });
    for (let r = 0; r < Math.ceil(answer / 5); r++) {
      const row = h('div', { class: 'log-row' });
      for (let k = r * 5; k < Math.min(answer, r * 5 + 5); k++) {
        const log = h('button', { type: 'button', class: 'log', 'aria-label': 'Rąstelis', html: logSvg() }, h('span', { class: 'log-num' }));
        onTap(log, () => tapLog(log));
        row.append(log);
      }
      logs.append(stagger(row, 80, r * 400, 'roll'));
    }
    const nums = h('div', { class: 'num-choices' });
    const choices = buildChoices(answer, max, lastPos);
    lastPos = choices.indexOf(answer);
    choices.forEach((n) => {
      const btn = h('button', { type: 'button', class: 'num-btn', 'aria-label': `Skaičius ${n}`, text: n });
      onTap(btn, () => choose(btn, n));
      nums.append(btn);
    });
    const wrap = h('div', { class: 'counting' }, [logs, stagger(nums, 90, 300)]);
    shell.board.replaceChildren(wrap);
    shell.char.setEmotion('think');
    shell.char.show(PHRASES.kestas_intro);
    round.busy = false;
  }

  // Pirma paaiškinimas (rąstelių dar nėra), pauzė, tada rąsteliai atrieda.
  intro(shell, round, 'phrases/kestas_intro').then((ok) => ok && next());
  return () => round.destroy();
}
