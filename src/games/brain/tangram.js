// Ona: „Tangramas“ – sudėk figūrą iš detalių. Detalės tempiamos ant silueto; teisingai padėta detalė prilimpa.
// 1–3 lygiai: detalės jau tinkamai pasuktos (tik nutempti). Nuo 4 lygio – bakstelėjus detalė pasisuka 90°.
// 1–5 lygiai: siluete matyti detalių kontūrai (užuominos); vėliau – tik siluetas.
// Po kelių nesėkmingų bandymų (HINT_AFTER) siluete nupiešiami trūkstamų detalių kontūrai – detalių spalvomis.
// Figūros – src/config/tangram-shapes.js (patikrintos: nepersidengia, vientisos).
import { h } from '../../ui/dom.js';
import { sfx } from '../../sfx.js';
import { pulse } from '../../ui/motion.js';
import { TANGRAM_LEVELS } from '../../config/brain-levels.js';
import { brainShell, seeded } from './base.js';

const NS = 'http://www.w3.org/2000/svg';
const COLORS = ['#4cb963', '#3fa9f5', '#ffc531', '#ff7a68', '#a970ff', '#ff9f43', '#2ec4b6'];
const ROTATE_FROM = 4;
const HINTS_UNTIL = 5;
const SNAP = 0.9; // gardelės vienetais
const HINT_AFTER = 5; // po tiek nesėkmingų bandymų parodomi trūkstamų detalių kontūrai

const centroid = (pts) => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
const rot90 = ([x, y], k) => {
  for (let i = 0; i < ((k % 4) + 4) % 4; i++) [x, y] = [-y, x];
  return [x, y];
};
const key = (pts) => pts.map(([x, y]) => `${Math.round(x * 1000)},${Math.round(y * 1000)}`).sort().join('|');
const el = (tag, attrs) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
};

