import { h, onTap } from './dom.js';
import { ICONS } from './icons.js';
import { sfx } from '../sfx.js';

/** Didelis mygtukas. variant: 'primary' | 'secondary' | 'ghost'. */
export function button({ label, icon, variant = 'primary', onClick, ariaLabel, cls = '' }) {
  const el = h(
    'button',
    { type: 'button', class: `btn btn-${variant} ${cls}`, 'aria-label': ariaLabel || label },
    [icon ? h('span', { class: 'btn-icon', html: ICONS[icon] }) : null, label ? h('span', { class: 'btn-label', text: label }) : null]
  );
  if (onClick) onTap(el, (e) => (sfx('tap'), onClick(e)));
  return el;
}

/** Apvalus ikonos mygtukas (namelis, garsiakalbis). */
export function iconButton({ icon, ariaLabel, onClick, cls = '' }) {
  const el = h('button', { type: 'button', class: `icon-btn ${cls}`, 'aria-label': ariaLabel, html: ICONS[icon] });
  if (onClick) onTap(el, (e) => (sfx('tap'), onClick(e)));
  return el;
}
