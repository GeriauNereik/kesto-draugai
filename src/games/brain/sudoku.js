// Ona: „Spalvų sudoku“ – kiekvienoje eilutėje, stulpelyje (ir blokelyje) kiekvienas daiktas po vieną kartą.
// Pasirink tuščią langelį ir daiktą (arba atvirkščiai). Netinkamas daiktas nepadedamas – langelis sudreba.
// Lygiai – src/config/brain/sudoku.json (sprendinys vienintelis, patikrinta).
import { h, onTap } from '../../ui/dom.js';
import { pulse } from '../../ui/motion.js';
import { sfx } from '../../sfx.js';
import { burst } from '../../ui/fx.js';
import { SUDOKU_LEVELS } from '../../config/brain-levels.js';
import { brainShell, starsByMistakes, ITEMS, ITEM_BASE } from './base.js';

export function sudokuGame(root, { level, onHome, onFinish }) {
  const L = SUDOKU_LEVELS[level - 1] || SUDOKU_LEVELS[0];
  const { n, bh, bw } = L;
  const cells = L.puzzle.slice();
  let mistakes = 0;
  let selCell = null;
  let selItem = null;

  const shell = brainShell(root, { level, introKey: 'sudoku_intro', onHome, onFinish });
  shell.setMoves(0, 'klaidos');

  const img = (v) => h('img', { src: `${ITEM_BASE}${ITEMS[L.kinds[v]]}.webp`, alt: '', draggable: 'false' });

  const grid = h('div', { class: 'sdk-grid', style: `--n:${n}` });
  const cellEls = cells.map((v, i) => {
    const r = Math.floor(i / n);
    const c = i % n;
    const cls = ['sdk-cell'];
    if (v >= 0) cls.push('given');
    // storesnės linijos tarp blokelių
    if (bh && r % bh === 0 && r) cls.push('bt');
    if (bw && c % bw === 0 && c) cls.push('bl');
    const el = h('button', { type: 'button', class: cls.join(' '), 'aria-label': v >= 0 ? 'Užpildytas langelis' : `Tuščias langelis ${r + 1}, ${c + 1}` }, v >= 0 ? img(v) : null);
    if (v < 0) onTap(el, () => tapCell(i));
    return el;
  });
  grid.append(...cellEls);

  const palette = h('div', { class: 'sdk-palette' });
  const itemEls = L.kinds.map((_, v) => {
    const el = h('button', { type: 'button', class: 'sdk-item', 'aria-label': ITEMS[L.kinds[v]] }, img(v));
    onTap(el, () => tapItem(v));
    palette.append(el);
    return el;
  });
  shell.board.append(h('div', { class: 'sdk-wrap', style: `--n:${n}` }, [grid, palette]));

  function sync() {
    cellEls.forEach((el, i) => el.classList.toggle('sel', i === selCell));
    itemEls.forEach((el, v) => {
      el.classList.toggle('sel', v === selItem);
      // daiktas, kurio visi n jau padėti – pritemdomas
      el.classList.toggle('done', cells.filter((x) => x === v).length === n);
    });
  }

  function tryPlace() {
    if (selCell == null || selItem == null) return sync();
    const i = selCell;
    const v = selItem;
    if (L.solution[i] === v) {
      cells[i] = v;
      const el = cellEls[i];
      el.replaceChildren(img(v));
      el.classList.add('placed');
      el.disabled = true;
      pulse(el, 'bounce');
      sfx('flip');
      // Po kiekvieno bandymo pasirinkimas išvalomas – kitas paspaudimas pradeda iš naujo (mažiau painu)
      selCell = null;
      selItem = null;
      if (cells.every((x) => x >= 0)) {
        sync();
        return shell.win(starsByMistakes(mistakes), grid);
      }
    } else {
      mistakes++;
      shell.setMoves(mistakes, 'klaidos');
      sfx('wrong');
      pulse(cellEls[i], 'shake');
      selCell = null;
      selItem = null;
    }
    sync();
  }

  function tapCell(i) {
    if (shell.done || cells[i] >= 0) return;
    selCell = selCell === i ? null : i;
    sfx('tap');
    tryPlace();
  }
  function tapItem(v) {
    if (shell.done) return;
    selItem = selItem === v ? null : v;
    sfx('tap');
    tryPlace();
  }

  sync();
  return () => shell.destroy();
}
