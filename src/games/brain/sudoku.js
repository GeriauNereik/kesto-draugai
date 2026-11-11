// Ona: „Miško sudoku“ – kiekvienoje eilutėje, stulpelyje (ir kvadratėlyje) kiekvienas daiktas po vieną kartą.
// Daiktai – apačioje. Įdėti galima dviem būdais:
//  • nutempti daiktą pirštu į tuščią langelį (veikia ir senesniuose iPhone – žr. ui/drag.js);
//  • bakstelėti daiktą, tada langelį (arba atvirkščiai).
// Netinkamas daiktas nepadedamas: sumirksi langelis, kuriame toks daiktas jau yra, Ona paaiškina kodėl.
// Užuomina (sufleris) – tik po kelių klaidų: pasirinkus langelį, netinkami daiktai apačioje perbraukiami.
// Pirmuose lygiuose ranka parodo, kaip nutempti. Lygiai – src/config/brain/sudoku.json (sprendinys vienintelis).
import { h, onTap, wait } from '../../ui/dom.js';
import { pulse } from '../../ui/motion.js';
import { sfx } from '../../sfx.js';
import { onDrag } from '../../ui/drag.js';
import { SUDOKU_LEVELS } from '../../config/brain-levels.js';
import { brainShell, starsByMistakes, ITEMS, ITEM_BASE } from './base.js';

const HINT_AFTER = 3; // po tiek klaidų – sufleris
const DEMO_UNTIL = 2; // tiek pirmųjų lygių ranka parodo tempimą
const DRAG_PX = 8;

