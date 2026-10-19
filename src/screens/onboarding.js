// Pažintis: Ona paklausia vardo, tėvai patikslina lytį, vaikas išsirenka miško draugą.
import { h, onTap, pulse, wait } from '../ui/dom.js';
import { button, iconButton } from '../ui/button.js';
import { character } from '../ui/speech-bubble.js';
import { charPortrait, CHARACTERS, FRIENDS } from '../config/characters.js';
import { guessGender, vocative, tidyName } from '../names.js';
import { createProfile } from '../storage.js';
import { sfx } from '../sfx.js';
import { burst, stagger } from '../ui/fx.js';
import { destroyWithin } from '../character/character.js';

// Avatarai – visi draugai, išskyrus vedlę Oną.
export const AVATARS = FRIENDS;

export function onboardingScreen(root, { onDone, onBack }) {
  const screen = h('section', { class: 'screen onboarding' });
  root.append(screen);
  let name = '';
  let gender = null;
  let genderTouched = false;

  showName();

  function header(back = onBack) {
    return h('header', { class: 'topbar' }, back ? [iconButton({ icon: 'back', ariaLabel: 'Atgal', onClick: back })] : []);
  }

  // ---------- 1. Vardas ir lytis ----------
  function showName() {
    const host = character('ona', { emotion: 'happy', size: 'md', onTapChar: () => host.speak('phrases/susipazinkime') });

    const input = h('input', {
      class: 'name-input',
      type: 'text',
      inputmode: 'text',
      autocomplete: 'off',
      autocapitalize: 'words',
      autocorrect: 'off',
      spellcheck: 'false',
      enterkeyhint: 'next',
      maxlength: '20',
      placeholder: 'Vardas',
      'aria-label': 'Vaiko vardas',
      value: name,
    });

    const chip = (g, label) =>
      onTap(h('button', { type: 'button', class: 'chip', 'data-g': g, 'aria-pressed': 'false', text: label }), () => {
        gender = g;
        genderTouched = true;
        sfx('tap');
        sync();
      });
    const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Lytis' }, [chip('m', 'Berniukas'), chip('f', 'Mergaitė')]);
    const preview = h('p', { class: 'name-preview' });
    const next = button({ label: 'Toliau', cls: 'btn-xl', onClick: () => submit() });

    const sync = () => {
      name = tidyName(input.value);
      if (!genderTouched) gender = guessGender(name);
      chips.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.g === gender)));
      chips.classList.toggle('need', name.length >= 2 && !gender);
      preview.textContent =
        name.length >= 2 && gender ? `Ona sakys: „Labas, ${vocative(name, gender)}!“` : name.length >= 2 ? 'Pasirinkite: berniukas ar mergaitė?' : '';
      next.disabled = !(name.length >= 2 && gender);
    };
    const submit = () => {
      sync();
      if (next.disabled) {
        pulse(name.length < 2 ? input : chips, 'shake');
        return;
      }
      input.blur();
      showAvatar();
    };

    input.addEventListener('input', sync);
    input.addEventListener('keydown', (e) => e.key === 'Enter' && submit());

    destroyWithin(screen);
    screen.replaceChildren(
      header(),
      h('div', { class: 'onb-body' }, [
        h('div', { class: 'onb-char' }, host.el),
        h('div', { class: 'onb-form' }, [input, chips, preview, next]),
      ])
    );
    sync();
    host.speak('phrases/susipazinkime');
  }

  // ---------- 2. Miško draugas ----------
  function showAvatar() {
    const host = character('ona', { emotion: 'happy', size: 'md' });
    let picked = false;
    const grid = h(
      'div',
      { class: 'avatar-grid' },
      AVATARS.map((id) => {
        const card = h('button', { type: 'button', class: 'avatar-card', 'aria-label': CHARACTERS[id].name }, [
          h('img', { src: charPortrait(id), alt: '', draggable: 'false' }),
        ]);
        onTap(card, async () => {
          if (picked) return;
          picked = true;
          screen.querySelector('.topbar')?.replaceChildren(); // profilis jau kuriamas – atgal nebegalima
          grid.querySelectorAll('.avatar-card').forEach((c) => c.classList.toggle('faded', c !== card));
          card.classList.add('picked');
          sfx('correct');
          burst(card, { count: 12 });
          const profile = createProfile({ name, gender, avatar: id });
          // Pirma leidžiam Onai pasakyti „Malonu susipažinti“ iki galo, tik tada keičiam ekraną.
          await host.speak('phrases/malonu', undefined, { delay: 300 });
          await wait(500);
          if (screen.isConnected) onDone(profile);
        });
        return card;
      })
    );
    destroyWithin(screen); // ankstesnio žingsnio Onos animacija (kitaip liktų veikti fone)
    screen.replaceChildren(
      header(showName), // atgal – į vardo įvedimą (įvestas vardas išlieka)
      h('div', { class: 'onb-body avatar-step' }, [h('div', { class: 'onb-char' }, host.el), stagger(grid, 80, 100, 'rise')])
    );
    host.speak('phrases/draugas');
  }
}
