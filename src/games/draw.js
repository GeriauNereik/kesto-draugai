// Vėja: „Piešimas“ – „Nupiešk katę!“. Vaikas piešia, kol pats nusprendžia, kad baigė, ir spaudžia
// „Nupiešiau!“ – tada gauna kitą užduotį, kol pereina visas kategorijos užduotis.
// Eilė kaskart atsitiktinė; nupieštos užduotys įsimenamos ir nesikartoja, kol nenupieštos visos.
import { h, onTap, wait } from '../ui/dom.js';
import { gameShell } from '../ui/game-shell.js';
import { createRound, SFX_GAP } from './common.js';
import { DRAW_CATEGORIES, ALL_DRAW_ITEMS, drawId } from '../config/draw-items.js';
import { randomPraise } from '../config/phrases.js';
import { getDrawn, setDrawn, addToJar } from '../storage.js';
import { createPainter } from '../ui/painter.js';
import { ICONS } from '../ui/icons.js';
import { sfx } from '../sfx.js';
import { burst } from '../ui/fx.js';
import { pulse } from '../ui/motion.js';
import { preload } from '../audio.js';

export const DRAW_ALL = { id: 'viskas', label: 'Viskas', items: ALL_DRAW_ITEMS };
export const DRAW_LEVELS = [...DRAW_CATEGORIES, DRAW_ALL];

const COLORS = [
  ['#2b2b2b', 'Juoda'], ['#8d8d8d', 'Pilka'], ['#ffffff', 'Balta'], ['#7b4a2a', 'Ruda'], ['#f5c6a0', 'Kūno'],
  ['#e53935', 'Raudona'], ['#f06292', 'Rožinė'], ['#fb8c00', 'Oranžinė'], ['#fdd835', 'Geltona'], ['#8bc34a', 'Šviesiai žalia'],
  ['#2e7d32', 'Žalia'], ['#4fc3f7', 'Žydra'], ['#1e5bd1', 'Mėlyna'], ['#8e44ad', 'Violetinė'],
];
const TOOLS = [
  ['pencil', 'Pieštukas'], ['marker', 'Flomasteris'], ['crayon', 'Kreidelė'], ['spray', 'Purškiklis'],
  ['rainbow', 'Vaivorykštė'], ['bucket', 'Užlieti'], ['eraser', 'Trintukas'],
];
const SIZES = [
  [4, 'Plonas'], [10, 'Vidutinis'], [20, 'Storas'],
];
const READY_AFTER = 3; // „Nupiešiau!“ atsiranda po tiek brūkšnių – kad nebūtų paspausta netyčia

