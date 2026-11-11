// Ona: „Surūšiuok“ – kiekvienoje stiklainėje turi likti tik vienodi daiktai.
// Aiškumui:
//  • viršuje – tikslas: kokias rūšis reikia surinkti (užsidega, kai stiklainis surinktas);
//  • stiklainyje matyti tuščios vietos (kiek telpa), viršutinis daiktas – paryškintas (tik jį galima kelti);
//  • pakėlus daiktą, stiklainiai, į kuriuos galima dėti, sužaliuoja ir ant jų atsiranda rodyklė;
//  • netinkamas ėjimas – Ona paaiškina taisyklę žodžiais; surinktas stiklainis užsidaro dangteliu.
// Valdymas: bakstelėti stiklainį (daiktas pakyla) ir bakstelėti kitą, arba nutempti daiktą pirštu.
// Lygiai – src/config/brain/sort.json (patikrinti sprendėju).
import { h, wait } from '../../ui/dom.js';
import { pulse } from '../../ui/motion.js';
import { sfx } from '../../sfx.js';
import { burst } from '../../ui/fx.js';
import { SORT_LEVELS } from '../../config/brain-levels.js';
import { brainShell, starsByMoves, ITEMS, ITEM_BASE } from './base.js';

const DEMO_UNTIL = 2; // tiek pirmųjų lygių ranka parodo, kaip žaisti
const DRAG_PX = 10; // nuo kiek pikselių paspaudimas tampa tempimu
const src = (k) => `${ITEM_BASE}${ITEMS[k]}.webp`;

