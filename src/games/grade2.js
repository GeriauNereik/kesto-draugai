// Gedas: „Antrokams“ – 2 klasės matematika. Kiekvienas lygis – viena tema (žr. GRADE2_TOPICS).
// Užuomina nerodoma, kol vaikas pats nepaspaudžia lemputės kampe – pirmiausia reikia pagalvoti.
import { h, onTap, shuffle, randInt, wait } from '../ui/dom.js';
import { gameShell } from '../ui/game-shell.js';
import { createRound, intro } from './common.js';
import { ROUND_LENGTH, GRADE2_TOPICS, GRADE2_LIVES } from '../config/games.js';
import { timerBar } from '../ui/timer.js';
import { addHearts } from '../ui/hearts.js';
import { sfx } from '../sfx.js';
import { iconButton } from '../ui/button.js';
import { stagger } from '../ui/fx.js';
import { pulse } from '../ui/motion.js';

const pick = (arr) => arr[randInt(0, arr.length - 1)];
const tens = (n) => n - (n % 10);

/** Daiktavardžio forma prie skaičiaus: 1 obuolys, 2 obuoliai, 10 obuolių, 21 obuolys. */
export function noun(n, [one, few, many]) {
  const t = n % 100;
  if (n % 10 === 0 || (t >= 10 && t <= 20)) return many;
  if (n % 10 === 1) return one;
  return few;
}
const N = {
  obuolys: ['obuolys', 'obuoliai', 'obuolių'],
  paukstis: ['paukštis', 'paukščiai', 'paukščių'],
  grybas: ['grybas', 'grybai', 'grybų'],
  kankorezis: ['kankorėžis', 'kankorėžiai', 'kankorėžių'],
  mergaite: ['mergaitė', 'mergaitės', 'mergaičių'],
  berniukas: ['berniukas', 'berniukai', 'berniukų'],
  riesutas: ['riešutas', 'riešutai', 'riešutų'],
  simtas: ['šimtas', 'šimtai', 'šimtų'],
  desimtis: ['dešimtis', 'dešimtys', 'dešimčių'],
  vienetas: ['vienetas', 'vienetai', 'vienetų'],
};
const nn = (n, w) => `${n} ${noun(n, N[w])}`;
const NAMES = ['Domas', 'Kęstas', 'Vėja', 'Tadas', 'Ona'];

// ---------- Užduočių generatoriai: { text, answer, hint, unit?, signs? } ----------

function add100() {
  // Dažniausiai su perėjimu per dešimtį – ten mokymosi vertė didžiausia.
  for (;;) {
    const a = randInt(12, 88);
    const b = Math.random() < 0.35 ? randInt(3, 9) : randInt(11, Math.min(99 - a, 59));
    if (a + b > 100 || b < 2) continue;
    if ((a % 10) + (b % 10) < 10 && Math.random() < 0.7) continue;
    const hint =
      b < 10
        ? `Papildyk iki apvalios dešimties: ${a} + ${10 - (a % 10)} = ${tens(a) + 10}. Tada pridėk likusius ${b - (10 - (a % 10))}.`
        : `Sudėk dešimtis: ${tens(a)} + ${tens(b)} = ${tens(a) + tens(b)}. Tada vienetus: ${a % 10} + ${b % 10}.`;
    return { text: `${a} + ${b} = ?`, answer: a + b, hint };
  }
}

function sub100() {
  for (;;) {
    const a = randInt(21, 99);
    const b = Math.random() < 0.35 ? randInt(3, 9) : randInt(11, a - 5);
    if (b >= a || b < 2) continue;
    if (a % 10 >= b % 10 && Math.random() < 0.7) continue; // dažniau su „skolinimu“
    const hint =
      b < 10
        ? `Pirma atimk iki apvalios dešimties: ${a} − ${a % 10} = ${tens(a)}. Tada atimk likusius ${b - (a % 10)}.`
        : `Atimk dešimtis: ${a} − ${tens(b)} = ${a - tens(b)}. Tada atimk vienetus: ${a - tens(b)} − ${b % 10}.`;
    return { text: `${a} − ${b} = ?`, answer: a - b, hint };
  }
}

