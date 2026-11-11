// Ona: „Surūšiuok“ – vienodus miško daiktus sudėk į tą patį krepšelį.
// Paspaudus krepšelį viršutinis daiktas pakyla; paspaudus kitą – nusileidžia ten, jei krepšelis tuščias
// arba viršuje toks pat daiktas. Lygiai – src/config/brain/sort.json (patikrinti sprendėju).
import { h, onTap } from '../../ui/dom.js';
import { pulse } from '../../ui/motion.js';
import { sfx } from '../../sfx.js';
import { SORT_LEVELS } from '../../config/brain-levels.js';
import { brainShell, starsByMoves, ITEMS, ITEM_BASE } from './base.js';

export function sortGame(root, { level, onHome, onFinish }) {
  const L = SORT_LEVELS[level - 1] || SORT_LEVELS[0];
  const cap = L.cap;
  let tubes = L.tubes.map((t) => t.slice());
  const history = [];
  let moves = 0;
  let held = null; // krepšelio indeksas, iš kurio pakeltas daiktas

  const shell = brainShell(root, {
    level,
    introKey: 'sort_intro',
    onHome,
    onFinish,
    tools: {
      undo() {
        if (!history.length || shell.done) return;
        tubes = history.pop();
        moves++;
        held = null;
        render();
      },
      restart() {
        if (shell.done) return;
        tubes = L.tubes.map((t) => t.slice());
        history.length = 0;
        moves = 0;
        held = null;
        render();
      },
    },
  });

  // Daugiau nei 6 krepšeliai – dviem eilėmis
  const rows = tubes.length > 6 ? 2 : 1;
  const per = Math.ceil(tubes.length / rows);
  const row = h('div', { class: 'sort-row', style: `--cap:${cap};--rows:${rows};--per:${per}` });
  const tubeEls = tubes.map((_, i) => {
    const el = h('button', { type: 'button', class: 'sort-tube', 'aria-label': `Krepšelis ${i + 1}` });
    onTap(el, () => tap(i));
    return el;
  });
  row.append(...tubeEls);
  shell.board.append(h('div', { class: 'sort-wrap' }, [row, shell.toolbar]));

  const solved = () => tubes.every((t) => t.length === 0 || (t.length === cap && t.every((x) => x === t[0])));

  function render() {
    tubes.forEach((t, i) => {
      const el = tubeEls[i];
      el.replaceChildren(
        ...t.map((k, j) =>
          h('img', {
            class: `sort-item${held === i && j === t.length - 1 ? ' lifted' : ''}`,
            src: `${ITEM_BASE}${ITEMS[k]}.webp`,
            alt: '',
            draggable: 'false',
          })
        )
      );
      el.classList.toggle('selected', held === i);
      el.classList.toggle('full', t.length === cap && t.every((x) => x === t[0]));
    });
    shell.setMoves(moves);
    shell.setUndo(history.length > 0);
  }

  function tap(i) {
    if (shell.done) return;
    if (held === null) {
      if (!tubes[i].length) return;
      held = i;
      sfx('tap');
      render();
      return;
    }
    if (held === i) {
      held = null;
      render();
      return;
    }
    const from = tubes[held];
    const to = tubes[i];
    const item = from[from.length - 1];
    if (to.length >= cap || (to.length && to[to.length - 1] !== item)) {
      // negalima – švelniai sudreba, daiktas lieka pakeltas
      sfx('wrong');
      pulse(tubeEls[i], 'shake');
      return;
    }
    history.push(tubes.map((t) => t.slice()));
    to.push(from.pop());
    moves++;
    held = null;
    sfx('flip');
    render();
    if (solved()) shell.win(starsByMoves(moves, L.par), row);
  }

  render();
  return () => shell.destroy();
}
