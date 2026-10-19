import { h, onTap, pulse } from '../ui/dom.js';
import { character } from '../ui/speech-bubble.js';
import { levelsSummary } from '../ui/stars.js';
import { ICONS } from '../ui/icons.js';
import { charPortrait, CHARACTERS } from '../config/characters.js';
import { GAMES } from '../config/games.js';
import { currentProfile, jarInfo, markJarSeen } from '../storage.js';
import { holdButton } from '../ui/hold-button.js';
import { sfx } from '../sfx.js';
import { stagger, countUp, burst } from '../ui/fx.js';
import { createCharacter } from '../character/character.js';

let greeted = false;
const GREET_KEY = 'kd.greetDay'; // kurią dieną Ona jau paklausė „Ką žaisime šiandien?“

const todayKey = () => new Date().toDateString();
/** true – šiandien dar neklausė (ir pažymim, kad jau paklausė). */
function firstGreetToday() {
  try {
    if (localStorage.getItem(GREET_KEY) === todayKey()) return false;
    localStorage.setItem(GREET_KEY, todayKey());
  } catch {
    /* be atminties – klausiam kaip anksčiau, vieną kartą per paleidimą */
  }
  return true;
}

export function menuScreen(root, { onPick, onParents, onSwitch, firstTime = false }) {
  const profile = currentProfile();
  const host = character('ona', { emotion: 'happy', size: 'md', onTapChar: () => host.speak('phrases/ka_zaisime') });

  // Profilio ženklelis: avataras, vardas ir visos surinktos žvaigždutės ("stiklainis").
  const { total, seen } = jarInfo();
  const jarNum = h('b', { text: seen });
  const jar = h('span', { class: 'jar', html: ICONS.star }, jarNum);
  const chip = onTap(
    h('button', { type: 'button', class: 'profile-chip', 'aria-label': `${profile.name}, ${total} žvaigždučių. Keisti žaidėją` }, [
      h('img', { src: charPortrait(profile.avatar), alt: '', draggable: 'false' }),
      h('span', { class: 'chip-name', text: profile.name }),
      jar,
    ]),
    () => (sfx('tap'), onSwitch())
  );

  const rigs = [];
  let picking = false; // vienas paspaudimas – vienas žaidimas
  const cards = GAMES.map((g, gi) =>
    onTap(
      h('button', { type: 'button', class: 'game-card', 'aria-label': g.cardIcon ? g.title : `${CHARACTERS[g.char].short}: ${g.title}` }, [
        (() => {
          // Kortelėje – veikėjas arba (jei nurodyta) piešta ikona, pvz. Antrokams – pirato kaukolė.
          if (g.cardIcon) return h('div', { class: 'card-img card-icon', html: ICONS[g.cardIcon] });
          const box = h('div', { class: 'card-img' });
          rigs[gi] = createCharacter(box, g.char, { state: 'idle' });
          return box;
        })(),
        h('span', { class: 'card-title', text: g.title }),
        // Žvaigždutės rodomos tik pereitiems lygiams – tuščios nieko nesako ir tik trukdo.
        h('div', { class: 'card-stars' }, levelsSummary(g)),
      ]),
      (e) => {
        // Žaidimo veikėjas trumpai pašoka iš džiaugsmo, tada atsidaro žaidimas
        if (picking) return;
        picking = true;
        sfx('whoosh');
        pulse(e.currentTarget, 'squish');
        if (rigs[gi]) rigs[gi].play('happy');
        else pulse(e.currentTarget.querySelector('.card-icon'), 'bounce');
        setTimeout(() => onPick(g), 550);
      }
    )
  );

  root.append(
    h('section', { class: 'screen menu' }, [
      h('header', { class: 'menu-top' }, [
        chip,
        holdButton({
          icon: 'gear',
          ariaLabel: 'Tėvams (palaikykite 2 sekundes)',
          hint: 'Tėvams: palaikykite 2 s',
          onHold: onParents,
        }),
      ]),
      h('div', { class: 'menu-body' }, [
        h('div', { class: 'menu-host' }, host.el),
        stagger(h('div', { class: 'menu-cards' }, cards), 90, 100, 'rise'),
      ]),
    ])
  );

  // Naujos žvaigždutės "subyra" į stiklainį.
  // Naujos žvaigždutės "subyra" į stiklainį (ne daugiau kaip 5 skambesiai), o Ona prabyla po to.
  let greetDelay = 0;
  if (total > seen) {
    countUp(jarNum, seen, total, {
      duration: 700,
      maxSteps: 5,
      onStep: (i) => {
        sfx('star', i);
        pulse(jar, 'bump');
      },
    });
    setTimeout(() => burst(jar, { count: 8, spread: 60 }), 300);
    markJarSeen();
    greetDelay = 1300;
  } else {
    jarNum.textContent = total;
  }

  // Ona balsu klausia tik pirmą kartą per dieną (ar ką tik susipažinus); kitais kartais – tik užrašas.
  if (firstTime || (!greeted && firstGreetToday())) {
    if (firstTime) firstGreetToday();
    greeted = true;
    host.speak('phrases/ka_zaisime', undefined, { delay: greetDelay });
  } else {
    greeted = true;
    host.show('Ką žaisime šiandien?');
  }
}

/** Pasikeitus žaidėjui – vėl galima paklausti (bet balsu vis tiek tik kartą per dieną). */
export function resetGreeting() {
  greeted = false;
}