function mul() {
  const a = Math.random() < 0.75 ? randInt(2, 5) : randInt(6, 10);
  const b = randInt(1, 10);
  const hint = b <= 5 ? `${a} × ${b} – tai ${b} kartus po ${a}: ${Array(b).fill(a).join(' + ')}.` : `${a} × ${b} = ${b} × ${a}. Gali skaičiuoti po ${a}: ${a}, ${a * 2}, ${a * 3}…`;
  return { text: `${a} × ${b} = ?`, answer: a * b, hint };
}

function div() {
  const a = Math.random() < 0.75 ? randInt(2, 5) : randInt(6, 10);
  const q = randInt(1, 10);
  return { text: `${a * q} : ${a} = ?`, answer: q, hint: `Kiek kartų ${a} telpa ${a * q}? Prisimink daugybą: ${a} × ? = ${a * q}.` };
}

function unknown() {
  const kind = randInt(0, 4);
  if (kind === 0) {
    const x = randInt(3, 60), b = randInt(2, 30);
    return { text: `□ + ${b} = ${x + b}`, answer: x, hint: `Nežinomas dėmuo: iš sumos atimk žinomą dėmenį. □ = ${x + b} − ${b}.` };
  }
  if (kind === 1) {
    const a = randInt(3, 60), x = randInt(2, 30);
    return { text: `${a} + □ = ${a + x}`, answer: x, hint: `Kiek reikia pridėti prie ${a}, kad būtų ${a + x}? □ = ${a + x} − ${a}.` };
  }
  if (kind === 2) {
    const x = randInt(10, 80), b = randInt(2, Math.min(30, x - 1));
    return { text: `□ − ${b} = ${x - b}`, answer: x, hint: `Nežinomas turinys: prie skirtumo pridėk atėminį. □ = ${x - b} + ${b}.` };
  }
  if (kind === 3) {
    const a = randInt(15, 90), x = randInt(2, a - 3);
    return { text: `${a} − □ = ${a - x}`, answer: x, hint: `Kiek reikia atimti iš ${a}, kad liktų ${a - x}? □ = ${a} − ${a - x}.` };
  }
  const a = randInt(2, 5), x = randInt(2, 10);
  return { text: `□ × ${a} = ${a * x}`, answer: x, hint: `Kokį skaičių padauginus iš ${a} gausi ${a * x}? □ = ${a * x} : ${a}.` };
}

function compare() {
  const a = randInt(15, 70), b = randInt(3, 25);
  const left = a + b;
  const rel = randInt(0, 2); // 0 – lygu, 1 – kairė didesnė, 2 – kairė mažesnė
  const right = rel === 0 ? left : rel === 1 ? left - randInt(1, 9) : left + randInt(1, 9);
  const answer = left === right ? '=' : left > right ? '>' : '<';
  return { text: `${a} + ${b} ○ ${right}`, answer, signs: true, hint: `Pirma apskaičiuok kairę pusę, tada palygink su ${right}. Atvira „burnytė“ žiūri į didesnį skaičių.` };
}

function place() {
  const s = randInt(1, 9), d = randInt(0, 9), v = randInt(0, 9);
  const n = s * 100 + d * 10 + v;
  const kind = randInt(0, 2);
  if (kind === 0) return { text: `${nn(s, 'simtas')}, ${nn(d, 'desimtis')} ir ${nn(v, 'vienetas')} = ?`, answer: n, hint: `Šimtai – pirmas skaitmuo, dešimtys – antras, vienetai – trečias.`, digits: [s, d, v] };
  if (kind === 1) return { text: `${s * 100} + ${d * 10} + ${v} = ?`, answer: n, hint: `${s * 100} – tai ${nn(s, 'simtas')}, ${d * 10} – ${nn(d, 'desimtis')}.`, digits: [s, d, v] };
  const which = randInt(0, 2);
  const label = ['šimtų', 'dešimčių', 'vienetų'][which];
  return { text: `Koks skaitmuo yra ${label} vietoje skaičiuje ${n}?`, answer: [s, d, v][which], hint: `Skaičiuje ${n}: šimtai – ${s}, toliau eina dešimtys, paskutinis – vienetai.`, small: true };
}

