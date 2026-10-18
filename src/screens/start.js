import { h } from '../ui/dom.js';
import { button } from '../ui/button.js';
import { createCharacter } from '../character/character.js';

const TITLE = 'Kęsto draugai';

export function startScreen(root, { onStart }) {
  const screen = (
    h('section', { class: 'screen start' }, [
      h('div', { class: 'start-hero' }),
      h('div', { class: 'start-text' }, [
        h(
          'h1',
          { class: 'title', role: 'img', 'aria-label': TITLE },
          // Karaoke: raidės po vieną nusidažo iš kairės į dešinę ir pašoka (CSS, be JS).
          [...TITLE].map((ch, i) => h('b', { class: `title-ch${ch === ' ' ? ' title-sp' : ''}`, style: `--i:${i}`, 'aria-hidden': 'true', text: ch === ' ' ? '\u00a0' : ch }))
        ),
        h('p', { class: 'subtitle', text: 'Žaidimai mažiesiems' }),
        button({ label: 'Pradėti', icon: 'play', cls: 'btn-xl', onClick: onStart }),
      ]),
    ])
  );
  root.append(screen);
  createCharacter(screen.querySelector('.start-hero'), 'ona', { state: 'idle' });
}
