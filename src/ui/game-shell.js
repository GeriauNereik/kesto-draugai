import { h } from './dom.js';
import { iconButton } from './button.js';
import { progress } from './progress.js';
import { character } from './speech-bubble.js';

/**
 * Bendras žaidimo maketas: viršuje "Atgal", progresas, "Pakartoti garsą";
 * veikėjas su burbulu (vertikaliai – viršuje, horizontaliai – šone); žaidimo laukas.
 */
export function gameShell(root, { charId, total, onHome, onRepeat }) {
  const prog = progress(total);
  const char = character(charId, { emotion: 'think', size: 'md', onTapChar: onRepeat });
  const board = h('div', { class: 'board' });
  const top = h('header', { class: 'topbar' }, [
    iconButton({ icon: 'home', ariaLabel: 'Atgal į meniu', onClick: onHome }),
    prog.el,
    iconButton({ icon: 'speaker', ariaLabel: 'Pakartoti garsą', onClick: onRepeat }),
  ]);
  const screen = h('section', { class: 'screen game' }, [
    top,
    h('div', { class: 'game-body' }, [h('aside', { class: 'game-char' }, char.el), board]),
  ]);
  root.append(screen);
  return { screen, board, char, setProgress: prog.set };
}
