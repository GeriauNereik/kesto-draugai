import { h } from '../ui/dom.js';
import { button, iconButton } from '../ui/button.js';
import { character } from '../ui/speech-bubble.js';
import { stars } from '../ui/stars.js';
import { getStars } from '../storage.js';
import { stagger } from '../ui/fx.js';
import { ICONS } from '../ui/icons.js';

/** Ar lygis atrakintas: progresyviuose žaidimuose reikia pereiti ankstesnį lygį. */
export function isUnlocked(game, level) {
  return !game.progressive || level === 1 || getStars(game.id, level - 1) > 0;
}

export function levelScreen(root, { game, onLevel, onHome }) {
  const char = character(game.char, { emotion: 'happy', size: 'lg', onTapChar: () => char.speak('phrases/pasiruoses') });
  const levels = game.levels || [];
  const many = levels.length > 2;

  const opt = (lvl, i) => {
    const level = i + 1;
    const open = isUnlocked(game, level);
    const btn = button({
      label: lvl.label,
      cls: `btn-xl level-btn level-${many ? 'n' : level}${open ? '' : ' locked'}`,
      ariaLabel: open ? `${game.title}: ${lvl.label}` : `${lvl.label} – užrakinta`,
      onClick: open ? () => onLevel(level) : undefined,
    });
    if (!open) btn.disabled = true;
    btn.append(open ? preview(lvl) : h('span', { class: 'lvl-lock', html: ICONS.lock }));
    const best = getStars(game.id, level);
    return h('div', { class: 'level-opt' }, [btn, best > 0 ? stars(best) : null]);
  };

  root.append(
    h('section', { class: `screen level${many ? ' level-many' : ''}${game.compact ? ' level-compact' : ''}` }, [
      h('header', { class: 'topbar' }, [
        iconButton({ icon: 'home', ariaLabel: 'Atgal', onClick: onHome }),
        many ? h('h1', { class: 'level-title', text: game.title }) : null,
      ]),
      h('div', { class: 'level-body' }, [
        h('div', { class: 'level-char' }, char.el),
        stagger(h('div', { class: 'level-opts' }, levels.map(opt)), many ? 50 : 120, 150, 'rise'),
      ]),
    ])
  );
  char.speak('phrases/pasiruoses');
}

/** Mažas vaizdelis mygtuke: ką reiškia lygis (vaikai neskaito, tėvai iškart supranta). */
function preview(lvl) {
  const tiles = (typeof lvl.tiles === 'function' ? lvl.tiles() : lvl.tiles) || [];
  return h('span', { class: `lvl-preview ${lvl.wide ? 'wide' : ''}`, 'aria-hidden': 'true' }, [
    lvl.img ? h('img', { class: 'lvl-img', src: lvl.img, alt: '', decoding: 'async' }) : null,
    ...tiles.map((t) => h('span', { class: 'lvl-tile', text: t })),
  ]);
}
