// Ona: „Skaičių takas“ – akmenukus spausk iš eilės (1, 2, 3… / atgal / kas kelintą / pagal veiksmų atsakymus).
// Akmenukai išbarstyti atsitiktinai (bet kiekvienam lygiui – vienodai), nepersidengia.
// Teisingas akmenukas nušvinta ir sujungiamas linija su ankstesniu; klaidingas – sudreba.
import { h, onTap } from '../../ui/dom.js';
import { pulse } from '../../ui/motion.js';
import { sfx } from '../../sfx.js';
import { TRAIL_LEVELS } from '../../config/brain-levels.js';
import { brainShell, starsByMistakes, seeded } from './base.js';

const NS = 'http://www.w3.org/2000/svg';

/** Užrašas akmenukui: skaičius arba veiksmas, kurio atsakymas – v. */
function label(v, ops, rnd) {
  if (!ops) return String(v);
  const op = ops === '±' ? (rnd() < 0.5 ? '+' : '−') : ops;
  if (op === '+' && v >= 2) {
    const a = 1 + Math.floor(rnd() * (v - 1));
    return `${a}+${v - a}`;
  }
  const b = 1 + Math.floor(rnd() * Math.min(9, Math.max(1, 20 - v)));
  return `${v + b}−${b}`;
}

/** Išdėstymas: atsitiktinai sumaišyti tinklelio langeliai su poslinkiu – niekada nepersidengia. */
// aspect – žaidimo lauko plotis / aukštis (gulsčiame ekrane daugiau stulpelių, stačiame – eilučių).
function layout(count, rnd, aspect) {
  const a = Math.min(3, Math.max(0.6, aspect || 1));
  const cols = Math.max(2, Math.ceil(Math.sqrt(count * 1.3 * a)));
  const rows = Math.max(Math.ceil(count / cols), Math.ceil((count * 1.3) / cols));
  const cells = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push([r, c]);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return {
    cols,
    rows,
    // 5 % paraštė nuo krašto, kad akmenukai neliestų lauko ribų
    pos: cells.slice(0, count).map(([r, c]) => [5 + ((c + 0.5 + (rnd() - 0.5) * 0.28) / cols) * 90, 5 + ((r + 0.5 + (rnd() - 0.5) * 0.28) / rows) * 90]),
  };
}

export function trailGame(root, { level, onHome, onFinish }) {
  const L = TRAIL_LEVELS[level - 1] || TRAIL_LEVELS[0];
  const rnd = seeded(9000 + level * 13);
  const seq = L.seq;
  let next = 0;
  let mistakes = 0;

  const shell = brainShell(root, {
    level,
    introKey: 'trail_intro',
    onHome,
    onFinish,
  });
  const box = shell.board.getBoundingClientRect();
  const { cols, rows, pos } = layout(seq.length, rnd, box.height ? box.width / box.height : 1);
  shell.setMoves(0, 'klaidos');
  shell.char.show(L.ops ? 'Spausk atsakymus iš eilės!' : `Pradėk nuo ${seq[0]}!`);

  const field = h('div', { class: `trail-field${L.ops ? ' ops' : ''}`, style: `--cols:${cols};--rows:${rows}` });
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'trail-lines');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  const line = document.createElementNS(NS, 'polyline');
  line.setAttribute('vector-effect', 'non-scaling-stroke');
  svg.append(line);
  field.append(svg);

  const stones = seq.map((v, i) => {
    const txt = label(v, L.ops, rnd);
    const s = h('button', {
      type: 'button',
      class: 'trail-stone',
      style: `left:${pos[i][0]}%;top:${pos[i][1]}%`,
      text: txt,
      'aria-label': L.ops ? `Veiksmas ${txt}` : `Skaičius ${v}`,
    });
    onTap(s, () => tap(i, s));
    field.append(s);
    return s;
  });
  shell.board.append(h('div', { class: 'trail-wrap' }, field));

  const done = [];
  function tap(i, s) {
    if (shell.done || s.classList.contains('done')) return;
    if (i === next) {
      s.classList.add('done');
      done.push(pos[i]);
      line.setAttribute('points', done.map(([x, y]) => `${x},${y}`).join(' '));
      sfx('knock', next % 6);
      pulse(s, 'bounce');
      next++;
      if (next === seq.length) shell.win(starsByMistakes(mistakes), field);
      return;
    }
    mistakes++;
    shell.setMoves(mistakes, 'klaidos');
    sfx('wrong');
    pulse(s, 'shake');
    // po kelių klaidų – užuomina: kitas akmenukas sumirksi
    if (mistakes % 3 === 0) pulse(stones[next], 'bounce');
  }

  return () => shell.destroy();
}