function money() {
  const kind = randInt(0, 3);
  if (kind === 0) {
    const e = randInt(1, 5), c = randInt(1, 9) * 10;
    return { text: `${e} € ${c} ct = ? ct`, answer: e * 100 + c, unit: 'ct', hint: `1 € = 100 ct. Vadinasi, ${e} € = ${e * 100} ct.` };
  }
  if (kind === 1) {
    const x = randInt(2, 7) * 5, y = randInt(2, 9) * 5;
    return { text: `Bandelė kainuoja ${x} ct, sultys – ${y} ct. Kiek kainuoja kartu?`, answer: x + y, unit: 'ct', hint: 'Kartu – vadinasi, sudėk kainas.', small: true };
  }
  if (kind === 2) {
    const p = randInt(2, 18) * 5;
    return { text: `Turėjai 1 €. Nusipirkai ledų už ${p} ct. Kiek centų liko?`, answer: 100 - p, unit: 'ct', hint: `1 € = 100 ct. Iš 100 ct atimk ${p} ct.`, small: true };
  }
  const c = randInt(2, 9);
  return { text: `${c * 100} ct = ? €`, answer: c, unit: '€', hint: '100 ct = 1 €. Kiek kartų 100 telpa?' };
}

function words() {
  const name = pick(NAMES);
  const kind = randInt(0, 4);
  if (kind === 0) {
    const a = randInt(5, 40), b = randInt(3, 30);
    return { text: `${name} rado ${nn(a, 'riesutas')}. Paskui rado dar ${b}. Kiek riešutų iš viso?`, answer: a + b, hint: 'Rado dar – vadinasi, riešutų padaugėjo. Sudėk.', small: true };
  }
  if (kind === 1) {
    const a = randInt(12, 40), b = randInt(3, a - 2);
    return { text: `Ant medžio tupėjo ${nn(a, 'paukstis')}. ${b} nuskrido. Kiek paukščių liko?`, answer: a - b, hint: 'Nuskrido – paukščių sumažėjo. Atimk.', small: true };
  }
  if (kind === 2) {
    const a = randInt(2, 5), b = randInt(2, 5);
    return { text: `Viename krepšelyje yra ${nn(a, 'grybas')}. Kiek grybų yra ${b} tokiuose krepšeliuose?`, answer: a * b, hint: `${b} kartus po ${a} – daugink: ${b} × ${a}.`, small: true };
  }
  if (kind === 3) {
    const k = randInt(2, 5), q = randInt(2, 6);
    return { text: `${nn(k * q, 'kankorezis')} padalijo po lygiai ${k} voverėms. Kiek kankorėžių gavo kiekviena voverė?`, answer: q, hint: `Po lygiai – dalink: ${k * q} : ${k}.`, small: true };
  }
  const g = randInt(5, 15), b = randInt(5, 15);
  return { text: `Klasėje yra ${nn(g, 'mergaite')} ir ${nn(b, 'berniukas')}. Kiek vaikų yra klasėje?`, answer: g + b, hint: 'Visi vaikai – tai mergaitės ir berniukai kartu. Sudėk.', small: true };
}

export const GENERATORS = { add100, sub100, mul, div, unknown, compare, place, money, words };

/** 4 skirtingi atsakymų variantai su tipinėmis klaidomis (±1, ±10, sukeisti skaitmenys). */
export function grade2Options(task) {
  if (task.signs) return ['>', '<', '='];
  const a = task.answer;
  const cand = [a + 1, a - 1, a + 10, a - 10, a + 2, a - 2];
  if (a >= 10 && a < 100) cand.push(Number(String(a).split('').reverse().join('')));
  if (task.digits) {
    const [s, d, v] = task.digits;
    cand.push(s * 100 + v * 10 + d, d * 100 + s * 10 + v, s * 100 + d + v * 10);
  }
  const picks = shuffle([...new Set(cand)].filter((x) => x > 0 && x !== a && x < 1000)).slice(0, 3);
  return shuffle([a, ...picks]);
}

/** n užduočių be pasikartojimų. */
export function buildGrade2(topicId, n = ROUND_LENGTH) {
  const gen = GENERATORS[topicId];
  const out = [];
  const seen = new Set();
  for (let k = 0; out.length < n && k < n * 30; k++) {
    const t = gen();
    if (seen.has(t.text)) continue;
    seen.add(t.text);
    out.push(t);
  }
  return out;
}

