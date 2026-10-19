// "Kas šiandien žais?" – profilio pasirinkimas, kai žaidžia keli vaikai.
import { h, onTap, wait } from '../ui/dom.js';
import { character } from '../ui/speech-bubble.js';
import { charPortrait } from '../config/characters.js';
import { ICONS } from '../ui/icons.js';
import { getProfiles, setCurrentProfile } from '../storage.js';
import { sfx } from '../sfx.js';
import { stagger } from '../ui/fx.js';

export function profilesScreen(root, { onPicked, onNew }) {
  const host = character('ona', { emotion: 'happy', size: 'md', onTapChar: () => host.speak('phrases/kas_zais') });

  let picked = false;
  const cards = getProfiles().map((p) =>
    onTap(
      h('button', { type: 'button', class: 'profile-card', 'aria-label': p.name }, [
        h('img', { src: charPortrait(p.avatar), alt: '', draggable: 'false' }),
        h('span', { class: 'profile-name', text: p.name }),
        h('span', { class: 'jar-mini', html: `${ICONS.star}<b>${p.jar || 0}</b>` }),
      ]),
      async (e) => {
        if (picked) return; // vienas pasirinkimas (greitai bakstelėjus du vaikus – tik pirmas)
        picked = true;
        const card = e.currentTarget;
        sfx('correct');
        card.classList.add('picked');
        setCurrentProfile(p.id);
        await wait(350);
        if (card.isConnected) onPicked();
      }
    )
  );
  const add = onTap(
    h('button', { type: 'button', class: 'profile-card profile-add', 'aria-label': 'Naujas žaidėjas' }, [
      h('span', { class: 'plus', text: '+' }),
      h('span', { class: 'profile-name', text: 'Naujas' }),
    ]),
    () => {
      if (picked) return;
      picked = true;
      sfx('tap');
      onNew();
    }
  );

  root.append(
    h('section', { class: 'screen profiles' }, [
      h('div', { class: 'menu-host' }, host.el),
      stagger(h('div', { class: 'profile-grid' }, [...cards, add]), 80, 0, 'rise'),
    ])
  );
  host.speak('phrases/kas_zais');
}
