// Ona: „Paslėptas takas“ – ežiukas Domas parodo kelią per akmenukus, takas pasislepia, o vaikas turi jį pakartoti.
// Spaudžiama akmenukas po akmenuko nuo apačios iki viršaus. Klaida – akmenukas sudreba (kelias nesibaigia);
// po 3 klaidų takas parodomas dar kartą. Mygtukas „Iš naujo“ – parodo taką iš naujo.
import { h, onTap, wait } from '../../ui/dom.js';
import { pulse } from '../../ui/motion.js';
import { sfx } from '../../sfx.js';
import { PATH_LEVELS } from '../../config/brain-levels.js';
import { brainShell, starsByMistakes, seeded } from './base.js';

const WALKER = `${import.meta.env.BASE_URL}assets/characters/portraits/domas.webp`;
const IMG = `${import.meta.env.BASE_URL}assets/brain/path/`;
const HOME = `${IMG}home.webp`;
const NS = 'http://www.w3.org/2000/svg';

/** Takas: nuo apatinės eilutės iki viršutinės, be grįžimų ir pasikartojimų, tiksliai len žingsnių. */
function makePath({ cols, rows, len }, rnd) {
  for (let attempt = 0; attempt < 2000; attempt++) {
    let c = Math.floor(rnd() * cols);
    let r = rows - 1;
    const path = [[r, c]];
    const seen = new Set([`${r},${c}`]);
    let ups = rows - 1;
    let sides = len - rows;
    let lastSide = 0;
    while (path.length < len) {
      const opts = [];
      if (ups > 0) opts.push([-1, 0]);
      if (sides > 0) {
        for (const d of [-1, 1]) {
          if (d === -lastSide) continue; // nesukam atgal
          const nc = c + d;
          if (nc >= 0 && nc < cols && !seen.has(`${r},${nc}`)) opts.push([0, d]);
        }
      }
      if (!opts.length) break;
      // stengiamės, kad šoniniai žingsniai pasiskirstytų per visą taką
      const wantUp = ups > 0 && (sides === 0 || rnd() < ups / (ups + sides));
      const pick = wantUp ? [-1, 0] : opts.filter((o) => o[0] === 0)[Math.floor(rnd() * opts.filter((o) => o[0] === 0).length)] || opts[0];
      r += pick[0];
      c += pick[1];
      if (pick[0]) {
        ups--;
        lastSide = 0;
      } else {
        sides--;
        lastSide = pick[1];
      }
      seen.add(`${r},${c}`);
      path.push([r, c]);
    }
    if (path.length === len && r === 0) return path;
  }
  // atsarginis: tiesiai aukštyn
  return Array.from({ length: rows }, (_, i) => [rows - 1 - i, 0]);
}

export function pathGame(root, { level, onHome, onFinish }) {
  const L = PATH_LEVELS[level - 1] || PATH_LEVELS[0];
  const path = makePath(L, seeded(8000 + level * 17));
  let mistakes = 0;
  let missesNow = 0; // klaidos nuo paskutinio parodymo
  let step = 1; // kiek akmenukų jau pereita (pirmasis – startas)
  let showing = true;
  let alive = true;

  const shell = brainShell(root, {
    level,
    introKey: 'path_intro',
    onHome,
    onFinish,
    tools: {
      restart() {
        if (shell.done || showing) return;
        mistakes++;
        shell.setMoves(mistakes, 'klaidos');
        step = 1;
        show();
      },
    },
  });
  shell.setMoves(0, 'klaidos');

  const grid = h('div', { class: 'path-grid', style: `--cols:${L.cols};--rows:${L.rows}` });
  const stones = [];
  for (let r = 0; r < L.rows; r++) {
    for (let c = 0; c < L.cols; c++) {
      const s = h('button', { type: 'button', class: 'path-stone', 'aria-label': `Akmenukas ${r + 1}, ${c + 1}` });
      onTap(s, () => tap(r, c, s));
      stones.push(s);
      grid.append(s);
    }
  }
  const stoneAt = (r, c) => stones[r * L.cols + c];
  // takelis (taškų linija) tarp jau parodytų / pereitų akmenukų
  const trail = document.createElementNS(NS, 'svg');
  trail.setAttribute('class', 'path-trail');
  trail.setAttribute('viewBox', `0 0 ${L.cols} ${L.rows}`);
  trail.setAttribute('preserveAspectRatio', 'none');
  const line = document.createElementNS(NS, 'polyline');
  line.setAttribute('vector-effect', 'non-scaling-stroke');
  trail.append(line);
  grid.prepend(trail);
  const setTrail = (pts) => line.setAttribute('points', pts.map(([r, c]) => `${c + 0.5},${r + 0.5}`).join(' '));
  const walker = h('img', { class: 'path-walker', src: WALKER, alt: 'Ežiukas Domas', draggable: 'false' });
  grid.append(walker);
  const board = h('div', { class: 'path-board', style: `--cols:${L.cols};--rows:${L.rows};--map:url(${IMG}map.webp);--stone:url(${IMG}stone.webp)` }, [h('img', { class: 'path-home', src: HOME, alt: 'Domo namai – tikslas', draggable: 'false' }), grid]);
  shell.board.append(h('div', { class: 'path-wrap' }, [board, shell.toolbar]));

  function putWalker(r, c) {
    walker.style.setProperty('--r', r);
    walker.style.setProperty('--c', c);
  }

  async function show() {
    showing = true;
    grid.classList.add('watch');
    stones.forEach((s) => s.classList.remove('lit', 'done', 'start'));
    const [r0, c0] = path[0];
    stoneAt(r0, c0).classList.add('start', 'done');
    putWalker(r0, c0);
    setTrail([path[0]]);
    shell.char.show('Žiūrėk, kur eina Domas!');
    await wait(700);
    for (let i = 1; i < path.length; i++) {
      if (!alive) return;
      const [r, c] = path[i];
      stoneAt(r, c).classList.add('lit');
      putWalker(r, c);
      setTrail(path.slice(0, i + 1));
      sfx('knock', i % 5);
      await wait(L.stepMs);
    }
    await wait(500);
    if (!alive) return;
    // takas pasislepia, Domas grįžta į startą
    path.slice(1).forEach(([r, c]) => stoneAt(r, c).classList.remove('lit'));
    putWalker(r0, c0);
    setTrail([path[0]]);
    grid.classList.remove('watch');
    showing = false;
    missesNow = 0;
    shell.char.show('Dabar tavo eilė!');
  }

  function tap(r, c, s) {
    if (showing || shell.done) return;
    const [er, ec] = path[step];
    if (r === er && c === ec) {
      s.classList.add('done');
      putWalker(r, c);
      setTrail(path.slice(0, step + 1));
      sfx('knock', step % 5);
      step++;
      if (step >= path.length) shell.win(starsByMistakes(mistakes), grid);
      return;
    }
    if (s.classList.contains('done')) return; // jau pereitas akmenukas – nieko
    mistakes++;
    missesNow++;
    shell.setMoves(mistakes, 'klaidos');
    sfx('wrong');
    pulse(s, 'shake');
    if (missesNow >= 3) {
      // padedam: parodom taką dar kartą, tęsiama nuo pradžios
      step = 1;
      show();
    }
  }

  show();
  return () => {
    alive = false;
    shell.destroy();
  };
}