export function sortGame(root, { level, onHome, onFinish }) {
  const L = SORT_LEVELS[level - 1] || SORT_LEVELS[0];
  const cap = L.cap;
  let tubes = L.tubes.map((t) => t.slice());
  const kinds = [...new Set(L.tubes.flat())];
  const history = [];
  let moves = 0;
  let held = null; // stiklainio indeksas, iš kurio pakeltas daiktas
  let alive = true;
  let demoTimer = null;
  let wrongs = 0;
  let touched = false;

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

  // ---------- tikslas viršuje ----------
  const goalChips = kinds.map((k) => h('span', { class: 'sort-goal-chip', 'data-k': k }, [h('img', { src: src(k), alt: '', draggable: 'false' }), h('span', { class: 'sort-goal-check', 'aria-hidden': 'true', text: '✓' })]));
  const goal = h('div', { class: 'sort-goal', 'aria-label': 'Ką reikia surinkti' }, goalChips);

  // ---------- stiklainiai ----------
  const rows = tubes.length > 5 ? 2 : 1;
  const per = Math.ceil(tubes.length / rows);
  const row = h('div', { class: 'sort-row', style: `--cap:${cap};--rows:${rows};--per:${per}` });
  const tubeEls = tubes.map((_, i) => {
    const el = h('button', { type: 'button', class: 'sort-tube', 'aria-label': `Stiklainis ${i + 1}` });
    el.addEventListener('pointerdown', (e) => press(e, i));
    return el;
  });
  row.append(...tubeEls);
  const hand = h('div', { class: 'sort-hand', 'aria-hidden': 'true', html: HAND });
  const stage = h('div', { class: 'sort-stage' }, [row, hand]);
  shell.board.append(h('div', { class: 'sort-wrap' }, [goal, stage, shell.toolbar]));

  const top = (i) => tubes[i][tubes[i].length - 1];
  const isFull = (t) => t.length === cap && t.every((x) => x === t[0]);
  const canDrop = (from, to) => from !== to && tubes[from].length > 0 && tubes[to].length < cap && (!tubes[to].length || top(to) === top(from));
  const solved = () => tubes.every((t) => t.length === 0 || isFull(t));

  function render() {
    tubes.forEach((t, i) => {
      const el = tubeEls[i];
      const slots = [];
      for (let j = 0; j < cap; j++) {
        const k = t[j];
        if (k === undefined) slots.push(h('span', { class: 'sort-slot', 'aria-hidden': 'true' }));
        else {
          const cls = ['sort-item'];
          if (j === t.length - 1 && !isFull(t)) cls.push('top');
          if (held === i && j === t.length - 1) cls.push('lifted');
          slots.push(h('img', { class: cls.join(' '), src: src(k), alt: '', draggable: 'false' }));
        }
      }
      el.replaceChildren(...slots, h('span', { class: 'sort-arrow', 'aria-hidden': 'true' }));
      el.classList.toggle('selected', held === i);
      el.classList.toggle('full', isFull(t));
      el.classList.toggle('can', held !== null && canDrop(held, i));
      el.classList.toggle('cannot', held !== null && held !== i && !canDrop(held, i));
    });
    const doneKinds = new Set(tubes.filter(isFull).map((t) => t[0]));
    goalChips.forEach((c) => c.classList.toggle('done', doneKinds.has(+c.dataset.k)));
    shell.setMoves(moves);
    shell.setUndo(history.length > 0);
  }

  function move(from, to) {
    const wasFull = isFull(tubes[to]);
    history.push(tubes.map((t) => t.slice()));
    tubes[to].push(tubes[from].pop());
    moves++;
    held = null;
    sfx('flip');
    render();
    const items = tubeEls[to].querySelectorAll('.sort-item');
    const placed = items[items.length - 1];
    if (placed) pulse(placed, 'bounce');
    if (solved()) return shell.win(starsByMoves(moves, L.par), row);
    if (!wasFull && isFull(tubes[to])) {
      // surinktas vienas stiklainis – pagiriam ir parodom tiksle
      sfx('correct');
      burst(tubeEls[to], { count: 8 });
      const chip = goalChips.find((c) => +c.dataset.k === tubes[to][0]);
      if (chip) pulse(chip, 'bounce');
      shell.char.show('Puiku! Vienas stiklainis surinktas!');
    } else if (level <= DEMO_UNTIL && moves === 1) {
      shell.char.show('Taip! Toliau – tas pats.');
    }
  }

  /** Netinkamas ėjimas – paaiškinam, kodėl. */
  function refuse(from, to) {
    sfx('wrong');
    pulse(tubeEls[to], 'shake');
    wrongs++;
    if (tubes[to].length >= cap) shell.char.show('Šis stiklainis jau pilnas!');
    else shell.char.show('Dėti galima tik ant tokio pat daikto arba į tuščią stiklainį.');
    // po kelių klaidų – parodom, kur galima dėti (sužaliuoja ir tada, kai daiktas jau padėtas atgal)
    if (wrongs >= 2 && held === null) {
      held = from;
      render();
    }
  }

  // ---------- bakstelėjimas ir tempimas ----------
  function press(e, i) {
    if (shell.done) return;
    stopDemo();
    if (!touched && level <= DEMO_UNTIL) touched = true;
    e.preventDefault();
    const sx = e.clientX;
    const sy = e.clientY;
    let ghost = null;

    // kitame stiklainyje jau pakeltas daiktas – šis paspaudimas reiškia „dėk čia“
    if (held !== null && held !== i) {
      const from = held;
      if (canDrop(from, i)) move(from, i);
      else refuse(from, i);
      return;
    }
    if (held === i) {
      held = null;
      render();
      return;
    }
    if (!tubes[i].length) {
      shell.char.show('Pirmiau bakstelėk stiklainį su daiktais.');
      return;
    }
    if (isFull(tubes[i])) {
      shell.char.show('Šis stiklainis jau surinktas!');
      return;
    }
    held = i;
    sfx('tap');
    render();
    if (level <= DEMO_UNTIL && moves === 0) shell.char.show('Dabar bakstelėk žalią stiklainį!');

    const onMove = (ev) => {
      if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) < DRAG_PX) return;
      if (!ghost) {
        const srcEl = tubeEls[i].querySelector('.sort-item.lifted');
        if (!srcEl) return;
        const r = srcEl.getBoundingClientRect();
        ghost = h('img', { class: 'sort-ghost', src: srcEl.src, alt: '', style: `width:${r.width}px;height:${r.height}px` });
        document.body.append(ghost);
        srcEl.style.visibility = 'hidden';
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
        held = null;
        render();
        if (to !== -1 && to !== i) refuse(i, to);
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  function tubeAt(x, y) {
    return tubeEls.findIndex((t) => {
      const r = t.getBoundingClientRect();
      return x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 40 && y <= r.bottom + 8;
    });
  }

  // ---------- parodomasis ėjimas (pirmieji lygiai) ----------
  function firstMove() {
    // pirmiausia – ant tokio pat daikto, kitaip – į tuščią stiklainį
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
    if (!m || !alive || shell.done || touched) return;
    const s = stage.getBoundingClientRect();
    const at = (i) => {
      const r = tubeEls[i].getBoundingClientRect();
      return `translate(${r.left + r.width / 2 - s.left}px, ${r.top + r.height * 0.45 - s.top}px)`;
    };
    hand.style.transition = 'none';
    hand.style.transform = at(m[0]);
    hand.classList.add('show');
    await wait(600);
    if (!hand.classList.contains('show')) return;
    hand.classList.add('press');
    tubeEls[m[0]].classList.add('demo-from');
    await wait(350);
    hand.classList.remove('press');
    hand.style.transition = '';
    hand.style.transform = at(m[1]);
    await wait(900);
    if (!hand.classList.contains('show')) return;
    hand.classList.add('press');
    tubeEls[m[1]].classList.add('demo-to');
    await wait(350);
    hand.classList.remove('press');
    await wait(500);
    hand.classList.remove('show');
    tubeEls.forEach((t) => t.classList.remove('demo-from', 'demo-to'));
    if (alive && !touched) demoTimer = setTimeout(demo, 3500);
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
