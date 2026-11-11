// Ona: „Vandentiekis“ – viršuje statinės su spalvotu vandeniu, apačioje kubilai, kuriems reikia tam tikros spalvos.
// Bakstelėjus vamzdis pasisuka 90°, bakstelėjus raudoną ratuką – čiaupas atsisuka arba užsisuka.
// Vanduo teka iškart (matosi, kur nubėga); susitikusios spalvos susimaišo: mėlyna + geltona = žalia,
// raudona + geltona = oranžinė, mėlyna + raudona = violetinė. Laimėta, kai kiekviename kubile – reikiama spalva.
// Lygiai – src/config/brain/pipes.json (sugeneruoti nuo sprendimo, žr. scripts/brain/gen-levels.mjs).
import { h, onTap } from '../../ui/dom.js';
import { pulse } from '../../ui/motion.js';
import { sfx } from '../../sfx.js';
import { PIPE_LEVELS } from '../../config/brain-levels.js';
import { brainShell, starsByMoves } from './base.js';

const IMG = `${import.meta.env.BASE_URL}assets/brain/pipes/`;
const NS = 'http://www.w3.org/2000/svg';
const DIRS = [[-1, 0, 1], [0, 1, 2], [1, 0, 4], [0, -1, 8]];
const OPP = { 1: 4, 2: 8, 4: 1, 8: 2 };
const rotMask = (m, k = 1) => {
  for (let i = 0; i < ((k % 4) + 4) % 4; i++) m = ((m << 1) | (m >> 3)) & 15;
  return m;
};
/** Spalvų rinkinys → spalva (maišymas). */
const MIX = { b: '#3fa9f5', y: '#ffcf33', r: '#ff6250', by: '#4cb963', ry: '#ff9a2e', br: '#a970ff', bry: '#8b5a3c' };
const NAME = { b: 'mėlynos', y: 'geltonos', r: 'raudonos', by: 'žalios', ry: 'oranžinės', br: 'violetinės', bry: 'rudos' };
const norm = (x) => [...new Set(x)].sort().join('');

/** Vamzdžio SVG (pagrindinė kaukė – pasukama visa grupė). */
function pipeSvg(m) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('class', 'pipe-svg');
  const g = document.createElementNS(NS, 'g');
  g.setAttribute('class', 'pipe-rot');
  const arms = [];
  for (const [, , bit] of DIRS) if (m & bit) arms.push(bit);
  const end = { 1: [50, 0], 2: [100, 50], 4: [50, 100], 8: [0, 50] };
  const d = arms.map((b) => `M50 50L${end[b][0]} ${end[b][1]}`).join('') || 'M50 50L50 50';
  for (const [cls, w] of [['pipe-out', 32], ['pipe-in', 23], ['pipe-water', 12]]) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('class', cls);
    p.setAttribute('stroke-width', w);
    g.append(p);
  }
  // jungtis viduryje (ir aklina galas, jei viena atšaka)
  for (const [cls, rr] of [['pipe-out', 17], ['pipe-in', 12.5], ['pipe-water', 6.5]]) {
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', 50);
    c.setAttribute('cy', 50);
    c.setAttribute('r', rr);
    c.setAttribute('class', `${cls} fill`);
    g.append(c);
  }
  // movos vamzdžių galuose
  for (const b of arms) {
    const r = document.createElementNS(NS, 'rect');
    const [x, y] = end[b];
    const horiz = b === 2 || b === 8;
    r.setAttribute('x', horiz ? (x === 0 ? 4 : 89) : 31);
    r.setAttribute('y', horiz ? 31 : y === 0 ? 4 : 89);
    r.setAttribute('width', horiz ? 7 : 38);
    r.setAttribute('height', horiz ? 38 : 7);
    r.setAttribute('rx', 3.5);
    r.setAttribute('class', 'pipe-collar');
    g.append(r);
  }
  svg.append(g);
  return svg;
}

