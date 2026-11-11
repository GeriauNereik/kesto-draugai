// Ona: „Spalvų sudoku“ – kiekvienoje eilutėje, stulpelyje (ir blokelyje) kiekvienas daiktas po vieną kartą.
// Bakstelėk tuščią langelį – šalia atsiras daiktų pasirinkimas. Pasirinkus netinkamą daiktą, sumirksi langelis,
// kuriame toks daiktas jau yra (toje pačioje eilutėje, stulpelyje ar blokelyje), ir Ona paaiškina kodėl.
// Užuomina (sufleris) – tik po kelių klaidų: pasirinkime perbraukiami daiktai, kurie į tą langelį netinka.
// Lygiai – src/config/brain/sudoku.json (sprendinys vienintelis, patikrinta).
import { h, onTap } from '../../ui/dom.js';
import { pulse } from '../../ui/motion.js';
import { sfx } from '../../sfx.js';
import { SUDOKU_LEVELS } from '../../config/brain-levels.js';
import { brainShell, starsByMistakes, ITEMS, ITEM_BASE } from './base.js';

const HINT_AFTER = 3; // po tiek klaidų pasirinkime parodoma, kurie daiktai netinka

export function sudokuGame(root, { level, onHome, onFinish }) {
  const L = SUDOKU_LEVELS[level - 1] || SUDOKU_LEVELS[0];
  const { n, bh, bw } = L;
  const cells = L.puzzle.slice();
  let mistakes = 0;
  let selCell = null;
  let hintSaid = false;

  const shell = brainShell(root, { level, introKey: 'sudoku_intro', onHome, onFinish });
  shell.setMoves(0, 'klaidos');

  const img = (v) => h('img', { src: `${ITEM_BASE}${ITEMS[L.kinds[v]]}.webp`, alt: '', draggable: 'false' });
  const rc = (i) => [Math.floor(i / n), i % n];
  const block = (i) => {
    const [r, c] = rc(i);
    return bh ? `${Math.floor(r / bh)},${Math.floor(c / bw)}` : '';
  };
  /** Langeliai, kuriuose daiktas v jau yra toje pačioje eilutėje, stulpelyje ar blokelyje. */
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
    // storesnės linijos tarp blokelių
    if (bh && r % bh === 0 && r) cls.push('bt');
    if (bw && c % bw === 0 && c) cls.push('bl');
    const el = h('button', { type: 'button', class: cls.join(' '), 'aria-label': v >= 0 ? 'Užpildytas langelis' : `Tuščias langelis ${r + 1}, ${c + 1}` }, v >= 0 ? img(v) : null);
    onTap(el, () => tapCell(i));
    return el;
  });
  grid.append(...cellEls);

  // Daiktų pasirinkimas – atsiranda prie pasirinkto langelio
  const picker = h('div', { class: 'sdk-picker', role: 'dialog', 'aria-label': 'Pasirink daiktą', hidden: true });
  const pickEls = L.kinds.map((_, v) => {
    const el = h('button', { type: 'button', class: 'sdk-item', 'aria-label': ITEMS[L.kinds[v]] }, img(v));
    onTap(el, () => place(v));
    picker.append(el);
    return el;
  });
  const board = h('div', { class: 'sdk-board' }, [grid, picker]);
  shell.board.append(h('div', { class: 'sdk-wrap', style: `--n:${n}` }, board));

  function sync() {
    const [sr, sc] = selCell == null ? [-1, -1] : rc(selCell);
    cellEls.forEach((el, i) => {
      const [r, c] = rc(i);
      el.classList.toggle('sel', i === selCell);
      el.classList.toggle('line', selCell != null && i !== selCell && (r === sr || c === sc));
    });
  }

  function openPicker(i) {
    const hint = mistakes >= HINT_AFTER;
    pickEls.forEach((el, v) => {
      const no = hint && clashes(i, v).length > 0;
      el.classList.toggle('no', no);
      el.setAttribute('aria-disabled', String(no));
    });
    picker.hidden = false;
    picker.style.setProperty('--cols', n > 4 ? Math.ceil(n / 2) : n);
    // vieta: po langeliu, jei telpa, kitaip – virš jo; horizontaliai – lentos ribose
    const b = board.getBoundingClientRect();
    const c = cellEls[i].getBoundingClientRect();
    const p = picker.getBoundingClientRect();
    let top = c.bottom - b.top + 6;
    if (top + p.height > b.height + 4) top = c.top - b.top - p.height - 6;
    const left = Math.max(0, Math.min(b.width - p.width, c.left - b.left + c.width / 2 - p.width / 2));
    picker.style.top = `${Math.max(0, top)}px`;
    picker.style.left = `${left}px`;
    pulse(picker, 'bump');
  }
  function closePicker() {
    picker.hidden = true;
    selCell = null;
    sync();
  }

  function tapCell(i) {
    if (shell.done) return;
    if (cells[i] >= 0) {
      if (selCell != null) closePicker();
      return;
    }
    sfx('tap');
    if (selCell === i) return closePicker();
    selCell = i;
    sync();
    openPicker(i);
    if (mistakes >= HINT_AFTER && !hintSaid) {
      hintSaid = true;
      shell.char.show('Perbraukti daiktai čia netinka – rinkis iš kitų!');
    }
  }

  function place(v) {
    if (shell.done || selCell == null) return;
    const i = selCell;
    if (L.solution[i] === v) {
      cells[i] = v;
      const el = cellEls[i];
      el.replaceChildren(img(v));
      el.classList.add('placed');
      pulse(el, 'bounce');
      sfx('flip');
      closePicker();
      if (cells.every((x) => x >= 0)) return shell.win(starsByMistakes(mistakes), grid);
      return;
    }
    mistakes++;
    shell.setMoves(mistakes, 'klaidos');
    sfx('wrong');
    pulse(cellEls[i], 'shake');
    // parodom, kodėl netinka: kur toks daiktas jau yra
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
    if (mistakes >= HINT_AFTER) {
      // sufleris: perbraukiam netinkamus daiktus šiame langelyje
      openPicker(i);
      if (!hintSaid) {
        hintSaid = true;
        setTimeout(() => !shell.done && shell.char.show('Padėsiu: perbraukti daiktai čia netinka.'), 1500);
      }
    }
  }

  sync();
  return () => shell.destroy();
}
