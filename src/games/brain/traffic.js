// Ona: „Miško eismas“ – pastumdyk rąstus, kad raudonas vežimėlis išvažiuotų pro angą dešinėje.
// Rąstai juda tik savo kryptimi (gulsti – į šonus, stati – aukštyn/žemyn), tempiant pirštu.
// Lygiai – src/config/brain/traffic.json (patikrinti sprendėju, „norma“ – mažiausias ėjimų skaičius).
import { h } from '../../ui/dom.js';
import { sfx } from '../../sfx.js';
import { onDrag } from '../../ui/drag.js';
import { TRAFFIC_LEVELS } from '../../config/brain-levels.js';
import { brainShell, starsByMoves } from './base.js';

const N = 6;
const EXIT_ROW = 2;
const CART = `${import.meta.env.BASE_URL}assets/brain/cart.webp`;

/**
 * Rąstas iš viršaus (SVG): žievė su rievėmis, šakos žymė, pjūvis su metinėmis rievėmis ir lapelis.
 * Piešiamas gulsčias (ilgis len langelių × 1), stačiam – pasukamas.
 */
function logSvg(len, vertical, seed) {
  const W = len * 100;
  const H = 100;
  const rnd = (n) => {
    const x = Math.sin(seed * 97.3 + n * 13.1) * 43758.5453;
    return x - Math.floor(x);
  };
  const y0 = 14;
  const y1 = 86;
  const streaks = [];
  for (let i = 0; i < len * 3; i++) {
    const x = 30 + rnd(i) * (W - 80);
    const y = y0 + 12 + rnd(i + 20) * (y1 - y0 - 24);
    const l = 30 + rnd(i + 40) * 40;
    streaks.push(`<path d="M${x} ${y}q${l / 2} ${(rnd(i + 60) - 0.5) * 8} ${l} 0" />`);
  }
  const kx = 40 + rnd(7) * (W - 120);
  const leafX = 30 + rnd(9) * (W - 90);
  const g = `
    <rect x="6" y="${y0 + 6}" width="${W - 12}" height="${y1 - y0}" rx="36" fill="rgba(60,35,15,.22)"/>
    <rect x="4" y="${y0}" width="${W - 10}" height="${y1 - y0}" rx="36" fill="url(#bark)" stroke="#6b4429" stroke-width="5"/>
    <g fill="none" stroke="#7c5233" stroke-width="4" stroke-linecap="round" opacity=".55">${streaks.join('')}</g>
    <ellipse cx="${kx}" cy="${y0 + 24}" rx="9" ry="6" fill="#8a5c3a" stroke="#6b4429" stroke-width="3"/>
    <ellipse cx="${W - 26}" cy="50" rx="20" ry="34" fill="#f2d7aa" stroke="#6b4429" stroke-width="5"/>
    <ellipse cx="${W - 26}" cy="50" rx="12" ry="22" fill="none" stroke="#d9b07a" stroke-width="3"/>
    <ellipse cx="${W - 26}" cy="50" rx="5" ry="9" fill="none" stroke="#d9b07a" stroke-width="3"/>
    <path d="M${leafX} ${y0 + 2}c-2-10 4-16 14-16c0 9-5 15-14 16z" fill="#7fcf6b" stroke="#3f8f3a" stroke-width="2.5"/>`;
  const defs = `<defs><linearGradient id="bark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c99566"/><stop offset=".55" stop-color="#a87148"/><stop offset="1" stop-color="#8a5a37"/></linearGradient></defs>`;
  return vertical
    ? `<svg viewBox="0 0 ${H} ${W}" preserveAspectRatio="none">${defs}<g transform="translate(${H} 0) rotate(90)">${g}</g></svg>`
    : `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${defs}${g}</svg>`;
}