/** Atsitiktinė tvarka – kiekvieną kartą vis kita. */
function shuffle(items) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function drawGame(root, { level, onHome, onFinish }) {
  const cat = DRAW_LEVELS[level - 1] || DRAW_LEVELS[0];
  // Dar nenupieštos užduotys – kaskart sumaišomos iš naujo; nupieštos nesikartoja, kol neperein visų.
  let drawn = getDrawn(cat.id).filter((t) => cat.items.includes(t));
  if (drawn.length >= cat.items.length) drawn = [];
  const order = shuffle(cat.items.filter((t) => !drawn.includes(t)));
  let idx = 0;
  let item = order[idx];

  const sayPrompt = () => {
    shell.char.speak(`draw/${drawId(item)}`, `Nupiešk ${item}!`);
    // Kitos užduoties garsas – iš anksto (artefakte jis gali būti kitame pakete)
    if (order[idx + 1]) preload([`draw/${drawId(order[idx + 1])}`]);
  };
  const shell = gameShell(root, { charId: 'veja', total: cat.items.length, onHome, onRepeat: sayPrompt });
  const round = createRound(shell);
  shell.setProgress(drawn.length);

  // ---------- drobė ----------
  const canvas = h('canvas', { class: 'draw-canvas', 'aria-label': 'Piešimo lapas' });
  // „Nupiešiau katę!“ – atsiranda vietoje užduoties burbulo (jie keičia vienas kitą), kai jau kas nors nupiešta.
  const doneLabel = h('span', { class: 'btn-label' });
  const doneBtn = h('button', { type: 'button', class: 'btn btn-primary draw-done' }, [h('span', { class: 'btn-icon', html: ICONS.check }), doneLabel]);
  shell.char.el.append(doneBtn);
  const setReady = (on) => {
    const was = shell.char.el.classList.contains('draw-ready');
    shell.char.el.classList.toggle('draw-ready', on);
    if (on && !was) pulse(doneBtn, 'bounce');
  };
  const showItem = () => (doneLabel.textContent = `Nupiešiau ${item}!`);
  showItem();
  const paper = h('div', { class: 'paper' }, [canvas]);

  // ---------- įrankiai ----------
  const toolBtns = {};
  const sizeBtns = {};
  const colorBtns = {};
  const select = (group, key) => Object.entries(group).forEach(([k, b]) => b.classList.toggle('on', String(k) === String(key)));
  const tb = (icon, label, fn, cls = '') => {
    const b = h('button', { type: 'button', class: `tool-btn ${cls}`, 'aria-label': label, title: label, html: ICONS[icon] });
    onTap(b, () => (sfx('tap'), fn(b)));
    return b;
  };

  const undoBtn = tb('undo', 'Atšaukti', () => painter.undo());
  undoBtn.disabled = true;
  const mirrorBtn = tb('mirror', 'Veidrodis', (b) => {
    const on = !painter.options.mirror;
    painter.set({ mirror: on });
    b.classList.toggle('on', on);
    paper.classList.toggle('mirror-on', on);
  });

  const toolsRow = h('div', { class: 'tool-row' }, [
    ...TOOLS.map(([id, label]) => (toolBtns[id] = tb(id, label, () => (painter.set({ tool: id }), select(toolBtns, id))))),
    h('span', { class: 'tool-sep', 'aria-hidden': 'true' }),
    undoBtn,
  ]);
  const sizesEl = SIZES.map(([px, label]) => {
    const b = h('button', { type: 'button', class: 'size-btn', 'aria-label': label, title: label }, h('span', { class: 'size-dot', style: `width:${Math.max(6, px)}px;height:${Math.max(6, px)}px` }));
    onTap(b, () => (sfx('tap'), painter.set({ size: px }), select(sizeBtns, px)));
    return (sizeBtns[px] = b);
  });
  const colorsEl = COLORS.map(([hex, label]) => {
    const b = h('button', { type: 'button', class: 'color-btn', 'aria-label': label, title: label, style: `--c:${hex}` });
    onTap(b, () => {
      sfx('tap');
      painter.set({ color: hex });
      select(colorBtns, hex);
      // Trintukas ar užliejimas lieka, kitaip spalvos pasirinkimas reiškia, kad norima piešti.
      if (painter.options.tool === 'eraser') {
        painter.set({ tool: 'marker' });
        select(toolBtns, 'marker');
      }
    });
    return (colorBtns[hex] = b);
  });
  // Bet kokia spalva iš viso spektro (sistemos spalvų parinkiklis).
  const picker = h('input', { type: 'color', value: '#00a0a0', 'aria-label': 'Pasirinkti bet kokią spalvą' });
  const customBtn = h('label', { class: 'color-btn color-custom', title: 'Kita spalva' }, picker);
  const pickCustom = () => {
    painter.set({ color: picker.value });
    customBtn.style.setProperty('--c', picker.value);
    customBtn.classList.add('has-color');
    select(colorBtns, 'custom');
    if (painter.options.tool === 'eraser') {
      painter.set({ tool: 'marker' });
      select(toolBtns, 'marker');
    }
  };
  picker.addEventListener('input', pickCustom);
  picker.addEventListener('change', pickCustom);
  colorBtns.custom = customBtn;
  const colorRow = h('div', { class: 'tool-row colors' }, [...sizesEl, mirrorBtn, h('span', { class: 'tool-sep', 'aria-hidden': 'true' }), ...colorsEl, customBtn]);

  shell.board.replaceChildren(h('div', { class: 'draw-wrap' }, [paper, h('div', { class: 'draw-tools' }, [toolsRow, colorRow])]));

  const painter = createPainter(canvas, {
    onChange({ strokes, canUndo }) {
      undoBtn.disabled = !canUndo;
      setReady(strokes >= READY_AFTER);
    },
  });
  painter.set({ tool: 'marker', color: '#e53935', size: 10 });
  select(toolBtns, 'marker');
  select(sizeBtns, 10);
  select(colorBtns, '#e53935');

  // ---------- Nupiešiau! ----------
  onTap(doneBtn, async () => {
    if (round.busy) return;
    round.busy = true;
    sfx('correct');
    burst(doneBtn, { count: 14 });
    shell.char.setEmotion('happy');
    shell.char.speak(`phrases/${randomPraise()}`, undefined, { delay: SFX_GAP });
    addToJar(1);
    drawn = [...drawn, item];
    setDrawn(cat.id, drawn);
    idx++;
    shell.setProgress(drawn.length);
    await wait(1500);
    if (!round.alive) return;
    if (idx >= order.length) {
      setDrawn(cat.id, []); // visos nupieštos – kitą kartą galima pradėti iš naujo
      return onFinish({ stars: 3 });
    }
    item = order[idx];
    painter.reset();
    setReady(false);
    showItem();
    round.busy = false;
    shell.char.setEmotion('think');
    sayPrompt();
  });

  shell.char.setEmotion('think');
  sayPrompt();
  return () => {
    painter.destroy();
    round.destroy();
  };
}