export function grade2Game(root, { level, onHome, onFinish }) {
  const topic = GRADE2_TOPICS[level - 1] || GRADE2_TOPICS[0];
  const tasks = buildGrade2(topic.id);
  let i = 0;
  let task = null;
  let lives = GRADE2_LIVES;
  let optBtns = [];

  const shell = gameShell(root, { charId: 'gedas', total: ROUND_LENGTH, onHome, onRepeat: () => shell.char.speak('phrases/gedas_intro') });
  const round = createRound(shell);
  // Gyvybės ir laiko juosta: klaida ar nespėtas atsakymas – minus gyvybė.
  const hs = addHearts(shell, GRADE2_LIVES);
  const timer = timerBar();
  timer.el.hidden = true;
  shell.screen.querySelector('.topbar').after(timer.el);

  // Užuomina – lemputė viršutiniame dešiniajame kampe; tekstas pasirodo tik ją paspaudus.
  const hintText = h('p', { class: 'hint-text' });
  const hintBox = h('div', { class: 'hint-box', hidden: true, role: 'note' }, hintText);
  const bulb = iconButton({
    icon: 'bulb',
    ariaLabel: 'Užuomina',
    cls: 'hint-btn',
    onClick: () => {
      if (!task) return;
      hintBox.hidden = !hintBox.hidden;
      bulb.classList.toggle('on', !hintBox.hidden);
      if (!hintBox.hidden) pulse(hintBox, 'bubble-pop');
    },
  });
  shell.screen.querySelector('.topbar').append(bulb);
  shell.screen.append(hintBox);

  async function choose(btn, value) {
    if (round.busy || btn.disabled) return;
    if (value === task.answer) {
      timer.stop();
      if (!(await round.correct(btn))) return;
      i++;
      shell.setProgress(i);
      if (i >= tasks.length) return onFinish({ stars: lives });
      next();
    } else {
      lose(btn);
    }
  }

  /** Klaida (btn) arba baigėsi laikas (btn = null): minus gyvybė, parodomas atsakymas, nauja užduotis. */
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
    optBtns.forEach((b) => {
      if (b.dataset.value === String(task.answer)) b.classList.add('correct');
      else if (b !== btn) b.disabled = true;
    });
    const ans = task.unit ? `${task.answer} ${task.unit}` : task.answer;
    shell.char.setEmotion('encourage');
    shell.char.show(btn ? `Oi! Teisingai – ${ans}.` : `Laikas baigėsi! Buvo ${ans}.`);
    await wait(2200);
    if (!round.alive) return;
    if (lives <= 0) return onFinish({ failed: true });
    tasks[i] = freshTask();
    next();
  }

  /** Nauja tos pačios temos užduotis, kurios dar nebuvo šiame raunde. */
  function freshTask() {
    const seen = new Set(tasks.map((t) => t.text));
    for (let k = 0; k < 40; k++) {
      const t = GENERATORS[topic.id]();
      if (!seen.has(t.text)) return t;
    }
    return GENERATORS[topic.id]();
  }

  function next() {
    task = tasks[i];
    hintBox.hidden = true;
    bulb.classList.remove('on');
    hintText.textContent = task.hint;
    const opts = h('div', { class: `g2-options${task.signs ? ' signs' : ''}` });
    optBtns = grade2Options(task).map((v) => {
      const label = task.unit ? `${v} ${task.unit}` : String(v);
      const btn = h('button', { type: 'button', class: 'num-btn g2-btn', 'aria-label': label, text: label, 'data-value': String(v) });
      onTap(btn, () => choose(btn, v));
      opts.append(btn);
      return btn;
    });
    const card = h('div', { class: `g2-task${task.small ? ' small' : ''}`, text: task.text });
    shell.board.replaceChildren(h('div', { class: 'g2-game' }, [card, stagger(opts, 70, 150)]));
    shell.char.setEmotion('think');
    shell.char.show(topic.label);
    round.busy = false;
    timer.start(topic.seconds || 25, () => lose(null));
  }

  intro(shell, round, 'phrases/gedas_intro').then((ok) => ok && next());
  return () => {
    timer.destroy();
    round.destroy();
  };
}
