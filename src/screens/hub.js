// Skiltis (pvz. „Matematika“): veikėjas ir kelių žaidimų kortelės.
import { h, onTap, pulse } from '../ui/dom.js';
import { iconButton } from '../ui/button.js';
import { character } from '../ui/speech-bubble.js';
import { ICONS } from '../ui/icons.js';
import { sfx } from '../sfx.js';
import { stagger } from '../ui/fx.js';
import { levelsSummary } from '../ui/stars.js';

export function hubScreen(root, { hub, onPick, onHome }) {
  const host = character(hub.char, { emotion: 'happy', size: 'md', onTapChar: () => host.speak(`phrases/${hub.greet}`) });
  let picking = false;
  const cards = hub.hub.map((g) =>
    onTap(
      h('button', { type: 'button', class: 'game-card hub-card', 'aria-label': g.title }, [
        h('div', { class: 'card-img hub-icon', html: ICONS[g.icon] }),
        h('span', { class: 'card-title', text: g.title }),
        h('div', { class: 'card-stars' }, levelsSummary(g)),
      ]),
      (e) => {
        if (picking) return;
        picking = true;
        sfx('whoosh');
        pulse(e.currentTarget, 'squish');
        const card = e.currentTarget;
        // Jei per tą laiką vaikas jau išėjo kitur (pvz. paspaudė žaidėjo ženklelį) – nebeperšokam.
        setTimeout(() => card.isConnected && onPick(g), 300);
      }
    )
  );

  root.append(
    h('section', { class: 'screen menu hub' }, [
      h('header', { class: 'topbar' }, [iconButton({ icon: 'home', ariaLabel: 'Į meniu', onClick: onHome })]),
      h('div', { class: 'menu-body' }, [h('div', { class: 'menu-host' }, host.el), stagger(h('div', { class: 'menu-cards' }, cards), 80, 100, 'rise')]),
    ])
  );
  host.speak(`phrases/${hub.greet}`);
}
