// Ona: „Surūšiuok“ – vienodus miško daiktus sudėk į tą patį krepšelį.
// Du būdai: (1) nutempti viršutinį daiktą pirštu į kitą krepšelį arba (2) bakstelėti krepšelį (daiktas pakyla)
// ir bakstelėti kitą. Kai daiktas pakeltas, krepšeliai, į kuriuos jį galima dėti, sužaliuoja.
// Pirmuose lygiuose ranka parodo pirmą ėjimą. Lygiai – src/config/brain/sort.json (patikrinti sprendėju).
import { h, wait } from '../../ui/dom.js';
import { pulse } from '../../ui/motion.js';
import { sfx } from '../../sfx.js';
import { SORT_LEVELS } from '../../config/brain-levels.js';
import { brainShell, starsByMoves, ITEMS, ITEM_BASE } from './base.js';

const DEMO_UNTIL = 2; // tiek pirmųjų lygių ranka parodo, kaip žaisti
const DRAG_PX = 10; // nuo kiek pikselių paspaudimas tampa tempimu

export function sortGame(root, { level, onHome, onFinish }) {
  const L = SORT_LEVELS[level - 1] || SORT_LEVELS[0];
  const cap = L.cap;
  let tubes = L.tubes.map((t) => t.slice());
  const history = [];
  let moves = 0;
  let held = null; // krepšelio indeksas, iš kurio pakeltas daiktas
  let alive = true;
  let demoTimer = null;

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
    el.addEventListener('pointerdown', (e) => press(e, i));
    return el;
  });
  row.append(...tubeEls);
  const hand = h('div', { class: 'sort-hand', 'aria-hidden': 'true', html: HAND });
  const stage = h('div', { class: 'sort-stage' }, [row, hand]);
  shell.board.append(h('div', { class: 'sort-wrap' }, [stage, shell.toolbar]));

  const top = (i) => tubes[i][tubes[i].length - 1];
  const canDrop = (from, to) => from !== to && tubes[from].length > 0 && tubes[to].length < cap && (!tubes[to].length || top(to) === top(from));
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
      // pakėlus daiktą: kur galima dėti – žalia, kur ne – pritemdyta
      el.classList.toggle('can', held !== null && canDrop(held, i));
      el.classList.toggle('cannot', held !== null && held !== i && !canDrop(held, i));
    });
    shell.setMoves(moves);
    shell.setUndo(history.length > 0);
  }

  function move(from, to) {
    history.push(tubes.map((t) => t.slice()));
    tubes[to].push(tubes[from].pop());
    moves++;
    held = null;
    sfx('flip');
    render();
    const placed = tubeEls[to].lastElementChild;
    if (placed) pulse(placed, 'bounce');
    if (solved()) shell.win(starsByMoves(moves, L.par), row);
  }

  function refuse(i) {
    sfx('wrong');
    pulse(tubeEls[i], 'shake');
  }

  // ---------- bakstelėjimas ir tempimas ----------
  function press(e, i) {
    if (shell.done) return;
    stopDemo();
    e.preventDefault();
    const sx = e.clientX;
    const sy = e.clientY;
    let ghost = null;

    // kitame krepšelyje jau pakeltas daiktas – šis paspaudimas reiškia „dėk čia“
    if (held !== null && held !== i) {
      if (canDrop(held, i)) move(held, i);
      else refuse(i);
      return;
    }
    if (held === i) {
      held = null;
      render();
      return;
    }
    if (!tubes[i].length) return;
    held = i;
    sfx('tap');
    render();

    const onMove = (ev) => {
      if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) < DRAG_PX) return;
      if (!ghost) {
        const src = tubeEls[i].lastElementChild;
        const r = src.getBoundingClientRect();
        ghost = h('img', { class: 'sort-ghost', src: src.src, alt: '', style: `width:${r.width}px;height:${r.height}px` });
        document.body.append(ghost);
        src.style.visibility = 'hidden';
      }
      ghost.style.transform = `translate(${ev.clientX}px, ${ev.clientY}px) translate(-50%, -60%)`;
      const over = tubeAt(ev.clientX, ev.clientY);
      tubeEls.forEach((t, j) => t.classList.toggle('over', j === over && canDrop(i, j)));
    };
    const onUp = (ev) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      tubeEls.forEach((t) => t.classList.remove('over'));
      if (!ghost) return; // buvo bakstelėjimas – daiktas lieka pakeltas
      ghost.remove();
      const to = tubeAt(ev.clientX, ev.clientY);
      if (to !== -1 && canDrop(i, to)) move(i, to);
      else {
        if (to !== -1 && to !== i) refuse(to);
        held = null;
        render();
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  function tubeAt(x, y) {
    return tubeEls.findIndex((t) => {
      const r = t.getBoundingClientRect();
      return x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 60 && y <= r.bottom + 8;
    });
  }

  // ---------- parodomasis ėjimas (pirmieji lygiai) ----------
  function firstMove() {
    // pirmiausia – ant tokio pat daikto, kitaip – į tuščią krepšelį
    for (let a = 0; a < tubes.length; a++) for (let b = 0; b < tubes.length; b++) if (tubes[b].length && canDrop(a, b)) return [a, b];
    for (let a = 0; a < tubes.length; a++) for (let b = 0; b < tubes.length; b++) if (canDrop(a, b)) return [a, b];
    return null;
  }
  function stopDemo() {
    clearTimeout(demoTimer);
    demoTimer = null;
    hand.classList.remove('show', 'press');
  }
  async function demo() {
    const m = firstMove();
    if (!m || !alive || shell.done) return;
    const s = stage.getBoundingClientRect();
    const at = (i) => {
      const r = tubeEls[i].getBoundingClientRect();
      return `translate(${r.left + r.width / 2 - s.left}px, ${r.top + r.height * 0.3 - s.top}px)`;
    };
    hand.style.transition = 'none';
    hand.style.transform = at(m[0]);
    hand.classList.add('show');
    await wait(600);
    if (!hand.classList.contains('show')) return;
    hand.classList.add('press');
    await wait(350);
    hand.classList.remove('press');
    hand.style.transition = '';
    hand.style.transform = at(m[1]);
    await wait(900);
    if (!hand.classList.contains('show')) return;
    hand.classList.add('press');
    await wait(350);
    hand.classList.remove('press');
    await wait(500);
    hand.classList.remove('show');
    if (alive) demoTimer = setTimeout(demo, 4000);
  }

  render();
  if (level <= DEMO_UNTIL) demoTimer = setTimeout(demo, 1800);
  return () => {
    alive = false;
    stopDemo();
    document.querySelectorAll('.sort-ghost').forEach((g) => g.remove());
    shell.destroy();
  };
}

const HAND = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M26 6c3 0 5 2 5 5v17l2-1c2-1 5 0 6 2l1 2 2-1c2-1 5 0 6 2l1 2 1-.5c2-1 5 0 6 3l2 9c1 6-1 11-5 15l-3 3H31L19 46c-2-2-1-5 1-6 2-1 4-1 6 1l1 1V11c0-3 2-5 5-5z" fill="#fff" stroke="#5a3825" stroke-width="3" stroke-linejoin="round"/></svg>`;
