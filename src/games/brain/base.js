// Bendra galvosūkių bazė: Ona veda, viršuje – lygio numeris ir ėjimai, apačioje – „Atšaukti“ ir „Iš naujo“.
// Kiekvienas galvosūkis – vienas uždavinys; išsprendus – žvaigždutės pagal ėjimus ar klaidas.
import { h, onTap, wait } from '../../ui/dom.js';
import { gameShell } from '../../ui/game-shell.js';
import { ICONS } from '../../ui/icons.js';
import { sfx } from '../../sfx.js';
import { burst } from '../../ui/fx.js';
import { randomPraise } from '../../config/phrases.js';
import { SFX_GAP, afterPraise } from '../common.js';
import { stop } from '../../audio.js';
import { heardBefore } from '../../heard.js';
import { PHRASES } from '../../config/phrases.js';

/**
 * shell: { screen, board, char, setMoves(n), setTools({undo, restart}), win(stars, el) }
 * introKey – frazė, kuri ištariama pradžioje ir paspaudus garsiakalbį.
 */
export function brainShell(root, { level, introKey, introText, onHome, onFinish, tools = {} }) {
  const say = () => shell.char.speak(`phrases/${introKey}`, introText);
  // pradžioje balsu – tik pirmą kartą (vėliau tik tekstas burbule)
  const sayFirst = () => (heardBefore(`phrases/${introKey}`) ? shell.char.show(introText || PHRASES[introKey] || '') : say());
  const shell = gameShell(root, { charId: 'ona', total: 1, onHome, onRepeat: say });
  shell.screen.classList.add('brain');

  // Viršuje vietoj progreso juostos – lygis ir ėjimai
  const moves = h('span', { class: 'brain-moves', 'aria-live': 'polite' });
  const info = h('div', { class: 'brain-info' }, [h('span', { class: 'brain-level', text: `${level} lygis` }), moves]);
  shell.screen.querySelector('.progress')?.replaceWith(info);

  const btn = (icon, label, fn) => {
    // ikona ir užrašas po ja – kad būtų aišku, ką mygtukas daro
    const b = h('button', { type: 'button', class: 'tool-btn brain-tool', 'aria-label': label, title: label }, [h('span', { class: 'brain-tool-icon', html: ICONS[icon] }), h('span', { class: 'brain-tool-label', text: label })]);
    onTap(b, () => (sfx('tap'), fn()));
    return b;
  };
  const undoBtn = tools.undo ? btn('undo', 'Atšaukti', tools.undo) : null;
  const restartBtn = tools.restart ? btn('restart', 'Iš naujo', tools.restart) : null;
  const toolbar = h('div', { class: 'brain-toolbar' }, [undoBtn, restartBtn]);

  let done = false;
  let alive = true;
  const api = {
    ...shell,
    toolbar,
    get done() {
      return done;
    },
    setMoves(n, label = 'ėjimai') {
      moves.textContent = n == null ? '' : `${label}: ${n}`;
    },
    setUndo(enabled) {
      if (undoBtn) undoBtn.disabled = !enabled;
    },
    /** Išspręsta: džiaugsmas, pagyrimas ir rezultato ekranas. */
    async win(stars, el) {
      if (done) return;
      done = true;
      sfx('correct');
      if (el) burst(el, { count: 16 });
      shell.char.setEmotion('happy');
      await afterPraise(shell.char.speak(`phrases/${randomPraise()}`, undefined, { delay: SFX_GAP }));
      await wait(300);
      if (alive) onFinish({ stars });
    },
    destroy() {
      alive = false;
      stop();
    },
  };
  shell.char.setEmotion('think');
  sayFirst();
  return api;
}

/** Žvaigždutės pagal ėjimus, palyginus su norma (geriausiu žinomu sprendimu). */
export function starsByMoves(moves, par) {
  if (moves <= Math.ceil(par * 1.25) + 1) return 3;
  if (moves <= Math.ceil(par * 2) + 3) return 2;
  return 1;
}

/** Žvaigždutės pagal klaidas. */
export function starsByMistakes(m) {
  return m === 0 ? 3 : m <= 2 ? 2 : 1;
}

/** Fiksuotas atsitiktinių skaičių generatorius (tas pats lygis – ta pati užduotis). */
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const ITEM_BASE = `${import.meta.env.BASE_URL}assets/characters/items/`;
export const ITEMS = ['obuolys', 'gile', 'braske', 'kankorezis', 'musmire', 'lapas', 'ramune', 'sraige', 'lizdas'];
