// Ramus miško fonas: švelnios kalvos, eglutės ir keli lėtai plaukiantys lapeliai.
import { h } from './dom.js';

const HILLS = `<svg class="decor-hills" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true">
  <path d="M0 70 C60 40 120 55 180 62 S300 30 400 58 V120 H0Z" fill="#d4f1cf"/>
  <path d="M0 92 C80 70 150 88 220 84 S340 66 400 82 V120 H0Z" fill="#bde8b6"/>
</svg>`;

const tree = (x, s, c) =>
  `<g transform="translate(${x} ${100 - 40 * s}) scale(${s})" fill="${c}"><path d="M20 0 L36 26 H28 L40 44 H0 L12 26 H4Z"/><rect x="17" y="44" width="6" height="8" fill="#b98a62"/></g>`;
const TREES = `<svg class="decor-trees" viewBox="0 0 400 110" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
  ${tree(18, 1, '#8fd48a')}${tree(58, 0.7, '#a9e0a3')}${tree(318, 0.85, '#8fd48a')}${tree(356, 1.1, '#6fc46b')}
</svg>`;

const LEAF = `<svg viewBox="0 0 24 24"><path d="M12 2C6 7 5 15 12 22c7-7 6-15 0-20z" fill="currentColor"/></svg>`;

export function decor() {
  const leaves = ['#8fd48a', '#ffd45c', '#ff9f8f', '#8fd48a'].map((c, i) =>
    h('span', { class: `drift drift-${i + 1}`, style: `color:${c}`, html: LEAF })
  );
  return h('div', { class: 'decor', 'aria-hidden': 'true', html: HILLS + TREES }, leaves);
}