export function trafficGame(root, { level, onHome, onFinish }) {
  const L = TRAFFIC_LEVELS[level - 1] || TRAFFIC_LEVELS[0];
  let cars = L.cars.map((c) => ({ ...c }));
  const history = [];
  let moves = 0;

  const shell = brainShell(root, {
    level,
    introKey: 'traffic_intro',
    onHome,
    onFinish,
    tools: {
      undo() {
        if (!history.length || shell.done) return;
        cars = history.pop();
        moves++;
        place();
      },
      restart() {
        if (shell.done) return;
        cars = L.cars.map((c) => ({ ...c }));
        history.length = 0;
        moves = 0;
        place();
      },
    },
  });

  const board = h('div', { class: 'traffic-board', style: `--n:${N}` }, [h('div', { class: 'traffic-exit', style: `--row:${EXIT_ROW}`, 'aria-hidden': 'true' })]);
  const els = cars.map((c, i) => {
    const el = h('div', {
      class: `traffic-car ${i === 0 ? 'target' : c.d === 'h' ? 'log-h' : 'log-v'}`,
      role: 'button',
      'aria-label': i === 0 ? 'Vežimėlis' : c.d === 'h' ? 'Gulsčias rąstas' : 'Status rąstas',
    });
    if (i === 0) el.append(h('img', { src: CART, alt: '', draggable: 'false' }));
    else el.insertAdjacentHTML('beforeend', logSvg(c.len, c.d === 'v', i));
    board.append(el);
    return el;
  });
  shell.board.append(h('div', { class: 'traffic-wrap' }, [board, shell.toolbar]));

  function occupied(except) {
    const g = Array.from({ length: N }, () => Array(N).fill(false));
    cars.forEach((c, i) => {
      if (i === except) return;
      for (let k = 0; k < c.len; k++) g[c.r + (c.d === 'v' ? k : 0)][c.c + (c.d === 'h' ? k : 0)] = true;
    });
    return g;
  }

  function place() {
    cars.forEach((c, i) => {
      const el = els[i];
      el.style.setProperty('--r', c.r);
      el.style.setProperty('--c', c.c);
      el.style.setProperty('--w', c.d === 'h' ? c.len : 1);
      el.style.setProperty('--h', c.d === 'v' ? c.len : 1);
    });
    shell.setMoves(moves);
    shell.setUndo(history.length > 0);
  }

  // ---------- tempimas ----------
  // Veikia ir senesniuose iPhone (žr. ui/drag.js). Paleidus rąstas sklandžiai „prilimpa“ prie artimiausio langelio
  // nuo tos vietos, kur buvo paleistas (be šuolio atgal).
  els.forEach((el, i) =>
    onDrag(el, {
      start(p) {
        if (shell.done) return false;
        const c = cars[i];
        drag = { i, start: c.d === 'h' ? p.x : p.y, delta: 0, cell: board.getBoundingClientRect().width / N, ...range(i) };
        el.classList.add('dragging');
        el.style.transition = 'none';
      },
      move(p) {
        if (!drag) return;
        const c = cars[i];
        const px = (c.d === 'h' ? p.x : p.y) - drag.start;
        // už ribos – „spyruokliuoja“ (šiek tiek pajuda), kad būtų aišku, jog toliau negalima
        const lo = drag.min * drag.cell;
        const hi = drag.max * drag.cell;
        drag.delta = px < lo ? lo + (px - lo) * 0.15 : px > hi ? hi + (px - hi) * 0.15 : px;
        el.style.transform = c.d === 'h' ? `translateX(${drag.delta}px)` : `translateY(${drag.delta}px)`;
      },
      end() {
        if (!drag) return;
        const { delta, cell, min, max } = drag;
        drag = null;
        const c = cars[i];
        el.classList.remove('dragging');
        const steps = Math.max(min, Math.min(max, Math.round(delta / cell)));
        if (steps) {
          history.push(cars.map((x) => ({ ...x })));
          if (c.d === 'h') c.c += steps;
          else c.r += steps;
          moves++;
          sfx('knock', 1);
        }
        // sklandus prilipimas: nauja vieta + likęs poslinkis, kuris nuslenka iki 0
        const rest = delta - steps * cell;
        place();
        el.style.transition = 'none';
        el.style.transform = c.d === 'h' ? `translateX(${rest}px)` : `translateY(${rest}px)`;
        void el.offsetWidth;
        el.style.transition = '';
        el.style.transform = '';
        // vežimėlis prie angos – išvažiuoja
        if (i === 0 && c.c + c.len === N) {
          setTimeout(() => el.classList.add('leaving'), 140);
          shell.win(starsByMoves(moves, L.par), el);
        }
      },
    })
  );
  let drag = null;

  /** Kiek langelių rąstas gali pajudėti atgal (min ≤ 0) ir pirmyn (max ≥ 0). */
  function range(i) {
    const c = cars[i];
    const g = occupied(i);
    let min = 0;
    let max = 0;
    if (c.d === 'h') {
      while (c.c + min - 1 >= 0 && !g[c.r][c.c + min - 1]) min--;
      while (c.c + c.len + max < N && !g[c.r][c.c + c.len + max]) max++;
    } else {
      while (c.r + min - 1 >= 0 && !g[c.r + min - 1][c.c]) min--;
      while (c.r + c.len + max < N && !g[c.r + c.len + max][c.c]) max++;
    }
    return { min, max };
  }

  place();
  return () => shell.destroy();
}