export function tangramGame(root, { level, onHome, onFinish }) {
  const F = TANGRAM_LEVELS[level - 1] || TANGRAM_LEVELS[0];
  const rnd = seeded(7000 + level * 31);
  const canRotate = level >= ROTATE_FROM;
  let wrong = 0;
  let missesSinceHint = 0;

  const shell = brainShell(root, { level, introKey: 'tangram_intro', onHome, onFinish });
  shell.setMoves(null);
  shell.char.show(`Sudėk: ${F.name}!`);

  // ---------- figūros vietos (lizdai) ----------
  const slots = F.pieces.map((p) => {
    const c = centroid(p.pts);
    return { type: p.type, pts: p.pts, c, shape: key(p.pts.map(([x, y]) => [x - c[0], y - c[1]])), filled: false };
  });
  const all = F.pieces.flatMap((p) => p.pts);
  const fx0 = Math.min(...all.map((p) => p[0]));
  const fx1 = Math.max(...all.map((p) => p[0]));
  const fy0 = Math.min(...all.map((p) => p[1]));
  const fy1 = Math.max(...all.map((p) => p[1]));

  // Gulsčiame ekrane padėklas – dešinėje nuo figūros, stačiame – po ja.
  const box = shell.board.getBoundingClientRect();
  const wide = box.height > 0 && box.width > box.height * 1.25;

  // ---------- detalės (pradžioje – padėkle) ----------
  const pieces = F.pieces.map((p, i) => {
    const c = centroid(p.pts);
    const base = p.pts.map(([x, y]) => [x - c[0], y - c[1]]);
    return { type: p.type, base, rot: canRotate ? Math.floor(rnd() * 4) : 0, pos: [0, 0], locked: false, color: COLORS[i % COLORS.length] };
  });
  // sumaišom tvarką padėkle
  const order = pieces.map((_, i) => i).sort(() => rnd() - 0.5);
  const pad = 1;
  const figW = fx1 - fx0;
  const figH = fy1 - fy0;
  const trayW = wide ? Math.max(figH * 1.1, 6) : Math.max(figW + 2, 8);
  let tx = wide ? fx1 + 2.2 : fx0 - (trayW - figW) / 2;
  let ty = wide ? fy0 : fy1 + 2.2;
  let rowH = 0;
  const trayX0 = tx;
  for (const i of order) {
    const pts = pieces[i].base.map((p) => rot90(p, pieces[i].rot));
    const w = Math.max(...pts.map((p) => p[0])) - Math.min(...pts.map((p) => p[0]));
    const hh = Math.max(...pts.map((p) => p[1])) - Math.min(...pts.map((p) => p[1]));
    if (tx + w > trayX0 + trayW && tx > trayX0) {
      tx = trayX0;
      ty += rowH + 0.8;
      rowH = 0;
    }
    // detalės kairysis kraštas – ties tx, viršus – ties ty
    pieces[i].pos = [tx - Math.min(...pts.map((p) => p[0])), ty - Math.min(...pts.map((p) => p[1]))];
    pieces[i].home = pieces[i].pos.slice();
    tx += w + 0.8;
    rowH = Math.max(rowH, hh);
  }
  const vx0 = Math.min(fx0, trayX0) - pad;
  const vx1 = Math.max(fx1, trayX0 + trayW) + pad;
  const vy0 = fy0 - pad;
  const vy1 = Math.max(fy1, ty + rowH) + pad;

  // ---------- SVG ----------
  const svg = el('svg', { class: 'tg-svg', viewBox: `${vx0} ${vy0} ${vx1 - vx0} ${vy1 - vy0}`, role: 'img', 'aria-label': `Figūra: ${F.name}` });
  const ptsAttr = (pts) => pts.map(([x, y]) => `${x},${y}`).join(' ');
  // siluetas
  slots.forEach((s) => svg.append(el('polygon', { points: ptsAttr(s.pts), class: 'tg-shadow' })));
  slots.forEach((s) => {
    s.hintEl = el('polygon', { points: ptsAttr(s.pts), class: 'tg-hint' });
    if (level > HINTS_UNTIL) s.hintEl.style.display = 'none';
    svg.append(s.hintEl);
  });
  svg.append(
    el(
      'line',
      wide
        ? { x1: fx1 + 1.1, x2: fx1 + 1.1, y1: vy0 + 0.3, y2: vy1 - 0.3, class: 'tg-tray-line' }
        : { x1: vx0 + 0.3, x2: vx1 - 0.3, y1: fy1 + 1.1, y2: fy1 + 1.1, class: 'tg-tray-line' }
    )
  );
  pieces.forEach((p) => {
    p.el = el('polygon', { class: 'tg-piece', fill: p.color });
    p.el.addEventListener('pointerdown', (e) => startDrag(e, p));
    svg.append(p.el);
  });
  shell.board.append(h('div', { class: 'tg-wrap' }, svg));

  const current = (p) => p.base.map((q) => rot90(q, p.rot));
  function draw(p) {
    p.el.setAttribute('points', ptsAttr(current(p).map(([x, y]) => [x + p.pos[0], y + p.pos[1]])));
    p.el.classList.toggle('locked', p.locked);
  }
  pieces.forEach(draw);

  /** Užuomina: trūkstamų vietų kontūrai tos detalės spalva, kuri ten tinka. */
  function showHint() {
    const used = new Set();
    slots.forEach((s) => {
      if (s.filled) return;
      const p = pieces.find((q, i) => !q.locked && !used.has(i) && q.type === s.type && [0, 1, 2, 3].some((r) => key(q.base.map((b) => rot90(b, r))) === s.shape));
      if (p) used.add(pieces.indexOf(p));
      s.hintEl.style.display = '';
      s.hintEl.classList.add('strong');
      if (p) s.hintEl.style.stroke = p.color;
    });
    shell.char.show('Žiūrėk – spalvoti kontūrai rodo, kur kuri detalė!');
  }

  const toSvg = (e) => {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const r = pt.matrixTransform(svg.getScreenCTM().inverse());
    return [r.x, r.y];
  };

  function startDrag(e, p) {
    if (p.locked || shell.done) return;
    e.preventDefault();
    const start = toSvg(e);
    const from = p.pos.slice();
    let moved = false;
    svg.append(p.el); // tempiama detalė – viršuje
    p.el.classList.add('dragging');
    try {
      p.el.setPointerCapture?.(e.pointerId);
    } catch {
      /* be užfiksavimo */
    }
    const move = (ev) => {
      const q = toSvg(ev);
      if (Math.hypot(q[0] - start[0], q[1] - start[1]) > 0.15) moved = true;
      p.pos = [from[0] + q[0] - start[0], from[1] + q[1] - start[1]];
      draw(p);
    };
    const up = () => {
      p.el.removeEventListener('pointermove', move);
      p.el.removeEventListener('pointerup', up);
      p.el.removeEventListener('pointercancel', up);
      p.el.classList.remove('dragging');
      if (!moved) {
        // bakstelėjimas – pasukti
        if (canRotate) {
          p.pos = from;
          p.rot = (p.rot + 1) % 4;
          sfx('flip');
          draw(p);
        }
        return;
      }
      drop(p);
    };
    p.el.addEventListener('pointermove', move);
    p.el.addEventListener('pointerup', up);
    p.el.addEventListener('pointercancel', up);
  }

  function drop(p) {
    const shape = key(current(p));
    const slot = slots
      .filter((s) => !s.filled && s.type === p.type && s.shape === shape)
      .map((s) => ({ s, d: Math.hypot(s.c[0] - p.pos[0], s.c[1] - p.pos[1]) }))
      .sort((a, b) => a.d - b.d)[0];
    if (slot && slot.d < SNAP) {
      slot.s.filled = true;
      p.pos = slot.s.c.slice();
      p.locked = true;
      draw(p);
      sfx('correct');
      if (slots.every((s) => s.filled)) {
        svg.classList.add('done');
        shell.win(wrong <= 1 ? 3 : wrong <= 4 ? 2 : 1, svg);
      }
      return;
    }
    // padėta ne į vietą: jei ant figūros – klaida; detalė grįžta į padėklą
    const onFigure = p.pos[0] > fx0 - 0.5 && p.pos[0] < fx1 + 0.5 && p.pos[1] > fy0 - 0.5 && p.pos[1] < fy1 + 0.5;
    if (onFigure) {
      wrong++;
      missesSinceHint++;
      sfx('wrong');
      if (missesSinceHint >= HINT_AFTER) {
        missesSinceHint = 0;
        showHint();
      }
      // jei forma tinka, bet pasukta ne taip – užuomina: veikėjas pasako
      if (canRotate && slots.some((s) => !s.filled && s.type === p.type && s.shape !== shape)) shell.char.show('Bakstelėk detalę, kad ji pasisuktų!');
    }
    p.pos = p.home.slice();
    draw(p);
    pulse(p.el, 'shake');
  }

  return () => shell.destroy();
}
