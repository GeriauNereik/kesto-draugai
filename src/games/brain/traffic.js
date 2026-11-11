// Ona: „Miško eismas“ – pastumdyk rąstus, kad raudonas vežimėlis išvažiuotų pro angą dešinėje.
// Rąstai juda tik savo kryptimi (gulsti – į šonus, stati – aukštyn/žemyn), tempiant pirštu.
// Lygiai – src/config/brain/traffic.json (patikrinti sprendėju, „norma“ – mažiausias ėjimų skaičius).
import { h } from '../../ui/dom.js';
import { sfx } from '../../sfx.js';
import { TRAFFIC_LEVELS } from '../../config/brain-levels.js';
import { brainShell, starsByMoves } from './base.js';

const N = 6;
const EXIT_ROW = 2;
const CART = `${import.meta.env.BASE_URL}assets/brain/cart.webp`;

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
    if (i === 0) el.append(h('img', { src: CART, alt: '', draggable: 'false', onerror: (e) => e.target.remove() }));
    el.addEventListener('pointerdown', (e) => startDrag(e, i));
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
      el.style.transform = '';
    });
    shell.setMoves(moves);
    shell.setUndo(history.length > 0);
  }

  // ---------- tempimas ----------
  function startDrag(e, i) {
    if (shell.done) return;
    e.preventDefault();
    const c = cars[i];
    const el = els[i];
    const cell = board.getBoundingClientRect().width / N;
    const g = occupied(i);
    // kiek langelių galima pajudėti atgal ir pirmyn
    let min = 0;
    let max = 0;
    if (c.d === 'h') {
      while (c.c + min - 1 >= 0 && !g[c.r][c.c + min - 1]) min--;
      while (c.c + c.len + max < N && !g[c.r][c.c + c.len + max]) max++;
    } else {
      while (c.r + min - 1 >= 0 && !g[c.r + min - 1][c.c]) min--;
      while (c.r + c.len + max < N && !g[c.r + c.len + max][c.c]) max++;
    }
    const start = c.d === 'h' ? e.clientX : e.clientY;
    let delta = 0;
    el.classList.add('dragging');
    try {
      el.setPointerCapture?.(e.pointerId); // kad tempimas nenutrūktų išvažiavus pirštu už rąsto
    } catch {
      /* rodyklė jau nebeaktyvi – tempiam ir be jos */
    }
    const move = (ev) => {
      const px = (c.d === 'h' ? ev.clientX : ev.clientY) - start;
      delta = Math.max(min * cell, Math.min(max * cell, px));
      el.style.transform = c.d === 'h' ? `translateX(${delta}px)` : `translateY(${delta}px)`;
    };
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.classList.remove('dragging');
      const steps = Math.round(delta / cell);
      if (steps) {
        history.push(cars.map((x) => ({ ...x })));
        if (c.d === 'h') c.c += steps;
        else c.r += steps;
        moves++;
        sfx('knock', 1);
      }
      place();
      // vežimėlis prie angos – išvažiuoja
      if (i === 0 && c.c + c.len === N) {
        el.classList.add('leaving');
        shell.win(starsByMoves(moves, L.par), el);
      }
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  place();
  return () => shell.destroy();
}