export function pipesGame(root, { level, onHome, onFinish }) {
  const L = PIPE_LEVELS[level - 1] || PIPE_LEVELS[0];
  const { rows, cols } = L;
  const base = L.tiles.map((t) => t.m); // pradinė kaukė (piešiama), sukimas – k
  let k = L.tiles.map(() => 0);
  let open = L.tiles.map((t) => (t.v === undefined ? null : !!t.v));
  let taps = 0;
  const history = [];
  const hasMix = L.tanks.some((t) => t.need.length > 1);
  const hasValve = open.some((v) => v !== null);

  const shell = brainShell(root, {
    level,
    introKey: 'pipes_intro',
    onHome,
    onFinish,
    tools: {
      undo() {
        if (!history.length || shell.done) return;
        ({ k, open } = history.pop());
        taps++;
        render(true);
      },
      restart() {
        if (shell.done) return;
        k = L.tiles.map(() => 0);
        open = L.tiles.map((t) => (t.v === undefined ? null : !!t.v));
        history.length = 0;
        taps = 0;
        render(true);
      },
    },
  });
  shell.setMoves(0, 'paspaudimai');

  // ---------- statinės (viršuje) ----------
  const top = h('div', { class: 'pipe-row pipe-top', style: `--cols:${cols}` });
  for (let c = 0; c < cols; c++) {
    const s = L.sources.find((x) => x.c === c);
    top.append(
      s
        ? h('div', { class: 'pipe-src', style: `--w:${MIX[s.color]}` }, [h('img', { src: `${IMG}barrel.webp`, alt: '', draggable: 'false' }), h('span', { class: 'pipe-drop', 'aria-label': `${NAME[s.color]} spalvos vanduo` }), h('span', { class: 'pipe-stub' })])
        : h('div', { class: 'pipe-src empty' })
    );
  }
  // ---------- vamzdžiai ----------
  const grid = h('div', { class: 'pipe-grid', style: `--cols:${cols};--rows:${rows};--soil:url(${IMG}soil.webp)` });
  const cells = L.tiles.map((t, i) => {
    const valve = t.v !== undefined;
    const el = h('button', { type: 'button', class: `pipe-cell${valve ? ' valve' : ''}`, 'aria-label': valve ? 'Čiaupas' : 'Vamzdis' }, [pipeSvg(t.m)]);
    if (valve) el.append(h('img', { class: 'pipe-wheel', src: `${IMG}valve.webp`, alt: '', draggable: 'false' }), h('span', { class: 'pipe-gate', 'aria-hidden': 'true' }));
    onTap(el, () => tap(i));
    grid.append(el);
    return el;
  });
  // ---------- kubilai (apačioje) ----------
  const bottom = h('div', { class: 'pipe-row pipe-bottom', style: `--cols:${cols}` });
  const tankEls = [];
  for (let c = 0; c < cols; c++) {
    const t = L.tanks.find((x) => x.c === c);
    if (!t) {
      bottom.append(h('div', { class: 'pipe-tank empty' }));
      continue;
    }
    const el = h('div', { class: 'pipe-tank', style: `--need:${MIX[t.need]}`, 'aria-label': `Kubilui reikia ${NAME[t.need]} spalvos` }, [
      h('span', { class: 'pipe-stub' }),
      h('span', { class: 'pipe-fill' }),
      h('img', { src: `${IMG}tub.webp`, alt: '', draggable: 'false' }),
      h('span', { class: 'pipe-need', 'aria-hidden': 'true' }),
      h('span', { class: 'pipe-mark', 'aria-hidden': 'true' }),
    ]);
    tankEls.push([t, el]);
    bottom.append(el);
  }
  shell.board.append(h('div', { class: 'pipe-wrap', style: `--cols:${cols};--rows:${rows}` }, [h('div', { class: 'pipe-stage' }, [top, grid, bottom]), shell.toolbar]));

  const mask = (i) => rotMask(base[i], k[i]);

  /** Vandens tekėjimas nuo kiekvienos statinės. */
  function flow() {
    const color = Array(rows * cols).fill('');
    for (const s of L.sources) {
      const start = s.c;
      if (!(mask(start) & 1) || open[start] === false) continue;
      const seen = new Set([start]);
      const q = [start];
      while (q.length) {
        const i = q.pop();
        if (!color[i].includes(s.color)) color[i] += s.color;
        const r = Math.floor(i / cols);
        const c = i % cols;
        for (const [dr, dc, bit] of DIRS) {
          if (!(mask(i) & bit)) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
          const j = nr * cols + nc;
          if (!(mask(j) & OPP[bit]) || open[j] === false || seen.has(j)) continue;
          seen.add(j);
          q.push(j);
        }
      }
    }
    return color.map(norm);
  }

  let prevGood = 0;
  function render(instant = false) {
    const color = flow();
    cells.forEach((el, i) => {
      const g = el.querySelector('.pipe-rot');
      g.style.transition = instant ? 'none' : '';
      g.style.transform = `rotate(${k[i] * 90}deg)`;
      el.style.setProperty('--water', color[i] ? MIX[color[i]] : 'transparent');
      el.classList.toggle('wet', !!color[i]);
      if (open[i] !== null) el.classList.toggle('closed', !open[i]);
    });
    let good = 0;
    tankEls.forEach(([t, el]) => {
      const i = (rows - 1) * cols + t.c;
      const got = mask(i) & 4 && open[i] !== false ? color[i] : '';
      el.style.setProperty('--got', got ? MIX[got] : 'transparent');
      el.classList.toggle('filled', !!got);
      el.classList.toggle('ok', got === t.need);
      el.classList.toggle('bad', !!got && got !== t.need);
      if (got === t.need) good++;
    });
    shell.setMoves(taps, 'paspaudimai');
    shell.setUndo(history.length > 0);
    return good;
  }

  function tap(i) {
    if (shell.done) return;
    history.push({ k: k.slice(), open: open.slice() });
    if (history.length > 200) history.shift();
    taps++;
    if (open[i] !== null) {
      open[i] = !open[i];
      sfx('knock', 2);
      pulse(cells[i].querySelector('.pipe-wheel'), 'wiggle');
    } else {
      k[i]++;
      sfx('flip');
    }
    const good = render();
    const bad = tankEls.filter(([, el]) => el.classList.contains('bad'));
    if (good > prevGood) sfx('correct');
    if (bad.length) {
      const [t, el] = bad[0];
      sfx('wrong');
      pulse(el, 'shake');
      const got = Object.keys(MIX).find((x) => MIX[x] === el.style.getPropertyValue('--got'));
      shell.char.show(got && got.length > t.need.length ? 'Spalvos susimaišė! Užsuk čiaupą arba pasuk vamzdį kitaip.' : `Šiam kubilui reikia ${NAME[t.need]} spalvos!`);
    }
    prevGood = good;
    if (good === tankEls.length) shell.win(starsByMoves(taps, L.par), grid);
  }

  render(true);
  prevGood = tankEls.filter(([, el]) => el.classList.contains('ok')).length;
  if (level === 1) shell.char.show('Bakstelėk vamzdį – jis pasisuks!');
  else if (hasMix && !hasValve) shell.char.show('Mėlyna ir geltona kartu – žalia!');
  else if (hasValve && level <= 6) shell.char.show('Raudonas ratukas – čiaupas. Bakstelėk – atsisuks ar užsisuks.');
  return () => shell.destroy();
}