export function sudokuGame(root, { level, onHome, onFinish }) {
  const L = SUDOKU_LEVELS[level - 1] || SUDOKU_LEVELS[0];
  const { n, bh, bw } = L;
  const cells = L.puzzle.slice();
  let mistakes = 0;
  let selCell = null;
  let selItem = null;
  let hintSaid = false;
  let alive = true;
  let touched = false;
  let demoTimer = null;

  const shell = brainShell(root, { level, introKey: 'sudoku_intro', onHome, onFinish });
  shell.setMoves(0, 'klaidos');

  const src = (v) => `${ITEM_BASE}${ITEMS[L.kinds[v]]}.webp`;
  const img = (v) => h('img', { src: src(v), alt: '', draggable: 'false' });
  const rc = (i) => [Math.floor(i / n), i % n];
  const block = (i) => {
    const [r, c] = rc(i);
    return bh ? `${Math.floor(r / bh)},${Math.floor(c / bw)}` : '';
  };
  /** Langeliai, kuriuose daiktas v jau yra toje pačioje eilutėje, stulpelyje ar kvadratėlyje. */
  function clashes(i, v) {
    const [r, c] = rc(i);
    const out = [];
    cells.forEach((x, j) => {
      if (x !== v || j === i) return;
      const [r2, c2] = rc(j);
      if (r2 === r || c2 === c || (bh && block(j) === block(i))) out.push(j);
    });
    return out;
  }

  const grid = h('div', { class: 'sdk-grid', style: `--n:${n}` });
  const cellEls = cells.map((v, i) => {
    const [r, c] = rc(i);
    const cls = ['sdk-cell'];
    if (v >= 0) cls.push('given');
    if (bh && r % bh === 0 && r) cls.push('bt');
    if (bw && c % bw === 0 && c) cls.push('bl');
    const el = h('button', { type: 'button', class: cls.join(' '), 'aria-label': v >= 0 ? 'Užpildytas langelis' : `Tuščias langelis ${r + 1}, ${c + 1}` }, v >= 0 ? img(v) : null);
    onTap(el, () => tapCell(i));
    return el;
  });
  grid.append(...cellEls);

  const palette = h('div', { class: 'sdk-palette' });
  const itemEls = L.kinds.map((_, v) => {
    const el = h('button', { type: 'button', class: 'sdk-item', 'aria-label': ITEMS[L.kinds[v]] }, img(v));
    onDrag(el, { start: (p) => dragStart(p, v), move: (p) => dragMove(p, v), end: (p) => dragEnd(p, v) });
    palette.append(el);
    return el;
  });
  const handItem = h('img', { class: 'sdk-hand-item', alt: '', draggable: 'false' });
  const hand = h('div', { class: 'sort-hand sdk-hand', 'aria-hidden': 'true', html: HAND });
  hand.prepend(handItem);
  const wrap = h('div', { class: 'sdk-wrap', style: `--n:${n}` }, [grid, palette, hand]);
  shell.board.append(wrap);

  function sync() {
    const [sr, sc] = selCell == null ? [-1, -1] : rc(selCell);
    cellEls.forEach((el, i) => {
      const [r, c] = rc(i);
      el.classList.toggle('sel', i === selCell);
      el.classList.toggle('line', selCell != null && i !== selCell && (r === sr || c === sc));
      el.classList.toggle('target', selItem != null && cells[i] < 0);
    });
    const hint = mistakes >= HINT_AFTER && selCell != null;
    itemEls.forEach((el, v) => {
      el.classList.toggle('sel', v === selItem);
      // daiktas, kurio visi n jau padėti – pritemdomas
      el.classList.toggle('done', cells.filter((x) => x === v).length === n);
      el.classList.toggle('no', hint && clashes(selCell, v).length > 0);
    });
  }

  /** Bandymas padėti daiktą v į langelį i. */
  function place(i, v) {
    if (shell.done || cells[i] >= 0) return;
    if (L.solution[i] === v) {
      cells[i] = v;
      const el = cellEls[i];
      el.replaceChildren(img(v));
      el.classList.add('placed');
      pulse(el, 'bounce');
      sfx('flip');
      selCell = null;
      selItem = null;
      sync();
      if (cells.every((x) => x >= 0)) shell.win(starsByMistakes(mistakes), grid);
      return;
    }
    mistakes++;
    shell.setMoves(mistakes, 'klaidos');
    sfx('wrong');
    pulse(cellEls[i], 'shake');
    const cl = clashes(i, v);
    if (cl.length) {
      const [r, c] = rc(i);
      const [r2, c2] = rc(cl[0]);
      cl.forEach((j) => {
        cellEls[j].classList.remove('clash');
        void cellEls[j].offsetWidth;
        cellEls[j].classList.add('clash');
        setTimeout(() => cellEls[j].classList.remove('clash'), 1400);
      });
      shell.char.show(r2 === r ? 'Šioje eilutėje toks daiktas jau yra!' : c2 === c ? 'Šiame stulpelyje toks daiktas jau yra!' : 'Šiame kvadratėlyje toks daiktas jau yra!');
    } else {
      shell.char.show('Pagalvok dar – čia tinka kitas daiktas.');
    }
    // po klaidos pasirinkimas išvalomas (kitas bandymas – nuo pradžios); sufleris matosi pasirinkus langelį
    selCell = null;
    selItem = null;
    sync();
    if (mistakes >= HINT_AFTER && !hintSaid) {
      hintSaid = true;
      setTimeout(() => alive && !shell.done && shell.char.show('Padėsiu: bakstelėk langelį – netinkami daiktai bus perbraukti.'), 1500);
    }
  }

  function tapCell(i) {
    if (shell.done) return;
    stopDemo();
    if (cells[i] >= 0) return;
    sfx('tap');
    if (selItem != null) return place(i, selItem);
    selCell = selCell === i ? null : i;
    sync();
  }
  function tapItem(v) {
    if (shell.done) return;
    sfx('tap');
    if (selCell != null) return place(selCell, v);
    selItem = selItem === v ? null : v;
    sync();
    if (selItem != null && !hintSaid && mistakes === 0 && level <= DEMO_UNTIL) shell.char.show('Dabar bakstelėk tuščią langelį!');
  }

  // ---------- tempimas iš apačios į langelį ----------
  let drag = null;
  function dragStart(p, v) {
    if (shell.done) return false;
    stopDemo();
    drag = { v, at: p, ghost: null, over: -1 };
    return true;
  }
  function dragMove(p, v) {
    if (!drag) return;
    if (!drag.ghost && Math.hypot(p.x - drag.at.x, p.y - drag.at.y) < DRAG_PX) return;
    if (!drag.ghost) {
      const r = itemEls[v].getBoundingClientRect();
      drag.ghost = h('img', { class: 'sort-ghost', src: src(v), alt: '', style: `width:${r.width}px;height:${r.height}px` });
      document.body.append(drag.ghost);
      itemEls[v].classList.add('dragging');
    }
    drag.ghost.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -75%)`;
    const over = cellAt(p.x, p.y - 20);
    if (over !== drag.over) {
      if (drag.over >= 0) cellEls[drag.over].classList.remove('over');
      if (over >= 0 && cells[over] < 0) cellEls[over].classList.add('over');
      drag.over = over;
    }
  }
  function dragEnd(p, v) {
    if (!drag) return;
    const { ghost, over } = drag;
    drag = null;
    itemEls[v].classList.remove('dragging');
    if (over >= 0) cellEls[over].classList.remove('over');
    if (!ghost) return tapItem(v); // nepajudėjo – bakstelėjimas
    ghost.remove();
    if (over >= 0 && cells[over] < 0) place(over, v);
  }
  function cellAt(x, y) {
    return cellEls.findIndex((el) => {
      const r = el.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    });
  }

  // ---------- parodomasis tempimas (pirmieji lygiai) ----------
  function stopDemo() {
    touched = true;
    clearTimeout(demoTimer);
    hand.classList.remove('show', 'press');
  }
  async function demo() {
    if (!alive || touched || shell.done) return;
    const i = cells.findIndex((x) => x < 0);
    if (i < 0) return;
    const w = wrap.getBoundingClientRect();
    const at = (el) => {
      const r = el.getBoundingClientRect();
      return `translate(${r.left + r.width / 2 - w.left}px, ${r.top + r.height / 2 - w.top}px)`;
    };
    handItem.src = src(L.solution[i]);
    hand.style.transition = 'none';
    hand.style.transform = at(itemEls[L.solution[i]]);
    hand.classList.add('show');
    await wait(500);
    if (touched) return;
    hand.classList.add('press');
    await wait(300);
    hand.style.transition = '';
    hand.style.transform = at(cellEls[i]);
    await wait(950);
    if (touched) return;
    hand.classList.remove('press');
    await wait(500);
    hand.classList.remove('show');
    if (alive && !touched) demoTimer = setTimeout(demo, 3500);
  }

  sync();
  if (level <= DEMO_UNTIL) demoTimer = setTimeout(demo, 1800);
  return () => {
    alive = false;
    clearTimeout(demoTimer);
    document.querySelectorAll('.sort-ghost').forEach((g) => g.remove());
    shell.destroy();
  };
}

const HAND = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M26 6c3 0 5 2 5 5v17l2-1c2-1 5 0 6 2l1 2 2-1c2-1 5 0 6 2l1 2 1-.5c2-1 5 0 6 3l2 9c1 6-1 11-5 15l-3 3H31L19 46c-2-2-1-5 1-6 2-1 4-1 6 1l1 1V11c0-3 2-5 5-5z" fill="#fff" stroke="#5a3825" stroke-width="3" stroke-linejoin="round"/></svg>`;
