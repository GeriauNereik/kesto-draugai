// Gyvybės – širdelės (viršutiniame dešiniajame kampe). Prarasta širdelė papilkėja.
import { h } from './dom.js';
import { ICONS } from './icons.js';
import { pulse } from './motion.js';

export function hearts(total) {
  const el = h('div', { class: 'hearts', role: 'img' });
  for (let i = 0; i < total; i++) el.append(h('span', { class: 'heart', html: ICONS.heart }));
  const set = (lives, { shake = false } = {}) => {
    el.setAttribute('aria-label', `Gyvybės: ${lives}`);
    [...el.children].forEach((s, i) => s.classList.toggle('lost', i >= lives));
    if (shake) pulse(el, 'shake');
  };
  set(total);
  return { el, set };
}

/** Žaidimo viršuje vietoj garsiakalbio įdeda širdeles (paaiškinimą pakartoja paliestas veikėjas). */
export function addHearts(shell, total) {
  const topbar = shell.screen.querySelector('.topbar');
  topbar.querySelector('[aria-label="Pakartoti garsą"]')?.remove();
  const hs = hearts(total);
  topbar.append(hs.el);
  return hs;
}
