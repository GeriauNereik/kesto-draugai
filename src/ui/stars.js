import { h } from './dom.js';
import { ICONS } from './icons.js';
import { getStars } from '../storage.js';

/** n iš max žvaigždučių. size: 'sm' | 'lg'. */
export function stars(n, { max = 3, size = 'sm' } = {}) {
  const wrap = h('div', { class: `stars stars-${size}`, role: 'img', 'aria-label': `${n} iš ${max} žvaigždučių` });
  for (let i = 0; i < max; i++) {
    const s = h('span', { class: `star ${i < n ? 'on' : 'off'}`, html: ICONS.star });
    wrap.append(s);
  }
  return wrap;
}

/**
 * Kortelės žvaigždutės: 2 lygių žaidime – kiekvieno pereito lygio žvaigždutės,
 * daugiau lygių (ar skiltyje) – kiek lygių jau pereita, pvz. ★ 3/10. Nieko nepereita – nieko nerodo.
 */
export function levelsSummary(game) {
  const games = game.hub || [game];
  const all = games.flatMap((g) => (g.levels || []).map((_, i) => getStars(g.id, i + 1)));
  if (!game.hub && all.length <= 2) {
    return all
      .map((n, i) => (n > 0 ? h('div', { class: 'card-stars-row' }, [h('span', { class: 'lvl-dot', 'aria-hidden': 'true', text: i + 1 }), stars(n)]) : null))
      .filter(Boolean);
  }
  const done = all.filter((n) => n > 0).length;
  return done ? [h('span', { class: 'levels-done', html: `${ICONS.star}<b>${done}/${all.length}</b>`, 'aria-label': `Pereita lygių: ${done} iš ${all.length}` })] : [];
}
